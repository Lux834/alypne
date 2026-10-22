import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";
import { DiscordProfileSchema, discordAvatarUrl } from "@/lib/discord";
import { storeDiscordRefreshToken } from "@/lib/discord-account";
import { getDatabase } from "@/lib/mongodb";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

function signInError(reason: string) {
  const url = appUrl("/sign-in");
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const returnedState = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const expectedState = request.cookies.get("alypne_oauth_state")?.value;
  const codeVerifier = request.cookies.get("alypne_oauth_verifier")?.value;
  const response = (result: NextResponse) => {
    result.cookies.delete("alypne_oauth_state");
    result.cookies.delete("alypne_oauth_verifier");
    return result;
  };

  if (url.searchParams.has("error")) return response(signInError("cancelled"));
  if (!returnedState || !expectedState || returnedState !== expectedState || !code || !codeVerifier) {
    return response(signInError("invalid_state"));
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return response(signInError("unconfigured"));

  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!tokenResponse.ok) {
      console.error("Discord OAuth token exchange failed with status", tokenResponse.status);
      return response(signInError("provider"));
    }
    const tokenBody: unknown = await tokenResponse.json();
    const parsedToken = z.object({
      access_token: z.string().min(1),
      refresh_token: z.string().min(1),
    }).safeParse(tokenBody);
    if (!parsedToken.success) return response(signInError("provider"));
    const { access_token: accessToken, refresh_token: refreshToken } = parsedToken.data;

    const profileResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!profileResponse.ok) {
      console.error("Discord profile lookup failed with status", profileResponse.status);
      return response(signInError("provider"));
    }
    const profile = DiscordProfileSchema.parse(await profileResponse.json());
    const db = await getDatabase();
    await db.collection("users").updateOne(
      { discordId: profile.id },
      {
        $set: {
          username: profile.username,
          avatarUrl: discordAvatarUrl(profile),
          discordProfileSyncedAt: new Date(),
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          discordId: profile.id,
          displayName: profile.global_name || profile.username,
          roles: ["creator"],
          createdAt: new Date(),
          onboardingStatus: "incomplete",
        },
      },
      { upsert: true },
    );
    await storeDiscordRefreshToken(profile.id, refreshToken);
    if (profile.id === process.env.ADMIN_DISCORD_ID?.trim()) {
      await db.collection("users").updateOne(
        { discordId: profile.id },
        { $addToSet: { roles: "admin" } },
      );
    }
    await createSession(profile.id);
    return response(NextResponse.redirect(appUrl(
      profile.id === process.env.ADMIN_DISCORD_ID?.trim()
        ? "/dashboard/admin"
        : "/dashboard/creator",
    )));
  } catch (error) {
    console.error("Discord sign-in could not be completed", error instanceof Error ? error.name : "unknown");
    return response(signInError("failed"));
  }
}
