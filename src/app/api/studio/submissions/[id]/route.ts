import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { getDatabase, getMongoClient } from "@/lib/mongodb";
import { getUserStudio, hasStudioPermission } from "@/lib/studio";

export const runtime = "nodejs";

const ReviewSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(1000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const studio = await getUserStudio(user);
  if (!studio) return NextResponse.json({ error: "Studio membership required." }, { status: 403 });
  if (!hasStudioPermission(studio, user.discordId, "submissions:review")) {
    return NextResponse.json({ error: "You do not have permission to review submissions." }, { status: 403 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Review decision is invalid." }, { status: 400 });

  const db = await getDatabase();
  const client = await getMongoClient();
  const session = client.startSession();
  let matched = false;
  try {
    await session.withTransaction(async () => {
      const now = new Date();
      const result = await db.collection("submissions").updateOne(
        { _id: new ObjectId(id), studioId: studio._id.toString(), status: "pending_review" },
        { $set: {
          status: parsed.data.decision,
          reviewNote: parsed.data.note ?? "",
          reviewedByDiscordId: user.discordId,
          reviewedAt: now,
          updatedAt: now,
        } },
        { session },
      );
      if (!result.matchedCount) return;
      matched = true;

      const submission = await db.collection("submissions").findOne(
        { _id: new ObjectId(id), studioId: studio._id.toString() },
        { session, projection: { creatorDiscordId: 1, campaignTitle: 1 } },
      );
      if (!submission) throw new Error("Reviewed submission disappeared during transaction.");

      const creator = await db.collection("users").findOne(
        { discordId: submission.creatorDiscordId },
        { session, projection: { preferences: 1 } },
      );
      if (creator?.preferences?.submissionUpdates !== false) {
        const outcome = parsed.data.decision === "approved" ? "approved" : "needs further review";
        await db.collection("notifications").insertOne({
          eventKey: `submission:${id}:${parsed.data.decision}`,
          targetDiscordId: submission.creatorDiscordId,
          type: `submission_${parsed.data.decision}`,
          title: parsed.data.decision === "approved" ? "Clip approved" : "Clip not approved",
          body: `${submission.campaignTitle}: your clip was ${outcome}.`,
          href: "/dashboard/creator/submissions",
          readAt: null,
          createdAt: now,
        }, { session });
      }
      await db.collection("audit_logs").insertOne({
        actorDiscordId: user.discordId,
        action: `submission.${parsed.data.decision}`,
        entityType: "submission",
        entityId: id,
        createdAt: now,
      }, { session });
    });
  } finally {
    await session.endSession();
  }
  if (!matched) return NextResponse.json({ error: "This submission was already reviewed or is not part of your studio." }, { status: 409 });
  return NextResponse.json({ status: parsed.data.decision });
}
