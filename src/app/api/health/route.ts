import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  const configuration = {
    appUrl: Boolean(process.env.APP_URL),
    mongodbUri: Boolean(process.env.MONGODB_URI),
    discordClientId: Boolean(process.env.DISCORD_CLIENT_ID),
    discordClientSecret: Boolean(process.env.DISCORD_CLIENT_SECRET),
    discordRedirectUri: Boolean(process.env.DISCORD_REDIRECT_URI),
    sessionSecret: Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32),
    adminDiscordId: Boolean(process.env.ADMIN_DISCORD_ID && /^\d{17,20}$/.test(process.env.ADMIN_DISCORD_ID)),
  };
  const missing = Object.entries(configuration)
    .filter(([, configured]) => !configured)
    .map(([key]) => key);
  if (missing.length) {
    return NextResponse.json({ status: "degraded", database: "not_checked", missing }, { status: 503 });
  }

  try {
    await (await getDatabase()).command({ ping: 1 });
    return NextResponse.json({ status: "ok", database: "connected", missing: [] });
  } catch (error) {
    console.error("Health check could not reach the database", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ status: "unavailable", database: "unreachable", missing: [] }, { status: 503 });
  }
}
