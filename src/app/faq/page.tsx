import { MarketingLayout } from "@/components/MarketingLayout";

export const metadata = { title: "Frequently asked questions" };

const questions = [
  ["Are campaigns live now?", "No. The current project includes clearly marked preview content only. Live campaigns will appear after the studio, database, and review workflows are configured."],
  ["Are earnings guaranteed?", "No. Any estimate is illustrative. Actual eligible views, review outcomes, campaign caps, fees, and payout eligibility depend on campaign terms and approved data sources."],
  ["Which social platforms are supported?", "The interface is being prepared for TikTok, YouTube, and Instagram. Official platform API access and permissions are not configured yet."],
  ["How do I get help?", "Email support@alypne.app. Never send passwords or payment credentials."],
];

export default function FaqPage() {
  return (
    <MarketingLayout>
      <div className="page-wrap">
        <div className="page-heading"><span className="eyebrow">Help</span><h1>Frequently asked questions.</h1><p>What to know about the Alypne preview and its current capabilities.</p></div>
        <div className="info-grid">
          {questions.map(([question, answer]) => <article className="info-card" key={question}><h2>{question}</h2><p>{answer}</p></article>)}
        </div>
      </div>
    </MarketingLayout>
  );
}
