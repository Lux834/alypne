import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import type { CampaignDocument } from "@/lib/campaigns";
import { getDatabase } from "@/lib/mongodb";
import { enforceRateLimit } from "@/lib/rate-limit";
import { canonicalVideoUrl, SubmissionCreateSchema } from "@/lib/submissions";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const db = await getDatabase();
  const submissions = await db.collection("submissions")
    .find({ creatorDiscordId: user.discordId }, { projection: { creatorDiscordId: 0 } })
    .sort({ submittedAt: -1 })
    .limit(100)
    .toArray();
  return NextResponse.json({ submissions: submissions.map(({ _id, ...item }) => ({ ...item, id: _id.toString() })) });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!user.roles.includes("creator")) return NextResponse.json({ error: "Creator access required." }, { status: 403 });
  const rateLimit = await enforceRateLimit(user.discordId, "clip-submission", 20, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Submission limit reached. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = SubmissionCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Campaign, platform, title, or video URL is invalid." }, { status: 400 });

  let canonicalUrl: string;
  try {
    canonicalUrl = canonicalVideoUrl(parsed.data.platform, parsed.data.videoUrl);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Video URL is invalid." }, { status: 400 });
  }

  const db = await getDatabase();
  const campaign = await db.collection<CampaignDocument>("campaigns").findOne({
    slug: parsed.data.campaignSlug,
    status: "active",
    visibility: "public",
    startsAt: { $lte: new Date().toISOString().slice(0, 10) },
    endsAt: { $gt: new Date().toISOString().slice(0, 10) },
    budgetRemaining: { $gt: 0 },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign is unavailable for submissions." }, { status: 404 });
  if (!campaign.platforms.includes(parsed.data.platform)) {
    return NextResponse.json({ error: "This platform is not eligible for the selected campaign." }, { status: 400 });
  }

  const existing = await db.collection("submissions").findOne({
    campaignSlug: campaign.slug,
    canonicalUrl,
  }, { projection: { _id: 1 } });
  if (existing) return NextResponse.json({ error: "This video has already been submitted to the campaign." }, { status: 409 });

  const now = new Date();
  let result;
  try {
    result = await db.collection("submissions").insertOne({
      campaignSlug: campaign.slug,
      campaignTitle: campaign.title,
      studioId: campaign.studioId,
      creatorDiscordId: user.discordId,
      platform: parsed.data.platform,
      videoUrl: parsed.data.videoUrl,
      canonicalUrl,
      title: parsed.data.title ?? "",
      status: "pending_review",
      submittedAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "This video has already been submitted to the campaign." }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ submission: { id: result.insertedId.toString(), status: "pending_review" } }, { status: 201 });
}
