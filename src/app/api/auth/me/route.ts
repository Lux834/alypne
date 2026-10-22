import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { syncDiscordProfile } from "@/lib/discord-account";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";

const ProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(60).optional(),
  preferences: z.object({
    campaignUpdates: z.boolean().optional(),
    submissionUpdates: z.boolean().optional(),
  }).optional(),
}).refine((value) => value.displayName !== undefined || value.preferences !== undefined);

export async function GET() {
  const authenticatedUser = await getAuthenticatedUser();
  if (!authenticatedUser) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const profileSync = await syncDiscordProfile(authenticatedUser.discordId, true);
  const db = await getDatabase();
  const user = await db.collection("users").findOne(
    { discordId: authenticatedUser.discordId, disabled: { $ne: true } },
    { projection: { _id: 0, discordId: 1, username: 1, displayName: 1, avatarUrl: 1, roles: 1, onboardingStatus: 1, preferences: 1, discordProfileSyncedAt: 1 } },
  );
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  return NextResponse.json({ user, profileSync });
}

export async function POST() {
  const authenticatedUser = await getAuthenticatedUser();
  if (!authenticatedUser) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const profileSync = await syncDiscordProfile(authenticatedUser.discordId, true);
  if (profileSync === "unavailable") {
    return NextResponse.json({ error: "Discord profile could not be refreshed. Sign in with Discord again to reconnect profile sync." }, { status: 409 });
  }
  const db = await getDatabase();
  const user = await db.collection("users").findOne(
    { discordId: authenticatedUser.discordId, disabled: { $ne: true } },
    { projection: { _id: 0, discordId: 1, username: 1, displayName: 1, avatarUrl: 1, roles: 1, preferences: 1, discordProfileSyncedAt: 1 } },
  );
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  return NextResponse.json({ user, profileSync });
}

export async function PATCH(request: Request) {
  const authenticatedUser = await getAuthenticatedUser();
  if (!authenticatedUser) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = ProfileUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Account settings are invalid." }, { status: 400 });
  const db = await getDatabase();
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.displayName !== undefined) set.displayName = parsed.data.displayName;
  if (parsed.data.preferences) {
    for (const [key, value] of Object.entries(parsed.data.preferences)) {
      if (value !== undefined) set[`preferences.${key}`] = value;
    }
  }
  if (parsed.data.displayName !== undefined) set.customDisplayName = true;
  const result = await db.collection("users").updateOne(
    { discordId: authenticatedUser.discordId, disabled: { $ne: true } },
    { $set: set },
  );
  if (!result.matchedCount) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  return NextResponse.json({ updated: true });
}
