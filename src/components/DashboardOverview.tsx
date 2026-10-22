import { Activity, ArrowUpRight, BadgeDollarSign, Eye, FileCheck2 } from "lucide-react";
import Link from "next/link";
import type { DashboardMetric } from "@/lib/dashboard-data";

export function DashboardOverview({
  role,
  metrics,
  studioAccess = { campaigns: true, reviews: true, analytics: true, settings: true },
}: {
  role: "creator" | "studio";
  metrics: DashboardMetric[];
  studioAccess?: { campaigns: boolean; reviews: boolean; analytics: boolean; settings: boolean };
}) {
  const creator = role === "creator";
  const icons = creator
    ? [
        Eye,
        FileCheck2,
        BadgeDollarSign,
        FileCheck2,
      ]
    : [
        Activity,
        FileCheck2,
        BadgeDollarSign,
        Eye,
      ];

  return (
    <>
      {creator || studioAccess.analytics ? <section className="metric-grid" aria-label="Dashboard metrics">
        {metrics.map((metric, index) => {
          const Icon = icons[index];
          return <article className="metric-card" key={metric.label}><div className="metric-label">{metric.label}<Icon size={14} /></div><div className="metric-value">{metric.value}</div><div className="metric-detail">{metric.detail}</div></article>;
        })}
      </section> : <div className="empty-state"><h2>Analytics access not granted</h2><p>Ask your workspace owner for permission to view studio analytics.</p></div>}
      {!creator && (studioAccess.campaigns || studioAccess.reviews || studioAccess.settings) && <section className="studio-next-steps">
        <div className="panel-heading">Workspace tools <span>Build and manage your studio</span></div>
        <div className="studio-quick-actions">
          {studioAccess.campaigns && <Link className="studio-quick-card" href="/dashboard/studio/campaigns/new"><span className="quick-action-icon"><Activity size={15} /></span><strong>Create a campaign draft</strong><small>Set your brief, rate, platforms, and budget.</small><span className="quick-action-link">Start draft ↗</span></Link>}
          {studioAccess.reviews && <Link className="studio-quick-card" href="/dashboard/studio/reviews"><span className="quick-action-icon"><FileCheck2 size={15} /></span><strong>Review submissions</strong><small>Open creator clips and record moderation decisions.</small><span className="quick-action-link">Open reviews ↗</span></Link>}
          {studioAccess.settings && <Link className="studio-quick-card" href="/dashboard/studio/settings"><span className="quick-action-icon"><ArrowUpRight size={15} /></span><strong>Update your workspace</strong><small>Change your studio profile, website, and banner.</small><span className="quick-action-link">Edit branding ↗</span></Link>}
        </div>
      </section>}
      {(creator || studioAccess.analytics) && <div className="dash-panels">
        <section className="panel">
          <div className="panel-heading">Performance <span>Last 30 days</span></div>
          <div className="chart-empty">Verified performance data will appear after a supported source is connected.</div>
        </section>
        <section className="panel">
          <div className="panel-heading">Recent activity <span><ArrowUpRight size={13} /></span></div>
          <div className="chart-empty">Campaign and account activity will appear here.</div>
        </section>
      </div>}
    </>
  );
}
