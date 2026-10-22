"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate, formatDateTime } from "@/lib/date-format";
import { z } from "zod";
import { platformPermissionLabels, type PlatformPermission } from "@/lib/platform-permissions";

type AdminUser = {
  discordId: string;
  username: string;
  displayName: string;
  roles: string[];
  developerPermissions?: PlatformPermission[];
  disabled?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
};
type AdminStudio = {
  id: string;
  name: string;
  ownerDiscordId: string;
  memberDiscordIds: string[];
  status?: string;
};
type AdminCampaign = {
  id: string;
  title: string;
  gameName: string;
  status: "draft" | "active" | "paused" | "completed";
  visibility: string;
  totalBudget: number;
};
type AdminSubmission = {
  id: string;
  campaignTitle: string;
  creatorDiscordId: string;
  platform: string;
  videoUrl: string;
  title?: string;
  status: string;
  submittedAt: string;
};
type AdminAuditEntry = {
  id: string;
  actorDiscordId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};
type AdminSupportTicket = {
  id: string;
  targetDiscordId: string;
  category: string;
  status: "open" | "in_progress" | "resolved";
  messages: { id: string; senderDiscordId: string; body: string; createdAt: string }[];
};
type AdminData = {
  metrics: {
    users: number;
    studios: number;
    campaigns: number;
    activeCampaigns: number;
    submissions: number;
    pendingSubmissions: number;
    developers: number;
    openSupportTickets: number;
  };
  configuration: Record<string, boolean>;
  users: AdminUser[];
  studios: AdminStudio[];
  campaigns: AdminCampaign[];
  submissions: AdminSubmission[];
  audit: AdminAuditEntry[];
  support: AdminSupportTicket[];
  currentAdmin: string;
};
const AdminDataSchema = z.object({
  metrics: z.object({
    users: z.number(),
    studios: z.number(),
    campaigns: z.number(),
    activeCampaigns: z.number(),
    submissions: z.number(),
    pendingSubmissions: z.number(),
    developers: z.number(),
    openSupportTickets: z.number(),
  }),
  configuration: z.record(z.string(), z.boolean()),
  users: z.array(z.object({
    discordId: z.string(),
    username: z.string(),
    displayName: z.string(),
    roles: z.array(z.string()),
    developerPermissions: z.array(z.enum(["platform:read", "users:manage", "studios:manage", "campaigns:manage", "submissions:review", "support:manage"])).optional(),
    disabled: z.boolean().optional(),
    createdAt: z.string().optional(),
    lastLoginAt: z.string().optional(),
  })),
  studios: z.array(z.object({
    id: z.string(),
    name: z.string(),
    ownerDiscordId: z.string(),
    memberDiscordIds: z.array(z.string()),
    status: z.string().optional(),
  })),
  campaigns: z.array(z.object({
    id: z.string(),
    title: z.string(),
    gameName: z.string(),
    status: z.enum(["draft", "active", "paused", "completed"]),
    visibility: z.string(),
    totalBudget: z.number(),
  })),
  submissions: z.array(z.object({
    id: z.string(),
    campaignTitle: z.string(),
    creatorDiscordId: z.string(),
    platform: z.string(),
    videoUrl: z.string(),
    title: z.string().optional(),
    status: z.string(),
    submittedAt: z.string(),
  })),
  audit: z.array(z.object({
    id: z.string(),
    actorDiscordId: z.string(),
    action: z.string(),
    entityType: z.string(),
    entityId: z.string(),
    createdAt: z.string(),
  })),
  support: z.array(z.object({
    id: z.string(),
    targetDiscordId: z.string(),
    category: z.string(),
    status: z.enum(["open", "in_progress", "resolved"]),
    messages: z.array(z.object({
      id: z.string(),
      senderDiscordId: z.string(),
      body: z.string(),
      createdAt: z.string(),
    })),
  })),
  currentAdmin: z.string(),
});

const sections = ["Overview", "Users", "Developers", "Studios", "Campaigns", "Submissions", "Support", "Platform", "Audit"] as const;
type Section = (typeof sections)[number];

async function readError(response: Response) {
  const body: unknown = await response.json();
  return typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
    ? body.error
    : "The admin request could not be completed.";
}

async function fetchAdminData(): Promise<AdminData> {
  const response = await fetch("/api/admin", { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  const body: unknown = await response.json();
  const parsed = AdminDataSchema.safeParse(body);
  if (!parsed.success) throw new Error("The admin data response was invalid.");
  return parsed.data;
}

export function AdminPanel() {
  const [data, setData] = useState<AdminData | null>(null);
  const [section, setSection] = useState<Section>("Overview");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [developerEdits, setDeveloperEdits] = useState<Record<string, PlatformPermission[]>>({});

  const refresh = useCallback(async () => {
    setError("");
    try {
      setData(await fetchAdminData());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Admin data could not be loaded.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminData()
      .then((result) => { if (active) setData(result); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Admin data could not be loaded.");
      });
    return () => { active = false; };
  }, []);

  async function update(id: string, action: Record<string, unknown>) {
    setBusy(id);
    setError("");
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      if (!response.ok) throw new Error(await readError(response));
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The admin action failed.");
    } finally {
      setBusy("");
    }
  }

  if (!data && !error) return <div className="empty-state" aria-live="polite">Loading admin workspace…</div>;
  if (!data) return <div className="empty-state" role="alert"><h2>Admin workspace unavailable</h2><p>{error}</p><button className="button button-outline" onClick={() => void refresh()}>Try again</button></div>;

  const term = query.trim().toLowerCase();
  const matches = (...values: (string | undefined)[]) => !term || values.some((value) => value?.toLowerCase().includes(term));
  const counts = [
    ["Users", data.metrics.users],
    ["Studios", data.metrics.studios],
    ["Campaigns", data.metrics.campaigns],
    ["Active campaigns", data.metrics.activeCampaigns],
    ["Submissions", data.metrics.submissions],
    ["Needs review", data.metrics.pendingSubmissions],
    ["Developers", data.metrics.developers],
    ["Open support", data.metrics.openSupportTickets],
  ];

  return (
    <div className="admin-console">
      <div className="admin-toolbar">
        <nav className="admin-tabs" aria-label="Admin sections">
          {sections.map((item) => <button type="button" key={item} className={section === item ? "active" : ""} onClick={() => setSection(item)}>{item}</button>)}
        </nav>
        <button className="button button-outline" type="button" onClick={() => void refresh()} disabled={Boolean(busy)}>Refresh data</button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}

      {section === "Overview" && <>
        <div className="admin-metrics">{counts.map(([label, value]) => <article className="metric-card" key={label}><div className="metric-label">{label}</div><div className="metric-value">{value}</div></article>)}</div>
        <div className="admin-summary-grid">
          <section className="panel"><div className="panel-heading">Platform readiness <span>Live configuration check</span></div>
            <div className="admin-status-list">{Object.entries(data.configuration).map(([name, configured]) => <div className="admin-status-row" key={name}><span>{name.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</span><strong className={configured ? "status-ok" : "status-pending"}>{configured ? "Ready" : "Not configured"}</strong></div>)}</div>
          </section>
          <section className="panel"><div className="panel-heading">Admin account <span>Allowlisted</span></div><p className="admin-id">{data.currentAdmin}</p><p className="admin-help">Admin access is restricted to the configured Discord account. Stripe Connect readiness is shown above; actual payouts still require a verified earnings ledger and funded settlement workflow.</p></section>
        </div>
      </>}

      {section !== "Overview" && section !== "Platform" && <>
        <label className="admin-search">Filter records<input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${section.toLowerCase()}`} /></label>
      </>}

      {section === "Users" && <div className="admin-record-list">
        {data.users.filter((item) => matches(item.displayName, item.username, item.discordId)).map((item) => <article className="panel admin-record" key={item.discordId}>
          <div><h2>{item.displayName} <span>@{item.username}</span></h2><p>{item.discordId} · {item.roles.join(", ") || "no roles"}{item.lastLoginAt ? ` · Last login ${formatDate(item.lastLoginAt)}` : ""}</p></div>
          <div className="admin-actions">
            <button className="button button-outline" type="button" disabled={Boolean(busy) || item.discordId === data.currentAdmin} onClick={() => void update(item.discordId, { action: "user", discordId: item.discordId, creator: !item.roles.includes("creator"), suspended: Boolean(item.disabled) })}>{item.roles.includes("creator") ? "Remove creator" : "Add creator"}</button>
            <button className={`button ${item.roles.includes("developer") ? "button-primary" : "button-outline"}`} type="button" disabled={Boolean(busy) || item.discordId === data.currentAdmin} onClick={() => void update(item.discordId, { action: "user", discordId: item.discordId, creator: item.roles.includes("creator"), developer: !item.roles.includes("developer"), suspended: Boolean(item.disabled) })}>{item.roles.includes("developer") ? "Remove developer" : "Grant developer"}</button>
            <button className={`button ${item.disabled ? "button-primary" : "button-outline"}`} type="button" disabled={Boolean(busy) || item.discordId === data.currentAdmin} onClick={() => void update(item.discordId, { action: "user", discordId: item.discordId, creator: item.roles.includes("creator"), suspended: !item.disabled })}>{item.disabled ? "Restore account" : "Suspend"}</button>
          </div>
        </article>)}
        {!data.users.some((item) => matches(item.displayName, item.username, item.discordId)) && <div className="empty-state">No users match this filter.</div>}
      </div>}

      {section === "Developers" && <div className="developer-admin-layout">
        <section className="panel"><div className="panel-heading">Developer access <span>Assigned by platform admin</span></div><p className="admin-help">Developers receive read-only access to service readiness and aggregate platform counts. They cannot view message contents or manage accounts, payouts, or studios.</p></section>
        <div className="admin-record-list">        {data.users.filter((item) => item.roles.includes("developer") && matches(item.displayName, item.username, item.discordId)).map((item) => {
          const permissions = developerEdits[item.discordId] ?? item.developerPermissions ?? [];
          return <article className="panel developer-user-card" key={item.discordId}>
            <div><h2>{item.displayName} <span>@{item.username}</span></h2><p>{item.discordId} · Developer (scoped access)</p></div>
            <div className="developer-permission-grid">{(Object.entries(platformPermissionLabels) as [PlatformPermission, string][]).map(([permission, label]) => <label className="team-permission" key={permission}><input type="checkbox" checked={permissions.includes(permission)} onChange={(event) => setDeveloperEdits((current) => ({ ...current, [item.discordId]: event.target.checked ? [...permissions, permission] : permissions.filter((value) => value !== permission) }))} /><span>{label}</span></label>)}</div>
            <div className="admin-actions"><button className="button button-primary" type="button" disabled={Boolean(busy) || !developerEdits[item.discordId]} onClick={() => { void update(item.discordId, { action: "user", discordId: item.discordId, creator: item.roles.includes("creator"), developer: true, developerPermissions: permissions, suspended: Boolean(item.disabled) }); setDeveloperEdits((current) => { const next = { ...current }; delete next[item.discordId]; return next; }); }}>Save developer permissions</button><button className="button button-outline" type="button" disabled={Boolean(busy)} onClick={() => void update(item.discordId, { action: "user", discordId: item.discordId, creator: item.roles.includes("creator"), developer: false, suspended: Boolean(item.disabled) })}>Remove access</button></div>
          </article>;
        })}{!data.users.some((item) => item.roles.includes("developer") && matches(item.displayName, item.username, item.discordId)) && <div className="empty-state">No developer accounts match this filter. Grant developer access from the Users section.</div>}</div>
      </div>}

      {section === "Studios" && <div className="admin-record-list">
        {data.studios.filter((item) => matches(item.name, item.ownerDiscordId)).map((item) => <article className="panel admin-record" key={item.id}>
          <div><h2>{item.name}</h2><p>Owner {item.ownerDiscordId} · {item.memberDiscordIds?.length ?? 0} member(s) · {item.status ?? "active"}</p></div>
          <div className="admin-actions"><button className="button button-outline" type="button" disabled={Boolean(busy)} onClick={() => void update(item.id, { action: "studio", id: item.id, suspended: item.status !== "suspended" })}>{item.status === "suspended" ? "Restore studio" : "Suspend studio"}</button></div>
        </article>)}
        {!data.studios.length && <div className="empty-state">No studio workspaces yet.</div>}
      </div>}

      {section === "Campaigns" && <div className="admin-record-list">
        {data.campaigns.filter((item) => matches(item.title, item.gameName, item.status)).map((item) => <article className="panel admin-record" key={item.id}>
          <div><h2>{item.title}</h2><p>{item.gameName} · {item.status} · {item.visibility} · Configured budget ${Number(item.totalBudget || 0).toFixed(2)}</p></div>
          <label className="admin-inline-control">Status<select className="select" value={item.status} disabled={Boolean(busy)} onChange={(event) => void update(item.id, { action: "campaign", id: item.id, status: event.target.value })}><option value="draft">Draft</option><option value="active" disabled>Active (billing required)</option><option value="paused">Paused</option><option value="completed">Completed</option></select></label>
        </article>)}
        {!data.campaigns.length && <div className="empty-state">No campaigns yet.</div>}
      </div>}

      {section === "Submissions" && <div className="admin-record-list">
        {data.submissions.filter((item) => matches(item.campaignTitle, item.creatorDiscordId, item.title, item.status)).map((item) => <article className="panel admin-record" key={item.id}>
          <div><h2>{item.title || item.campaignTitle}</h2><p>{item.platform} · {item.status} · Creator {item.creatorDiscordId}</p><a className="text-link" href={item.videoUrl} target="_blank" rel="noreferrer">Open submission ↗</a></div>
          {item.status === "pending_review" ? <div className="admin-actions"><button className="button button-primary" type="button" disabled={Boolean(busy)} onClick={() => void update(item.id, { action: "submission", id: item.id, decision: "approved" })}>Approve</button><button className="button button-outline" type="button" disabled={Boolean(busy)} onClick={() => void update(item.id, { action: "submission", id: item.id, decision: "rejected", note: "Reviewed by Alypne administration." })}>Reject</button></div> : <span className="status-pill">{item.status}</span>}
        </article>)}
        {!data.submissions.length && <div className="empty-state">No clip submissions yet.</div>}
      </div>}

      {section === "Support" && <div className="admin-record-list">{data.support.filter((ticket) => matches(ticket.targetDiscordId, ticket.category, ticket.status, ...ticket.messages.map((message) => message.body))).map((ticket) => <article className="panel admin-support-ticket" key={ticket.id}>
        <div className="panel-heading">{ticket.category} · {ticket.status.replace("_", " ")}<span>User {ticket.targetDiscordId}</span></div>
        <div className="admin-support-messages">{ticket.messages.map((message) => <div className="admin-support-message" key={message.id}><strong>{message.senderDiscordId === data.currentAdmin ? "Alypne team" : "User"}</strong><p>{message.body}</p><time>{formatDateTime(message.createdAt)}</time></div>)}</div>
        <div className="admin-actions">{(["open", "in_progress", "resolved"] as const).map((status) => <button className={`button ${ticket.status === status ? "button-primary" : "button-outline"}`} type="button" key={status} disabled={Boolean(busy) || ticket.status === status} onClick={() => void update(ticket.id, { action: "support", id: ticket.id, status })}>{status.replace("_", " ")}</button>)}</div>
        {ticket.status !== "resolved" && <form className="admin-support-reply" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const reply = new FormData(form).get("reply"); if (typeof reply === "string" && reply.trim()) { form.reset(); void update(ticket.id, { action: "support", id: ticket.id, reply }); } }}><textarea className="input" name="reply" rows={2} maxLength={2000} required placeholder="Reply to this support conversation…" /><button className="button button-primary" type="submit" disabled={Boolean(busy)}>Send reply</button></form>}
      </article>)}{!data.support.length && <div className="empty-state">No support conversations yet.</div>}</div>}

      {section === "Platform" && <div className="panel admin-status-list">{Object.entries(data.configuration).map(([name, configured]) => <div className="admin-status-row" key={name}><span>{name.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</span><strong className={configured ? "status-ok" : "status-pending"}>{configured ? "Ready" : "Not configured"}</strong></div>)}
        <p className="admin-help">To enable Stripe Connect onboarding, configure STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and STRIPE_CONNECT_COUNTRY, then subscribe the Stripe account to account.updated at /api/webhooks/stripe. Connect readiness covers onboarding only; actual transfers remain disabled until verified earnings, campaign funding, reconciliation, and settlement safeguards are implemented. Social view verification is also not configured.</p>
      </div>}

      {section === "Audit" && <div className="admin-record-list">{data.audit.map((item) => <article className="panel admin-audit-row" key={item.id}><strong>{item.action}</strong><span>{item.entityType} · {item.entityId}</span><span>by {item.actorDiscordId}</span><time>{formatDateTime(item.createdAt)}</time></article>)}{!data.audit.length && <div className="empty-state">Admin actions will appear here.</div>}</div>}
    </div>
  );
}
