import { NextResponse } from "next/server";
import { getDeveloperUser, hasPlatformPermission } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { isStripeConnectConfigured } from "@/lib/stripe";
import { platformPermissions } from "@/lib/platform-permissions";

export const runtime = "nodejs";

type DeveloperUserRecord = { discordId: string; username: string; displayName: string; roles?: string[]; disabled?: boolean };
type DeveloperStudioRecord = { name: string; ownerDiscordId: string; status?: string };
type DeveloperCampaignRecord = { title: string; gameName: string; status: string; visibility: string; totalBudget: number };
type DeveloperSubmissionRecord = { title?: string; campaignTitle: string; creatorDiscordId: string; platform: string; videoUrl: string; status: string; submittedAt: string | Date };

export async function GET() {
  const developer = await getDeveloperUser();
  if (!developer) return NextResponse.json({ error: "Developer access required." }, { status: 403 });

  const permissions = platformPermissions.filter((permission) => hasPlatformPermission(developer, permission));
  const configuration = hasPlatformPermission(developer, "platform:read") ? {
    database: Boolean(process.env.MONGODB_URI),
    discordOAuth: Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET && process.env.DISCORD_REDIRECT_URI),
    stripeConnect: isStripeConnectConfigured(),
  } : {};
  let metrics: Record<string, number> = {};
  let users: { discordId: string; username: string; displayName: string; roles: string[]; disabled?: boolean }[] = [];
  let studios: { id: string; name: string; ownerDiscordId: string; status?: string }[] = [];
  let campaigns: { id: string; title: string; gameName: string; status: string; visibility: string; totalBudget: number }[] = [];
  let submissions: { id: string; title?: string; campaignTitle: string; creatorDiscordId: string; platform: string; videoUrl: string; status: string; submittedAt: string | Date }[] = [];
  let support: {
    id: string;
    targetDiscordId: string;
    category: string;
    status: "open" | "in_progress" | "resolved";
    messages: { id: string; senderDiscordId: string; body: string; createdAt: string | Date }[];
  }[] = [];
  const needsDatabase = ([
    "platform:read",
    "users:manage",
    "studios:manage",
    "campaigns:manage",
    "submissions:review",
    "support:manage",
  ] as const).some((permission) => hasPlatformPermission(developer, permission));
  if (needsDatabase) {
    const db = await getDatabase();
    const [
      userCount,
      studioCount,
      campaignCount,
      submissionCount,
      supportCount,
      userRecords,
      studioRecords,
      campaignRecords,
      submissionRecords,
      supportRecords,
    ] = await Promise.all([
      hasPlatformPermission(developer, "platform:read") ? db.collection("users").countDocuments() : Promise.resolve(0),
      hasPlatformPermission(developer, "platform:read") ? db.collection("studios").countDocuments() : Promise.resolve(0),
      hasPlatformPermission(developer, "platform:read") ? db.collection("campaigns").countDocuments() : Promise.resolve(0),
      hasPlatformPermission(developer, "platform:read") ? db.collection("submissions").countDocuments() : Promise.resolve(0),
      hasPlatformPermission(developer, "platform:read") ? db.collection("support_tickets").countDocuments() : Promise.resolve(0),
      hasPlatformPermission(developer, "users:manage")
        ? db.collection<DeveloperUserRecord>("users").find({}, { projection: { _id: 0, discordId: 1, username: 1, displayName: 1, roles: 1, disabled: 1 } }).sort({ createdAt: -1 }).limit(50).toArray()
        : Promise.resolve([]),
      hasPlatformPermission(developer, "studios:manage")
        ? db.collection<DeveloperStudioRecord>("studios").find({}, { projection: { name: 1, ownerDiscordId: 1, status: 1 } }).sort({ createdAt: -1 }).limit(50).toArray()
        : Promise.resolve([]),
      hasPlatformPermission(developer, "campaigns:manage")
        ? db.collection<DeveloperCampaignRecord>("campaigns").find({}, { projection: { title: 1, gameName: 1, status: 1, visibility: 1, totalBudget: 1 } }).sort({ createdAt: -1 }).limit(50).toArray()
        : Promise.resolve([]),
      hasPlatformPermission(developer, "submissions:review")
        ? db.collection<DeveloperSubmissionRecord>("submissions").find({ status: "pending_review" }, { projection: { title: 1, campaignTitle: 1, creatorDiscordId: 1, platform: 1, videoUrl: 1, status: 1, submittedAt: 1 } }).sort({ submittedAt: -1 }).limit(50).toArray()
        : Promise.resolve([]),
      hasPlatformPermission(developer, "support:manage")
        ? db.collection<import("@/lib/support").SupportTicketDocument>("support_tickets").find({ status: { $ne: "resolved" } }).sort({ updatedAt: -1 }).limit(50).toArray()
        : Promise.resolve([]),
    ]);
    if (hasPlatformPermission(developer, "platform:read")) {
      metrics = { users: userCount, studios: studioCount, campaigns: campaignCount, submissions: submissionCount, supportTickets: supportCount };
    }
    users = userRecords.map((record) => ({ ...record, discordId: String(record.discordId), roles: record.roles ?? [] }));
    studios = studioRecords.map(({ _id, ...record }) => ({ ...record, id: _id.toString() }));
    campaigns = campaignRecords.map(({ _id, ...record }) => ({ ...record, id: _id.toString() }));
    submissions = submissionRecords.map(({ _id, ...record }) => ({ ...record, id: _id.toString() }));
    support = supportRecords.map((ticket) => ({
      id: ticket.ticketId,
      targetDiscordId: ticket.targetDiscordId,
      category: ticket.category,
      status: ticket.status,
      messages: ticket.messages,
    }));
  }
  return NextResponse.json({
    permissions,
    configuration,
    metrics,
    users,
    studios,
    campaigns,
    submissions,
    support,
    generatedAt: new Date().toISOString(),
  });
}
