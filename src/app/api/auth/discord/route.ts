import { NextResponse } from "next/server";
import { appUrl, isSecureOrLocalUrl } from "@/lib/app-url";

export const runtime = "nodejs";

function base64Url(value: Uint8Array) {
  return Buffer.from(value).toString("base64url");
}

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  const hasSessionSecret = Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);
  const hasDatabase = Boolean(process.env.MONGODB_URI);

  if (!clientId || !redirectUri || !process.env.DISCORD_CLIENT_SECRET || !hasSessionSecret || !hasDatabase) {
    return NextResponse.redirect(appUrl("/sign-in?error=unconfigured"));
  }

  let callback: URL;
  try {
    callback = new URL(redirectUri);
  } catch {
    return NextResponse.redirect(appUrl("/sign-in?error=configuration"));
  }
  const expectedCallback = appUrl("/api/auth/discord/callback");
  if (callback.href !== expectedCallback.href || !isSecureOrLocalUrl(callback)) {
    return NextResponse.redirect(appUrl("/sign-in?error=configuration"));
  }

  const state = crypto.randomUUID();
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const authorizeUrl = new URL("https://discord.com/oauth2/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "identify");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/auth/discord/callback",
    maxAge: 600,
  };
  response.cookies.set("alypne_oauth_state", state, cookieOptions);
  response.cookies.set("alypne_oauth_verifier", verifier, cookieOptions);
  return response;
}
