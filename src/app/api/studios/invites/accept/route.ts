import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";

const AcceptInviteSchema = z.object({ token: z.string().regex(/^[a-f\d]{64}$/i) });
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = AcceptInviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "This invite link is invalid." }, { status: 400 });

  const db = await getDatabase();
  const now = new Date();
  const membership = await db.collection("studios").findOne({
    $or: [{ ownerDiscordId: user.discordId }, { memberDiscordIds: user.discordId }],
  }, { projection: { _id: 1 } });
  if (membership) return NextResponse.json({ error: "Your account already belongs to a studio workspace." }, { status: 409 });
  const invitation = await db.collection("studio_invites").findOneAndUpdate(
    {
      tokenHash: hashToken(parsed.data.token),
      expiresAt: { $gt: now },
      acceptedAt: { $exists: false },
      revokedAt: { $exists: false },
    },
    { $set: { acceptedAt: now, acceptedByDiscordId: user.discordId } },
    { returnDocument: "after", includeResultMetadata: false },
  );
  if (!invitation) return NextResponse.json({ error: "This invite has expired, been used, or was revoked." }, { status: 410 });

  const studioResult = await db.collection("studios").updateOne(
    { _id: new ObjectId(invitation.studioId), status: { $ne: "suspended" } },
    {
      $addToSet: { memberDiscordIds: user.discordId },
      $set: { [`memberPermissions.${user.discordId}`]: invitation.permissions, updatedAt: now },
    },
  );
  if (!studioResult.matchedCount) {
    await db.collection("studio_invites").updateOne(
      { _id: invitation._id, acceptedByDiscordId: user.discordId },
      { $unset: { acceptedAt: "", acceptedByDiscordId: "" } },
    );
    return NextResponse.json({ error: "The studio workspace is no longer available." }, { status: 404 });
  }
  return NextResponse.json({ accepted: true });
}
