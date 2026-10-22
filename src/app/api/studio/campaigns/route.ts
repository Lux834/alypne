import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { CampaignCreateSchema } from "@/lib/campaigns";
import { getDatabase } from "@/lib/mongodb";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getUserStudio, hasStudioPermission } from "@/lib/studio";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const studio = await getUserStudio(user);
  if (!studio) return NextResponse.json({ error: "Studio membership required." }, { status: 403 });
  if (!hasStudioPermission(studio, user.discordId, "campaigns:manage")) {
    return NextResponse.json({ error: "You do not have permission to create campaigns in this workspace." }, { status: 403 });
  }
  const rateLimit = await enforceRateLimit(user.discordId, "campaign-create", 10, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Campaign draft limit reached. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = CampaignCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Campaign details are invalid." }, { status: 400 });
  }

  const db = await getDatabase();
  const studioId = studio._id.toString();
  const slugBase = parsed.data.title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date();
  const document = {
    ...parsed.data,
    slug,
    studioId,
    budgetRemaining: parsed.data.totalBudget,
    status: "draft" as const,
    visibility: "private" as const,
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection("campaigns").insertOne(document);
  return NextResponse.json({ campaign: { id: result.insertedId.toString(), slug, status: "draft" } }, { status: 201 });
}
