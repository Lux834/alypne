import { notFound } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { SubmissionLists } from "@/components/SubmissionLists";
import { CampaignDiscovery } from "@/components/CampaignDiscovery";
import { AccountSettings } from "@/components/AccountSettings";
import { StudioWorkspaceSettings } from "@/components/StudioWorkspaceSettings";
import { StripePayoutSetup } from "@/components/StripePayoutSetup";
import { NotificationList } from "@/components/NotificationList";
import type { CampaignDocument } from "@/lib/campaigns";
import { isAllowlistedAdmin, requireDashboardAccess } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { getStudioDashboardMetrics } from "@/lib/dashboard-data";
import { getSafeStudioBannerUrl, getSafeStudioWebsiteUrl, getUserStudio, hasStudioPermission } from "@/lib/studio";

const sections: Record<string, Record<string, { title: string; description: string }>> = {
  creator: {
    campaigns: { title: "Campaigns", description: "Discover briefs and check eligibility before you create." },
    clips: { title: "My clips", description: "Manage your clip submissions and review status." },
    submissions: { title: "Submissions", description: "Track submitted clips and moderation decisions." },
    earnings: { title: "Earnings", description: "Review pending, available, and processed earnings." },
    wallet: { title: "Wallet", description: "Your payout and transaction information." },
    notifications: { title: "Notifications", description: "Account and campaign updates." },
    accounts: { title: "Accounts", description: "Connect supported social accounts for verification." },
    messages: { title: "Messages", description: "Campaign and support messages." },
    help: { title: "Help center", description: "Find answers and contact Alypne support." },
    settings: { title: "Settings", description: "Manage your account preferences." },
  },
  studio: {
    campaigns: { title: "Campaigns", description: "Manage campaign drafts, live campaigns, and completed campaigns." },
    reviews: { title: "Clip reviews", description: "Review creator submissions against campaign rules." },
    analytics: { title: "Analytics", description: "Understand verified campaign performance." },
    billing: { title: "Billing", description: "Review studio billing and campaign funding." },
    notifications: { title: "Notifications", description: "Studio and campaign updates." },
    messages: { title: "Messages", description: "Campaign and support messages." },
    help: { title: "Help center", description: "Find answers and contact Alypne support." },
    settings: { title: "Settings", description: "Manage your studio preferences." },
  },
};

export default async function DashboardSectionPage({
  params,
}: {
  params: Promise<{ area: string; section: string }>;
}) {
  const { area, section } = await params;
  if ((area !== "creator" && area !== "studio") || !sections[area][section]) notFound();
  const user = await requireDashboardAccess(area);
  const content = sections[area][section];
  const studioWorkspace = area === "studio" ? await getUserStudio(user) : null;
  const shellProps = {
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    showAdmin: isAllowlistedAdmin(user),
    showDeveloper: user.roles.includes("developer") || isAllowlistedAdmin(user),
    showTutorial: !user.onboardingCompleted,
    studioCanManageCampaigns: studioWorkspace ? hasStudioPermission(studioWorkspace, user.discordId, "campaigns:manage") : false,
    ...(studioWorkspace ? { workspace: {
      name: String(studioWorkspace.name),
      description: typeof studioWorkspace.description === "string" ? studioWorkspace.description : null,
      websiteUrl: getSafeStudioWebsiteUrl(studioWorkspace),
      bannerUrl: getSafeStudioBannerUrl(studioWorkspace),
    } } : {}),
  };

  if (area === "creator" && (section === "clips" || section === "submissions")) {
    return <DashboardShell role="creator" title={content.title} description={content.description} {...shellProps}><div style={{ marginBottom: 14 }}><Link className="button button-primary" href="/dashboard/creator/clips/new">Submit a clip</Link></div><SubmissionLists /></DashboardShell>;
  }

  if (area === "creator" && section === "campaigns") {
    return <DashboardShell role="creator" title={content.title} description={content.description} {...shellProps}><CampaignDiscovery /></DashboardShell>;
  }

  if (area === "studio" && section === "reviews") {
    if (!studioWorkspace || !hasStudioPermission(studioWorkspace, user.discordId, "submissions:read")) {
      return <DashboardShell role="studio" title={content.title} description={content.description} {...shellProps}><div className="empty-state"><h2>Submission access not granted</h2><p>Ask your workspace owner to grant clip-review access.</p></div></DashboardShell>;
    }
    return <DashboardShell role="studio" title={content.title} description={content.description} {...shellProps}><SubmissionLists studio canReview={hasStudioPermission(studioWorkspace, user.discordId, "submissions:review")} /></DashboardShell>;
  }

  if (area === "studio" && section === "campaigns") {
    const studio = studioWorkspace;
    if (!studio || !hasStudioPermission(studio, user.discordId, "campaigns:read")) {
      return <DashboardShell role="studio" title={content.title} description={content.description} {...shellProps}><div className="empty-state"><h2>Campaign access not granted</h2><p>Ask your workspace owner to grant campaign access.</p></div></DashboardShell>;
    }
    const db = await getDatabase();
    const campaigns = await db.collection<CampaignDocument>("campaigns").find({ studioId: studio._id.toString() }).sort({ createdAt: -1 }).limit(100).toArray();
    return <DashboardShell role="studio" title={content.title} description={content.description} {...shellProps}>
      {hasStudioPermission(studio, user.discordId, "campaigns:manage") && <div style={{ marginBottom: 14 }}><Link className="button button-primary" href="/dashboard/studio/campaigns/new">Create campaign draft</Link></div>}
      {campaigns.length ? <div style={{ display: "grid", gap: 10 }}>{campaigns.map((campaign) => <article className="panel" key={campaign.slug}><div className="panel-heading">{campaign.title}<span>{campaign.status}</span></div><p style={{ margin: 0, color: "var(--muted)", fontSize: 11 }}>{campaign.gameName} · {campaign.platforms.join(", ")} · Budget ${campaign.totalBudget.toFixed(2)}</p></article>)}</div> : <div className="empty-state"><h2>No campaign drafts</h2><p>{hasStudioPermission(studio, user.discordId, "campaigns:manage") ? "Create a private draft to prepare campaign details. Publishing stays unavailable until billing is configured." : "Campaign drafts created by your workspace will appear here."}</p></div>}
    </DashboardShell>;
  }

  if (area === "studio" && section === "analytics") {
    const studio = studioWorkspace;
    if (!studio || !hasStudioPermission(studio, user.discordId, "analytics:read")) {
      return <DashboardShell role="studio" title={content.title} description={content.description} {...shellProps}><div className="empty-state"><h2>Analytics access not granted</h2><p>Ask your workspace owner to grant analytics access.</p></div></DashboardShell>;
    }
    const metrics = await getStudioDashboardMetrics(studio._id.toString());
    return <DashboardShell role="studio" title={content.title} description={content.description} {...shellProps}><section className="metric-grid">{metrics.map((metric) => <article className="metric-card" key={metric.label}><div className="metric-label">{metric.label}</div><div className="metric-value">{metric.value}</div><div className="metric-detail">{metric.detail}</div></article>)}</section><div className="empty-state" style={{ marginTop: 12 }}><h2>Verified performance data is not connected</h2><p>Views and campaign performance will remain unavailable until approved social-platform verification is configured.</p></div></DashboardShell>;
  }

  if (section === "settings") {
    if (area === "studio") {
      return <DashboardShell role="studio" title={content.title} description={content.description} {...shellProps}><StudioWorkspaceSettings /></DashboardShell>;
    }
    return <DashboardShell role={area} title={content.title} description={content.description} {...shellProps}><AccountSettings /></DashboardShell>;
  }

  if (section === "notifications") {
    return <DashboardShell role={area} title={content.title} description={content.description} {...shellProps}><NotificationList /></DashboardShell>;
  }

  if (area === "creator" && (section === "earnings" || section === "wallet")) {
    const db = await getDatabase();
    const totals = await db.collection("ledger_entries").aggregate<{ _id: string; amountCents: number }>([
      { $match: { creatorDiscordId: user.discordId, status: "available" } },
      { $group: { _id: "$currency", amountCents: { $sum: "$amountCents" } } },
      { $limit: 5 },
    ]).toArray();
    return <DashboardShell role="creator" title={content.title} description={content.description} {...shellProps}>
      <div className="admin-metrics">{totals.length ? totals.map((entry) => <article className="metric-card" key={entry._id}><div className="metric-label">Verified ledger · {entry._id}</div><div className="metric-value">{new Intl.NumberFormat(undefined, { style: "currency", currency: entry._id }).format(entry.amountCents / 100)}</div></article>) : <article className="metric-card"><div className="metric-label">Available balance</div><div className="metric-value">—</div><div className="metric-detail">No verified ledger entries</div></article>}</div>
      <StripePayoutSetup />
    </DashboardShell>;
  }

  if (area === "creator" && section === "accounts") {
    return <DashboardShell role="creator" title={content.title} description={content.description} {...shellProps}>
      <div className="info-grid">{["TikTok", "YouTube", "Instagram"].map((platform) => <article className="info-card" key={platform}><h2>{platform}</h2><p>Account connection is not enabled yet. Alypne will not claim to verify ownership or views until the official platform integration is configured.</p><span className="status-pill">Not connected</span></article>)}</div>
    </DashboardShell>;
  }

  if (section === "billing") {
    return <DashboardShell role="studio" title={content.title} description={content.description} {...shellProps}>
      <div className="empty-state"><h2>Billing is not configured</h2><p>Campaign publishing is disabled until a payment provider, funding workflow, and refund controls are connected. Draft creation remains available.</p><Link className="text-link" href="mailto:support@alypne.app">Contact support</Link></div>
    </DashboardShell>;
  }

  if (section === "messages") {
    return <DashboardShell role={area} title={content.title} description={content.description} {...shellProps}>
      <div className="info-grid"><article className="info-card"><h2>Account updates</h2><p>Submission and campaign notifications are available in your notification center.</p><Link className="text-link" href={`/dashboard/${area}/notifications`}>Open notifications →</Link></article><article className="info-card"><h2>Contact Alypne</h2><p>For account or campaign support, contact the support team.</p><Link className="text-link" href="mailto:support@alypne.app">support@alypne.app</Link></article></div>
    </DashboardShell>;
  }

  if (section === "help") {
    return <DashboardShell role={area} title={content.title} description={content.description} {...shellProps}>
      <div className="info-grid"><article className="info-card"><h2>Frequently asked questions</h2><p>Read current information about campaigns, creator eligibility, and estimates.</p><Link className="text-link" href="/faq">Open FAQ →</Link></article><article className="info-card"><h2>Contact support</h2><p>Send account and product questions to the Alypne support team.</p><Link className="text-link" href="mailto:support@alypne.app">support@alypne.app</Link></article></div>
    </DashboardShell>;
  }

  return <DashboardShell role={area} title={content.title} description={content.description} {...shellProps}><div className="empty-state"><h2>No account data yet</h2><p>Once the matching workflow and its integrations are configured, verified {content.title.toLowerCase()} will appear here.</p></div></DashboardShell>;
}
