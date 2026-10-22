import Link from "next/link";
import { MarketingLayout } from "@/components/MarketingLayout";

export const metadata = { title: "For creators" };

export default function ForClippersPage() {
  return (
    <MarketingLayout>
      <div className="page-wrap">
        <div className="page-heading"><span className="eyebrow">For creators</span><h1>Turn your editing into an opportunity.</h1><p>Discover campaign briefs, create original short-form content, and follow your submission status in one place.</p><div style={{ display: "flex", gap: 10, marginTop: 20 }}><Link className="button button-primary" href="/campaigns">Explore campaigns</Link><Link className="button button-outline" href="/sign-in">Creator sign in</Link></div></div>
        <div className="info-grid">
          <article className="info-card"><h2>Check eligibility first</h2><p>Each campaign lists its platforms, audience requirements, content rules, schedule, and payment terms. Read them before publishing.</p></article>
          <article className="info-card"><h2>Submit a public post</h2><p>Share the canonical URL for your eligible post. Screenshots and self-reported views are not payment verification.</p></article>
          <article className="info-card"><h2>Follow review status</h2><p>Submissions can be pending, approved, or rejected. Decisions should include an explanation when campaign rules allow it.</p></article>
          <article className="info-card"><h2>Understand payment timing</h2><p>Earnings depend on verified eligible views, campaign caps, fees, and payout-provider rules. Estimates are never guarantees.</p></article>
        </div>
      </div>
    </MarketingLayout>
  );
}
