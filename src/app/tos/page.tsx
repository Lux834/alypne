import { MarketingLayout } from "@/components/MarketingLayout";

export const metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <MarketingLayout>
      <div className="page-wrap prose">
        <span className="eyebrow">Legal draft</span>
        <h1>Terms of service</h1>
        <p><strong>Review required:</strong> These draft terms are not legal advice and must be adapted to Alypne’s actual operator, supported regions, business model, and payment providers before public launch.</p>
        <h2>Preview status</h2>
        <p>The current Alypne Clips build is a development preview. Campaign examples are illustrative, submission and review workflows are not live, and no earnings or payments are promised or processed.</p>
        <h2>Acceptable use</h2>
        <p>When the service is enabled, users will need to follow applicable law, platform rules, campaign requirements, and the rights of other people. Do not submit content you do not have permission to use.</p>
        <h2>Campaigns and estimates</h2>
        <p>Campaign availability, eligibility, metrics, fees, and compensation will be governed by the campaign terms and any final agreements. Calculator outputs are estimates and are not guarantees.</p>
        <h2>Contact</h2>
        <p>Questions about these draft terms can be sent to <a href="mailto:support@alypne.app">support@alypne.app</a>.</p>
      </div>
    </MarketingLayout>
  );
}
