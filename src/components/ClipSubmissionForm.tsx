"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CampaignPublicSchema, SocialPlatformSchema, type PublicCampaign, type SocialPlatform } from "@/lib/campaigns";
import { PlatformBrandIcon } from "@/components/PlatformBrandIcon";

export function ClipSubmissionForm() {
  const searchParams = useSearchParams();
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const [campaignSlug, setCampaignSlug] = useState(searchParams.get("campaign") ?? "");
  const [platform, setPlatform] = useState<SocialPlatform>("TikTok");
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/campaigns", { cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json();
        if (!response.ok || typeof result !== "object" || result === null || !("campaigns" in result) || !Array.isArray(result.campaigns)) {
          throw new Error("Campaigns could not be loaded.");
        }
        const validated = CampaignPublicSchema.array().safeParse(result.campaigns);
        if (!validated.success) throw new Error("Campaign data could not be validated.");
        if (active) setCampaigns(validated.data);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Campaigns could not be loaded.");
      });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignSlug, platform, videoUrl, title }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const detail = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "Submission could not be sent.";
        throw new Error(detail);
      }
      setMessage("Your clip was submitted for studio review.");
      setVideoUrl("");
      setTitle("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Submission could not be sent.");
    } finally {
      setSaving(false);
    }
  }

  const eligiblePlatforms = campaigns.find((item) => item.slug === campaignSlug)?.platforms ?? [];
  const selectedPlatform = SocialPlatformSchema.safeParse(platform);
  return (
    <form className="panel calc-form" onSubmit={submit} style={{ maxWidth: 680 }}>
      <label>Campaign<select className="select" required value={campaignSlug} onChange={(event) => setCampaignSlug(event.target.value)}><option value="">Choose a live campaign</option>{campaigns.filter((campaign) => !campaign.preview).map((campaign) => <option key={campaign.slug} value={campaign.slug}>{campaign.title}</option>)}</select></label>
      <label>Platform<span className="platform-selected"><PlatformBrandIcon platform={platform} />{platform}</span><select className="select" required value={platform} onChange={(event) => setPlatform(SocialPlatformSchema.parse(event.target.value))}>{(eligiblePlatforms.length ? eligiblePlatforms : ["TikTok", "YouTube", "Instagram"]).map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Public video URL<input className="input" type="url" required value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://…" /></label>
      <label>Optional title<input className="input" maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <p style={{ color: "var(--muted)", fontSize: 11 }}>Only public HTTPS links on the selected platform are accepted. View counts are not requested or used as verification.</p>
      {message && <p role="status" style={{ color: "var(--accent)", fontSize: 11 }}>{message}</p>}
      {error && <p role="alert" style={{ color: "var(--red)", fontSize: 11 }}>{error}</p>}
      <button className="button button-primary" type="submit" disabled={saving || !campaignSlug || !selectedPlatform.success || !eligiblePlatforms.includes(selectedPlatform.success ? selectedPlatform.data : "TikTok")}>{saving ? "Submitting…" : "Submit clip"}</button>
    </form>
  );
}
