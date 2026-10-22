import { NextResponse } from "next/server";
import { CampaignPublicSchema } from "@/lib/campaigns";
import { getPublicCampaign } from "@/lib/campaign-repository";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!process.env.MONGODB_URI) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  try {
    const campaign = await getPublicCampaign(slug);
    if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    return NextResponse.json({ campaign: CampaignPublicSchema.parse({
      slug: campaign.slug,
      title: campaign.title,
      gameName: campaign.gameName,
      description: campaign.description,
      platforms: campaign.platforms,
      ratePerThousand: campaign.ratePerThousand,
      perClipCap: campaign.perClipCap,
      budgetRemaining: campaign.budgetRemaining,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
    }) });
  } catch (error) {
    console.error("Campaign detail lookup failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Campaign data is temporarily unavailable." }, { status: 503 });
  }
}
