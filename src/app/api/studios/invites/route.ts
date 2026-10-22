import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import { getAuthenticatedUser } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { getUserStudio, studioPermissions } from "@/lib/studio";

export const runtime = "nodejs";

const InviteSchema = z.object({
  permissions: z.array(z.enum(studioPermissions)).min(1).max(studioPermissions.length),
}).refine(({ permissions }) => new Set(permissions).size === permissions.length, {
  message: "Remove duplicate permissions.",
});

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const studio = await getUserStudio(user);
  if (!studio) return NextResponse.json({ error: "Studio workspace not found." }, { status: 404 });
  if (studio.ownerDiscordId !== user.discordId) {
    return NextResponse.json({ error: "Only the workspace owner can manage team invites." }, { status: 403 });
  }

  const db = await getDatabase();
  const invites = await db.collection("studio_invites")
    .find({ studioId: studio._id.toString(), acceptedAt: { $exists: false }, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } })
    .project({ _id: 1, permissions: 1, expiresAt: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
  return NextResponse.json({
    members: (studio.memberDiscordIds ?? []).filter((id: string) => id !== studio.ownerDiscordId).map((discordId: string) => ({
      discordId,
      permissions: studio.memberPermissions?.[discordId] ?? [],
    })),
    invites: invites.map(({ _id, ...invite }) => ({ ...invite, id: _id.toString() })),
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const studio = await getUserStudio(user);
  if (!studio) return NextResponse.json({ error: "Studio workspace not found." }, { status: 404 });
  if (studio.ownerDiscordId !== user.discordId) {
    return NextResponse.json({ error: "Only the workspace owner can invite team members." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invite permissions are invalid." }, { status: 400 });

  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const db = await getDatabase();
  await db.collection("studio_invites").insertOne({
    studioId: studio._id.toString(),
    tokenHash: hashToken(token),
    permissions: parsed.data.permissions,
    createdByDiscordId: user.discordId,
    createdAt: now,
    expiresAt,
  });
  const inviteUrl = appUrl("/dashboard/studio/invite");
  inviteUrl.searchParams.set("token", token);
  return NextResponse.json({ inviteUrl: inviteUrl.toString(), expiresAt }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const studio = await getUserStudio(user);
  if (!studio || studio.ownerDiscordId !== user.discordId) {
    return NextResponse.json({ error: "Only the workspace owner can revoke invites." }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  const db = await getDatabase();
  const result = await db.collection("studio_invites").updateOne(
    { _id: new ObjectId(id), studioId: studio._id.toString(), acceptedAt: { $exists: false } },
    { $set: { revokedAt: new Date(), revokedByDiscordId: user.discordId } },
  );
  if (!result.matchedCount) return NextResponse.json({ error: "Invite not found or already accepted." }, { status: 404 });
  return NextResponse.json({ revoked: true });
}
