import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";

const CompletionSchema = z.object({ skipped: z.boolean() });

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = CompletionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Tutorial completion is invalid." }, { status: 400 });

  const db = await getDatabase();
  const result = await db.collection("users").updateOne(
    { discordId: user.discordId, disabled: { $ne: true } },
    { $set: {
      onboardingCompleted: true,
      onboardingStatus: parsed.data.skipped ? "skipped" : "completed",
      onboardingCompletedAt: new Date(),
      updatedAt: new Date(),
    } },
  );
  if (!result.matchedCount) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  return NextResponse.json({ completed: true });
}
