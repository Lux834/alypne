import Link from "next/link";
import { MarketingLayout } from "@/components/MarketingLayout";
import { guides } from "@/lib/guides";

export const metadata = { title: "Creator guides" };

export default function GuidesPage() {
  return (
    <MarketingLayout>
      <div className="page-wrap">
        <div className="page-heading"><span className="eyebrow">Alypne guides</span><h1>Make every brief easier to navigate.</h1><p>Original guidance for planning clips, reading requirements, and understanding performance estimates.</p></div>
        <div className="info-grid">
          {guides.map((guide) => <Link className="info-card" href={`/guides/${guide.slug}`} key={guide.slug}><h2>{guide.title}</h2><p>{guide.summary}</p><span className="text-link">Read guide →</span></Link>)}
        </div>
      </div>
    </MarketingLayout>
  );
}
