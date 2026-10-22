import Image from "next/image";
import { Activity, CircleHelp, LayoutDashboard, Plus, Settings2 } from "lucide-react";

export function DashboardPreview() {
  return (
    <div className="preview" aria-label="Illustrative preview of the Alypne creator dashboard">
      <div className="preview-bar">
        <div className="preview-brand">
          <Image src="/alypne-logo.png" width={18} height={18} alt="" />
          alypne <span className="preview-project">/ Creator workspace</span>
        </div>
        <span>Overview&nbsp;&nbsp; Campaigns&nbsp;&nbsp; Wallet</span>
      </div>
      <div className="preview-layout">
        <aside className="preview-sidebar">
          <div className="preview-nav active"><LayoutDashboard size={11} /> Overview</div>
          <div className="preview-nav"><Activity size={11} /> Campaigns</div>
          <div className="preview-nav"><Plus size={11} /> My clips</div>
          <div className="preview-nav"><Settings2 size={11} /> Wallet</div>
          <div className="preview-nav"><CircleHelp size={11} /> Settings</div>
        </aside>
        <div className="preview-main">
          <div className="preview-heading"><strong>Overview</strong><span>Last 30 days&nbsp;⌄</span></div>
          <div className="preview-tabs"><span>Performance</span><span>Campaigns</span><span>Submissions</span></div>
          <div className="preview-stats">
            <div className="preview-stat"><small>Eligible views</small><strong>—</strong></div>
            <div className="preview-stat"><small>Pending review</small><strong>—</strong></div>
            <div className="preview-stat"><small>Available earnings</small><strong>—</strong></div>
            <div className="preview-stat"><small>Active clips</small><strong>—</strong></div>
          </div>
          <div className="preview-chart">
            <div className="preview-chart-label"><span>My campaigns</span><span>View all</span></div>
            <div className="preview-empty"><span>Campaign activity appears here when available.</span></div>
          </div>
          <div className="preview-campaigns"><div className="preview-campaign"><span /><span /></div><div className="preview-campaign"><span /><span /></div><div className="preview-campaign"><span /><span /></div></div>
        </div>
      </div>
      <span className="preview-caption">Illustrative product preview</span>
    </div>
  );
}
