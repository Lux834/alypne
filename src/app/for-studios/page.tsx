import Link from "next/link";
import { MarketingLayout } from "@/components/MarketingLayout";

export const metadata = { title: "For studios" };

export default function ForStudiosPage() {
  return (
    <MarketingLayout>
      <div className="page-wrap">
        <div className="page-heading"><span className="eyebrow">For studios</span><h1>Give creators a brief worth creating for.</h1><p>Plan a campaign with clear creative direction, supported platforms, eligibility, budget, and review rules.</p><Link className="button button-primary" href="/sign-in" style={{ marginTop: 12 }}>Studio sign in</Link></div>
        <div className="info-grid">
          <article className="info-card"><h2>Define the campaign</h2><p>Set the game, objective, required content, prohibited content, platforms, and dates before inviting creators.</p></article>
          <article className="info-card"><h2>Budget transparently</h2><p>Specify a rate, per-clip cap, and total campaign budget. Funding and billing must be connected before a campaign can go live.</p></article>
          <article className="info-card"><h2>Moderate consistently</h2><p>Review public clips against the brief and record clear decisions. Campaign rules should be applied consistently.</p></article>
          <article className="info-card"><h2>Measure responsibly</h2><p>Only report performance from an approved source. Social-platform APIs and eligible metrics vary by provider.</p></article>
        </div>
      </div>
    </MarketingLayout>
  );
}
