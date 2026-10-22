import { CampaignPublicSchema, type CampaignDocument, type PublicCampaign } from "@/lib/campaigns";
import { getDatabase } from "@/lib/mongodb";

function publicCampaign(document: CampaignDocument): PublicCampaign {
  return CampaignPublicSchema.parse({
    slug: document.slug,
    title: document.title,
    gameName: document.gameName,
    description: document.description,
    platforms: document.platforms,
    ratePerThousand: document.ratePerThousand,
    perClipCap: document.perClipCap,
    budgetRemaining: document.budgetRemaining,
    startsAt: document.startsAt,
    endsAt: document.endsAt,
  });
}

export async function getPublicCampaigns(now = new Date()): Promise<PublicCampaign[]> {
  const db = await getDatabase();
  const documents = await db.collection<CampaignDocument>("campaigns")
    .find({
      status: "active",
      visibility: "public",
      startsAt: { $lte: now.toISOString().slice(0, 10) },
      endsAt: { $gt: now.toISOString().slice(0, 10) },
      budgetRemaining: { $gt: 0 },
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return documents.map(publicCampaign);
}

export async function getPublicCampaign(slug: string, now = new Date()): Promise<CampaignDocument | null> {
  const db = await getDatabase();
  return db.collection<CampaignDocument>("campaigns").findOne({
    slug,
    status: "active",
    visibility: "public",
    startsAt: { $lte: now.toISOString().slice(0, 10) },
    endsAt: { $gt: now.toISOString().slice(0, 10) },
    budgetRemaining: { $gt: 0 },
  });
}
