import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { SupportTicketDocument } from "@/lib/support";

export const runtime = "nodejs";

const SupportMessageSchema = z.object({
  ticketId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(2000),
  category: z.enum(["question", "problem", "feedback"]),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const db = await getDatabase();
  const tickets = await db.collection<SupportTicketDocument>("support_tickets")
    .find({ targetDiscordId: user.discordId })
    .project({ _id: 0, ticketId: 1, category: 1, status: 1, messages: 1, createdAt: 1, updatedAt: 1 })
    .sort({ updatedAt: -1 })
    .limit(20)
    .toArray();
  return NextResponse.json({
    tickets: tickets.map((ticket) => ({
      ...ticket,
      messages: Array.isArray(ticket.messages)
        ? ticket.messages.map((message) => ({ ...message, isTeamReply: message.senderDiscordId !== user.discordId }))
        : [],
    })),
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const limit = await enforceRateLimit(user.discordId, "support-message", 5, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Please wait before sending another support message." }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = SupportMessageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Write a message of up to 2,000 characters." }, { status: 400 });

  const now = new Date();
  const db = await getDatabase();
  const message = { id: randomUUID(), senderDiscordId: user.discordId, body: parsed.data.message, createdAt: now };
  let ticketId = parsed.data.ticketId;
  if (ticketId) {
    const result = await db.collection<SupportTicketDocument>("support_tickets").updateOne(
      { ticketId, targetDiscordId: user.discordId, status: { $ne: "resolved" } },
      { $push: { messages: message }, $set: { updatedAt: now } },
    );
    if (!result.matchedCount) return NextResponse.json({ error: "This support conversation is closed or unavailable." }, { status: 404 });
  } else {
    ticketId = randomUUID();
    await db.collection<SupportTicketDocument>("support_tickets").insertOne({
      ticketId,
      targetDiscordId: user.discordId,
      category: parsed.data.category,
      status: "open",
      messages: [message],
      createdAt: now,
      updatedAt: now,
    });
  }
  return NextResponse.json({ sent: true, ticketId }, { status: 201 });
}
