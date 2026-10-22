import { MarketingLayout } from "@/components/MarketingLayout";
import Link from "next/link";

export const metadata = { title: "How it works" };

export default function HowItWorksPage() {
  return (
    <MarketingLayout>
      <div className="page-wrap">
        <div className="page-heading"><span className="eyebrow">How Alypne works</span><h1>A clear path from campaign to clip.</h1><p>Creators and studios use one workflow to publish campaign briefs, submit content, review clips, and follow verified results.</p></div>
        <div className="section-heading"><h2>For creators</h2><p>Participation and payment depend on each campaign’s terms, platform availability, and eligibility.</p></div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">01</span><h3>Explore</h3><p>Compare the brief, supported social platform, eligibility rules, rate, and available budget.</p></article>
          <article className="step-card"><span className="step-number">02</span><h3>Publish</h3><p>Create an original clip that follows the campaign’s required and prohibited content guidance.</p></article>
          <article className="step-card"><span className="step-number">03</span><h3>Submit</h3><p>Share the public post URL. The studio reviews it against the campaign requirements.</p></article>
        </div>
        <div className="section-heading" style={{ marginTop: 48 }}><h2>For studios</h2><p>Campaign tools are being built around transparent requirements and auditable decisions.</p></div>
        <div className="info-grid">
          <article className="info-card"><h2>Set a clear brief</h2><p>Define your game, creative direction, supported platforms, review rules, schedule, rate, and budget before publishing.</p></article>
          <article className="info-card"><h2>Review and learn</h2><p>Moderate creator submissions and use supported platform data to understand performance. Never rely on unverified view claims.</p></article>
        </div>
        <div style={{ marginTop: 26 }}><Link className="text-link" href="/campaigns">Explore campaign previews →</Link></div>
      </div>
    </MarketingLayout>
  );
}
