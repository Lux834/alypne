import { notFound } from "next/navigation";
import Link from "next/link";
import { MarketingLayout } from "@/components/MarketingLayout";
import { demoCampaigns } from "@/lib/campaigns";
import { getPublicCampaign } from "@/lib/campaign-repository";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const isDevelopmentPreview = process.env.NODE_ENV === "development" && !process.env.MONGODB_URI;
  const campaign = isDevelopmentPreview
    ? demoCampaigns.find((item) => item.slug === slug)
    : await getPublicCampaign(slug);
  if (!campaign) notFound();

  return (
    <MarketingLayout>
      <div className="page-wrap">
        {isDevelopmentPreview && <div className="demo-banner">Development preview only — this is not an active opportunity.</div>}
        <div className="page-heading">
          <span className="eyebrow">{campaign.gameName} · {campaign.platforms.join(", ")}</span>
          <h1>{campaign.title}</h1>
          <p>{campaign.description}</p>
        </div>
        <div className="info-grid">
          <article className="info-card"><h2>Compensation</h2><p>${campaign.ratePerThousand.toFixed(2)} per 1,000 eligible views, subject to campaign rules and a ${campaign.perClipCap.toFixed(2)} per-clip cap.</p></article>
          <article className="info-card"><h2>Budget remaining</h2><p>${campaign.budgetRemaining.toFixed(2)}. Availability can change as campaign funds are reserved.</p></article>
          <article className="info-card"><h2>Eligible platforms</h2><p>{campaign.platforms.join(", ")}</p></article>
          <article className="info-card"><h2>Campaign dates</h2><p>{campaign.startsAt} – {campaign.endsAt}</p></article>
        </div>
        {isDevelopmentPreview
          ? <div className="empty-state" style={{ marginTop: 18 }}><h2>Submissions are not enabled</h2><p>This example exists only to preview the campaign detail layout.</p></div>
          : <div style={{ marginTop: 22 }}><Link className="button button-primary" href={`/dashboard/creator/clips/new?campaign=${encodeURIComponent(campaign.slug)}`}>Submit a clip</Link></div>}
      </div>
    </MarketingLayout>
  );
}
