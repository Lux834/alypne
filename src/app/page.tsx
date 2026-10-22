import { ArrowRight, BadgeCheck, ChartNoAxesCombined, Clapperboard, WalletCards } from "lucide-react";
import Link from "next/link";
import { CampaignCards } from "@/components/CampaignCards";
import { DashboardPreview } from "@/components/DashboardPreview";
import { MarketingLayout } from "@/components/MarketingLayout";

export default function HomePage() {
  return (
    <MarketingLayout>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> Creator campaigns, made clearer</span>
          <h1>Make clips.<br /><span>Make it count.</span></h1>
          <p>Find creator campaigns, publish clips you’re proud of, and follow performance and earnings in one place.</p>
          <div className="hero-buttons">
            <Link className="button button-primary" href="/campaigns">Explore campaigns <ArrowRight size={15} /></Link>
            <Link className="button button-outline" href="/for-studios">I’m a studio</Link>
          </div>
          <p className="hero-note"><strong>Clear briefs. Transparent status.</strong> No guaranteed view or earning claims.</p>
        </div>
        <DashboardPreview />
      </section>

      <section className="section section-bordered">
        <div className="section-heading">
          <span className="eyebrow">One platform, two sides</span>
          <h2>A better way to work together.</h2>
          <p>Alypne helps creators discover opportunities and gives studios a clearer campaign workflow.</p>
        </div>
        <div className="feature-grid">
          <article className="feature-card"><div className="feature-icon"><Clapperboard size={17} /></div><h3>Find your next brief</h3><p>Browse campaign details, platforms, and content requirements before you create.</p></article>
          <article className="feature-card"><div className="feature-icon"><ChartNoAxesCombined size={17} /></div><h3>Understand performance</h3><p>See submission and review status. Verified metrics appear only when an approved data source is connected.</p></article>
          <article className="feature-card"><div className="feature-icon"><WalletCards size={17} /></div><h3>Know where earnings stand</h3><p>Keep pending, available, and processed amounts distinct with a traceable ledger.</p></article>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">Campaign discovery</span>
          <h2>Know the opportunity before you post.</h2>
          <p>Each campaign should make its brief, eligibility, rate, and review rules easy to understand.</p>
        </div>
        <CampaignCards showPreview={process.env.NODE_ENV === "development"} />
        {process.env.NODE_ENV === "development" && <p className="demo-note">Preview cards are design examples only. No live campaigns or earnings are represented.</p>}
        <div style={{ marginTop: 20 }}><Link className="text-link" href="/campaigns">Browse campaign opportunities <ArrowRight size={14} /></Link></div>
      </section>

      <section className="section section-bordered">
        <div className="section-heading">
          <span className="eyebrow">Simple workflow</span>
          <h2>From brief to review, without the guesswork.</h2>
        </div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">01</span><h3>Choose a campaign</h3><p>Review a studio’s brief, platform rules, and compensation terms.</p></article>
          <article className="step-card"><span className="step-number">02</span><h3>Create and submit</h3><p>Publish eligible content and submit its public link for review.</p></article>
          <article className="step-card"><span className="step-number">03</span><h3>Track the status</h3><p>Follow moderation, verified performance, and payment state as they update.</p></article>
        </div>
      </section>

      <section className="section">
        <div className="callout">
          <div><h2>Start with the brief. Build from there.</h2><p>Creators can explore opportunities; studios can learn how campaign setup works.</p></div>
          <Link className="button button-primary" href="/how-it-works">See how Alypne works <BadgeCheck size={15} /></Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
