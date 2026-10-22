import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { DiscordProfileSchema, discordAvatarUrl } from "@/lib/discord";
import { getDatabase } from "@/lib/mongodb";

const DiscordTokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});

const PROFILE_SYNC_INTERVAL_MS = 15 * 60 * 1000;

function encryptionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error("SESSION_SECRET must be at least 32 bytes.");
  return createHash("sha256").update(secret).digest();
}

function encrypt(value: string, discordId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(discordId));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return { iv: iv.toString("base64url"), tag: cipher.getAuthTag().toString("base64url"), ciphertext: ciphertext.toString("base64url") };
}

function decrypt(value: { iv: string; tag: string; ciphertext: string }, discordId: string) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(value.iv, "base64url"));
  decipher.setAAD(Buffer.from(discordId));
  decipher.setAuthTag(Buffer.from(value.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function storeDiscordRefreshToken(discordId: string, refreshToken: string) {
  const db = await getDatabase();
  await db.collection("discord_oauth_tokens").updateOne(
    { discordId },
    { $set: { ...encrypt(refreshToken, discordId), updatedAt: new Date() } },
    { upsert: true },
  );
}

export async function syncDiscordProfile(discordId: string, force = false) {
  const db = await getDatabase();
  const users = db.collection("users");
  const user = await users.findOne(
    { discordId },
    { projection: { discordProfileSyncedAt: 1 } },
  );
  if (!user) throw new Error("Discord account was not found.");

  const syncedAt = user.discordProfileSyncedAt instanceof Date
    ? user.discordProfileSyncedAt.getTime()
    : 0;
  if (!force && Date.now() - syncedAt < PROFILE_SYNC_INTERVAL_MS) return "recent" as const;

  const token = await db.collection("discord_oauth_tokens").findOne<{
    iv: string;
    tag: string;
    ciphertext: string;
  }>({ discordId });
  if (!token || !process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    return "unavailable" as const;
  }

  try {
    const refreshToken = decrypt(token, discordId);
    const refreshed = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!refreshed.ok) {
      console.error("Discord profile refresh failed with status", refreshed.status);
      if (refreshed.status === 400 || refreshed.status === 401) {
        await db.collection("discord_oauth_tokens").deleteOne({ discordId });
      }
      return "unavailable" as const;
    }
    const tokens = DiscordTokenSchema.safeParse(await refreshed.json());
    if (!tokens.success) return "unavailable" as const;

    const profileResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokens.data.access_token}` },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!profileResponse.ok) {
      console.error("Discord profile sync failed with status", profileResponse.status);
      return "unavailable" as const;
    }
    const profile = DiscordProfileSchema.parse(await profileResponse.json());
    if (profile.id !== discordId) return "unavailable" as const;

    const now = new Date();
    await users.updateOne(
      { discordId },
      [{
        $set: {
          username: profile.username,
          displayName: {
            $cond: [
              { $eq: ["$customDisplayName", true] },
              "$displayName",
              profile.global_name || profile.username,
            ],
          },
          avatarUrl: discordAvatarUrl(profile),
          discordProfileSyncedAt: now,
          updatedAt: now,
        },
      }],
    );
    await storeDiscordRefreshToken(discordId, tokens.data.refresh_token);
    return "updated" as const;
  } catch (error) {
    console.error("Discord profile sync could not be completed", error instanceof Error ? error.name : "unknown");
    return "unavailable" as const;
  }
}
