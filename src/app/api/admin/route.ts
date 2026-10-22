import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser, getDeveloperUser, hasPlatformPermission } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { isStripeConnectConfigured } from "@/lib/stripe";
import type { SupportTicketDocument } from "@/lib/support";
import { platformPermissions } from "@/lib/platform-permissions";

export const runtime = "nodejs";

const AdminActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("user"),
    discordId: z.string().regex(/^\d{17,20}$/),
    creator: z.boolean(),
    suspended: z.boolean(),
    developer: z.boolean().optional(),
    developerPermissions: z.array(z.enum(platformPermissions)).max(platformPermissions.length).optional(),
  }),
  z.object({
    action: z.literal("studio"),
    id: z.string().regex(/^[a-f\d]{24}$/i),
    name: z.string().trim().min(2).max(80).optional(),
    suspended: z.boolean().optional(),
  }).refine((value) => value.name !== undefined || value.suspended !== undefined),
  z.object({
    action: z.literal("campaign"),
    id: z.string().regex(/^[a-f\d]{24}$/i),
    status: z.enum(["draft", "active", "paused", "completed"]),
  }),
  z.object({
    action: z.literal("submission"),
    id: z.string().regex(/^[a-f\d]{24}$/i),
    decision: z.enum(["approved", "rejected"]),
    note: z.string().trim().max(1000).optional(),
  }),
  z.object({
    action: z.literal("support"),
    id: z.string().uuid(),
    status: z.enum(["open", "in_progress", "resolved"]).optional(),
    reply: z.string().trim().min(1).max(2000).optional(),
  }).refine((value) => value.status !== undefined || value.reply !== undefined),
]);

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  try {
    const db = await getDatabase();
    const [users, studios, campaigns, submissions, audit, support, counts] = await Promise.all([
      db.collection("users").find({}, { projection: { _id: 0, discordId: 1, username: 1, displayName: 1, roles: 1, developerPermissions: 1, disabled: 1, createdAt: 1, lastLoginAt: 1 } }).sort({ createdAt: -1 }).limit(50).toArray(),
      db.collection("studios").find({}, { projection: { name: 1, ownerDiscordId: 1, memberDiscordIds: 1, status: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(50).toArray(),
      db.collection("campaigns").find({}, { projection: { title: 1, gameName: 1, studioId: 1, status: 1, visibility: 1, totalBudget: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(50).toArray(),
      db.collection("submissions").find({}, { projection: { campaignTitle: 1, campaignSlug: 1, creatorDiscordId: 1, studioId: 1, platform: 1, videoUrl: 1, title: 1, status: 1, reviewNote: 1, submittedAt: 1 } }).sort({ submittedAt: -1 }).limit(50).toArray(),
      db.collection("audit_logs").find({}, { projection: { actorDiscordId: 1, action: 1, entityType: 1, entityId: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(50).toArray(),
      db.collection<SupportTicketDocument>("support_tickets").find({}, { projection: { _id: 0, ticketId: 1, targetDiscordId: 1, category: 1, status: 1, messages: 1, createdAt: 1, updatedAt: 1 } }).sort({ updatedAt: -1 }).limit(50).toArray(),
      Promise.all([
        db.collection("users").countDocuments(),
        db.collection("studios").countDocuments(),
        db.collection("campaigns").countDocuments(),
        db.collection("campaigns").countDocuments({ status: "active", visibility: "public" }),
        db.collection("submissions").countDocuments(),
        db.collection("submissions").countDocuments({ status: "pending_review" }),
        db.collection("users").countDocuments({ roles: "developer" }),
        db.collection("support_tickets").countDocuments({ status: { $ne: "resolved" } }),
      ]),
    ]);
    const configuration = {
      mongodb: true,
      discord: Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET && process.env.DISCORD_REDIRECT_URI),
      session: Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32),
      adminAllowlist: Boolean(process.env.ADMIN_DISCORD_ID),
      payoutProvider: isStripeConnectConfigured(),
      stripeConnect: isStripeConnectConfigured(),
      socialVerification: false,
    };
    return NextResponse.json({
      metrics: {
        users: counts[0],
        studios: counts[1],
        campaigns: counts[2],
        activeCampaigns: counts[3],
        submissions: counts[4],
        pendingSubmissions: counts[5],
        developers: counts[6],
        openSupportTickets: counts[7],
      },
      configuration,
      users: users.map((item) => ({ ...item, discordId: String(item.discordId) })),
      studios: studios.map(({ _id, ...item }) => ({ ...item, id: _id.toString() })),
      campaigns: campaigns.map(({ _id, ...item }) => ({ ...item, id: _id.toString() })),
      submissions: submissions.map(({ _id, ...item }) => ({ ...item, id: _id.toString() })),
      audit: audit.map(({ _id, ...item }) => ({ ...item, id: _id.toString() })),
      support: support.map((item) => ({ ...item, id: String(item.ticketId) })),
      currentAdmin: admin.discordId,
    });
  } catch (error) {
    console.error("Admin overview could not load", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Admin data is temporarily unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const actor = await getDeveloperUser();
  if (!actor) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = AdminActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Admin action is invalid." }, { status: 400 });

  const db = await getDatabase();
  const now = new Date();
  let entityId = "";
  let entityType = "";
  let action = "";
  let matched = false;

  if (parsed.data.action === "user") {
    if (parsed.data.discordId === process.env.ADMIN_DISCORD_ID?.trim()) {
      return NextResponse.json({ error: "The configured administrator account cannot be changed here." }, { status: 400 });
    }
    const administrator = await getAdminUser();
    const changingDeveloperAccess = parsed.data.developer !== undefined || parsed.data.developerPermissions !== undefined;
    if (changingDeveloperAccess && !administrator) {
      return NextResponse.json({ error: "Only the platform administrator can manage user roles and access." }, { status: 403 });
    }
    if (!administrator && !hasPlatformPermission(actor, "users:manage")) {
      return NextResponse.json({ error: "User management permission required." }, { status: 403 });
    }
    const update = await db.collection("users").updateOne(
      { discordId: parsed.data.discordId },
      [{
        $set: {
          disabled: parsed.data.suspended,
          updatedAt: now,
          roles: {
            $setDifference: [
              {
                $setUnion: [
                  { $ifNull: ["$roles", []] },
                  parsed.data.creator ? ["creator"] : [],
                  parsed.data.developer === true || parsed.data.developerPermissions?.length ? ["developer"] : [],
                ],
              },
              [
                ...(!parsed.data.creator ? ["creator"] : []),
                ...(parsed.data.developer === false || parsed.data.developerPermissions?.length === 0 ? ["developer"] : []),
              ],
            ],
          },
          ...(parsed.data.developer === false
            ? { developerPermissions: [] }
            : parsed.data.developerPermissions !== undefined
              ? { developerPermissions: parsed.data.developerPermissions }
              : {}),
        },
      }],
    );
    matched = update.matchedCount > 0;
    entityId = parsed.data.discordId;
    entityType = "user";
    action = `user.updated`;
  } else if (parsed.data.action === "studio") {
    if (!hasPlatformPermission(actor, "studios:manage")) return NextResponse.json({ error: "Studio management permission required." }, { status: 403 });
    const set: Record<string, unknown> = { updatedAt: now };
    if (parsed.data.name !== undefined) set.name = parsed.data.name;
    if (parsed.data.suspended !== undefined) set.status = parsed.data.suspended ? "suspended" : "active";
    const update = await db.collection("studios").updateOne({ _id: new ObjectId(parsed.data.id) }, { $set: set });
    matched = update.matchedCount > 0;
    entityId = parsed.data.id;
    entityType = "studio";
    action = "studio.updated";
  } else if (parsed.data.action === "campaign") {
    if (!hasPlatformPermission(actor, "campaigns:manage")) return NextResponse.json({ error: "Campaign management permission required." }, { status: 403 });
    if (parsed.data.status === "active") {
      return NextResponse.json({ error: "Campaign publishing is disabled until billing and budget funding are configured." }, { status: 409 });
    }
    const update = await db.collection("campaigns").updateOne(
      { _id: new ObjectId(parsed.data.id) },
      { $set: { status: parsed.data.status, visibility: "private", updatedAt: now } },
    );
    matched = update.matchedCount > 0;
    entityId = parsed.data.id;
    entityType = "campaign";
    action = `campaign.${parsed.data.status}`;
  } else if (parsed.data.action === "submission") {
    if (!hasPlatformPermission(actor, "submissions:review")) return NextResponse.json({ error: "Submission review permission required." }, { status: 403 });
    const update = await db.collection("submissions").updateOne(
      { _id: new ObjectId(parsed.data.id), status: "pending_review" },
      { $set: {
        status: parsed.data.decision,
        reviewNote: parsed.data.note ?? "",
        reviewedByDiscordId: actor.discordId,
        reviewedAt: now,
        updatedAt: now,
      } },
    );
    matched = update.matchedCount > 0;
    if (matched) {
      const submission = await db.collection("submissions").findOne(
        { _id: new ObjectId(parsed.data.id) },
        { projection: { creatorDiscordId: 1, campaignTitle: 1 } },
      );
      if (submission) {
        const creator = await db.collection("users").findOne(
          { discordId: submission.creatorDiscordId },
          { projection: { preferences: 1 } },
        );
        if (creator?.preferences?.submissionUpdates !== false) {
          await db.collection("notifications").updateOne(
            { eventKey: `submission:${parsed.data.id}:${parsed.data.decision}` },
            { $setOnInsert: {
              eventKey: `submission:${parsed.data.id}:${parsed.data.decision}`,
              targetDiscordId: submission.creatorDiscordId,
              type: `submission_${parsed.data.decision}`,
              title: parsed.data.decision === "approved" ? "Clip approved" : "Clip not approved",
              body: `${submission.campaignTitle}: your clip was ${parsed.data.decision === "approved" ? "approved" : "not approved"}.`,
              href: "/dashboard/creator/submissions",
              readAt: null,
              createdAt: now,
            } },
            { upsert: true },
          );
        }
      }
    }
    entityId = parsed.data.id;
    entityType = "submission";
    action = `submission.${parsed.data.decision}`;
  } else {
    if (!hasPlatformPermission(actor, "support:manage")) return NextResponse.json({ error: "Support management permission required." }, { status: 403 });
    const ticketUpdate: Record<string, unknown> = { updatedAt: now };
    if (parsed.data.status !== undefined) ticketUpdate.status = parsed.data.status;
    const update = await db.collection<SupportTicketDocument>("support_tickets").updateOne(
      { ticketId: parsed.data.id },
      {
        $set: ticketUpdate,
        ...(parsed.data.reply ? { $push: { messages: {
          id: crypto.randomUUID(),
          senderDiscordId: actor.discordId,
          body: parsed.data.reply,
          createdAt: now,
        } } } : {}),
      },
    );
    matched = update.matchedCount > 0;
    entityId = parsed.data.id;
    entityType = "support";
    action = parsed.data.reply ? "support.replied" : `support.${parsed.data.status}`;
    if (matched && parsed.data.reply) {
      const ticket = await db.collection<SupportTicketDocument>("support_tickets").findOne({ ticketId: parsed.data.id }, { projection: { targetDiscordId: 1 } });
      if (ticket) {
        await db.collection("notifications").updateOne(
          { eventKey: `support-reply:${parsed.data.id}:${now.getTime()}` },
          { $setOnInsert: {
            eventKey: `support-reply:${parsed.data.id}:${now.getTime()}`,
            targetDiscordId: ticket.targetDiscordId,
            type: "support_reply",
            title: "Alypne support replied",
            body: "There is a new reply in your support conversation.",
            href: "/dashboard/creator/messages",
            readAt: null,
            createdAt: now,
          } },
          { upsert: true },
        );
      }
    }
  }

  if (!matched) return NextResponse.json({ error: "The selected record was not found or is no longer actionable." }, { status: 404 });
  await db.collection("audit_logs").insertOne({
    actorDiscordId: actor.discordId,
    action,
    entityType,
    entityId,
    createdAt: now,
  });
  return NextResponse.json({ updated: true });
}
