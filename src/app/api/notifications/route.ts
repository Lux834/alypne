import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const ReadUpdateSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  all: z.literal(true).optional(),
}).refine((value) => Boolean(value.id) !== Boolean(value.all), "Choose one notification or mark all as read.");

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const db = await getDatabase();
  const notifications = await db.collection("notifications")
    .find({ targetDiscordId: user.discordId })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return NextResponse.json({
    notifications: notifications.map(({ _id, ...item }) => ({ ...item, id: _id.toString() })),
  });
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const rateLimit = await enforceRateLimit(user.discordId, "notifications-read", 60, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many updates. Try again later." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = ReadUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Notification update is invalid." }, { status: 400 });

  const db = await getDatabase();
  const filter = parsed.data.all
    ? { targetDiscordId: user.discordId, readAt: null }
    : { _id: new ObjectId(parsed.data.id), targetDiscordId: user.discordId };
  const result = await db.collection("notifications").updateMany(
    filter,
    { $set: { readAt: new Date() } },
  );
  return NextResponse.json({ updated: result.modifiedCount });
}
