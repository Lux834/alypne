"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CampaignPublicSchema, SocialPlatformSchema, type PublicCampaign } from "@/lib/campaigns";
import { PlatformBrandIcon } from "@/components/PlatformBrandIcon";

export function CampaignDiscovery() {
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("All platforms");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selectedPlatform = platform === "All platforms" ? null : SocialPlatformSchema.parse(platform);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/campaigns", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json();
        if (!response.ok) {
          const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
            ? result.error
            : "Campaigns could not be loaded.";
          throw new Error(message);
        }
        if (typeof result !== "object" || result === null || !("campaigns" in result) || !Array.isArray(result.campaigns)) {
          throw new Error("The campaign response was invalid.");
        }
        const validated = CampaignPublicSchema.array().safeParse(result.campaigns);
        if (!validated.success) throw new Error("Campaign data could not be validated.");
        setCampaigns(validated.data.filter((campaign) => !campaign.preview));
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Campaigns could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => campaigns.filter((campaign) =>
    `${campaign.title} ${campaign.gameName} ${campaign.platforms.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())
    && (!selectedPlatform || campaign.platforms.includes(selectedPlatform)),
  ), [campaigns, query, selectedPlatform]);
  const activePlatform = SocialPlatformSchema.safeParse(platform);

  return (
    <>
      <div className="filter-row">
        <label className="campaign-search"><Search size={14} /><input className="input" aria-label="Search campaigns" placeholder="Search campaigns" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className="platform-filter">{activePlatform.success && <PlatformBrandIcon platform={activePlatform.data} />}<span className="sr-only">Filter by platform</span><select className="select" aria-label="Filter by platform" value={platform} onChange={(event) => setPlatform(event.target.value)}>
          <option>All platforms</option><option>TikTok</option><option>YouTube</option><option>Instagram</option>
        </select></label>
      </div>
      {error ? <div className="empty-state" role="alert"><h2>Campaigns unavailable</h2><p>{error}</p></div>
        : loading ? <div className="empty-state" aria-live="polite"><p>Loading campaigns…</p></div>
          : filtered.length ? <div className="campaign-grid">{filtered.map((campaign) => (
            <article className="campaign-card" key={campaign.slug}>
              <div className="campaign-art" />
              <div className="campaign-card-content">
                <div className="campaign-meta"><span>{campaign.gameName}</span><span className="campaign-platform-icons" aria-label={`Available on ${campaign.platforms.join(", ")}`}>{campaign.platforms.map((item) => <span className={`campaign-platform-mark platform-mark-${item.toLowerCase()}`} title={item} key={item}><PlatformBrandIcon platform={item} /></span>)}</span><span className={campaign.preview ? "status-pill preview-pill" : "status-pill"}>{campaign.preview ? "Preview" : "Active"}</span></div>
                <h3>{campaign.title}</h3><p>{campaign.description}</p>
                <div className="campaign-bottom"><span>${campaign.ratePerThousand.toFixed(2)} / 1K views</span><Link href={`/campaigns/${encodeURIComponent(campaign.slug)}`}>{campaign.preview ? "Preview brief →" : "View brief →"}</Link></div>
              </div>
            </article>
          ))}</div>
            : <div className="empty-state"><h2>No active campaigns yet</h2><p>New opportunities will appear here when studios publish eligible campaigns.</p></div>}
    </>
  );
}
