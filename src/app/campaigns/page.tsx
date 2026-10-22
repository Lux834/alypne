"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CampaignPublicSchema, type PublicCampaign, SocialPlatformSchema } from "@/lib/campaigns";
import { MarketingLayout } from "@/components/MarketingLayout";

export default function CampaignsPage() {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("All platforms");
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/campaigns", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json();
        if (!response.ok) {
          const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
            ? result.error
            : "Campaign data could not be loaded.";
          throw new Error(message);
        }
        if (typeof result !== "object" || result === null || !("campaigns" in result) || !Array.isArray(result.campaigns)) {
          throw new Error("The campaign response was invalid.");
        }
        const validated = CampaignPublicSchema.array().safeParse(result.campaigns);
        if (!validated.success) throw new Error("Campaign data could not be validated.");
        setCampaigns(validated.data);
        setPreview("preview" in result && result.preview === true);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Campaign data could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const selectedPlatform = platform === "All platforms" ? null : SocialPlatformSchema.parse(platform);
  const results = useMemo(() => campaigns.filter((item) =>
    `${item.title} ${item.gameName} ${item.platforms.join(" ")}`.toLowerCase().includes(query.toLowerCase())
    && (selectedPlatform === null || item.platforms.includes(selectedPlatform)),
  ), [campaigns, query, selectedPlatform]);

  return (
    <MarketingLayout>
      <div className="page-wrap">
        <div className="page-heading">
          <span className="eyebrow">Campaign discovery</span>
          <h1>Find a brief that fits.</h1>
          <p>Explore campaign requirements and platform eligibility before you create.</p>
        </div>
        <div className="filter-row">
          <label style={{ position: "relative" }}><Search size={15} style={{ position: "absolute", top: 13, left: 12, color: "var(--muted)" }} /><input className="input" aria-label="Search campaigns" placeholder="Search campaigns or games" value={query} onChange={(event) => setQuery(event.target.value)} style={{ paddingLeft: 36 }} /></label>
          <select className="select" aria-label="Filter by platform" value={platform} onChange={(event) => setPlatform(event.target.value)}>
            <option>All platforms</option><option>TikTok</option><option>YouTube</option><option>Instagram</option>
          </select>
        </div>
        {preview && <div className="demo-banner">Preview mode: examples below are not live opportunities and do not accept submissions.</div>}
        {error ? <div className="empty-state" role="alert"><h2>Campaigns unavailable</h2><p>{error}</p></div>
          : loading ? <div className="empty-state" aria-live="polite"><p>Loading campaigns…</p></div>
            : results.length ? <div className="campaign-grid">
              {results.map((campaign, index) => (
                <article className="campaign-card" key={campaign.slug}>
                  <div className={`campaign-art ${index === 1 ? "art-orange" : index === 2 ? "art-blue" : ""}`} />
                  <div className="campaign-card-content">
                    <div className="campaign-meta"><span>{campaign.gameName} · {campaign.platforms.join(", ")}</span><span className="status-pill">{campaign.preview ? "Preview" : "Active"}</span></div>
                    <h3>{campaign.title}</h3>
                    <p>{campaign.description}</p>
                    <div className="campaign-bottom"><span>${campaign.ratePerThousand.toFixed(2)} / 1K eligible views</span><Link href={`/campaigns/${encodeURIComponent(campaign.slug)}`}>View details →</Link></div>
                  </div>
                </article>
              ))}
            </div>
              : <div className="empty-state"><h2>No matching campaigns</h2><p>Try another search or check back when studios publish opportunities.</p></div>}
      </div>
    </MarketingLayout>
  );
}
