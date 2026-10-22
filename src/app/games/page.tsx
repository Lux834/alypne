import { MarketingLayout } from "@/components/MarketingLayout";

export const metadata = { title: "Games" };

export default function GamesPage() {
  return (
    <MarketingLayout>
      <div className="page-wrap">
        <div className="page-heading"><span className="eyebrow">Games directory</span><h1>Find campaigns by game.</h1><p>Game pages and campaign links will be listed here as studios publish eligible opportunities.</p></div>
        <div className="empty-state"><h2>No game pages are published yet</h2><p>Check campaign discovery for current opportunities. A game directory will appear when curated game data is available.</p></div>
      </div>
    </MarketingLayout>
  );
}
