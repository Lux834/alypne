"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { formatDateTime } from "@/lib/date-format";

const DeveloperOverviewSchema = z.object({
  permissions: z.array(z.string()),
  configuration: z.record(z.string(), z.boolean()),
  metrics: z.record(z.string(), z.number()),
  users: z.array(z.object({ discordId: z.string(), username: z.string(), displayName: z.string(), roles: z.array(z.string()), disabled: z.boolean().optional() })),
  studios: z.array(z.object({ id: z.string(), name: z.string(), ownerDiscordId: z.string(), status: z.string().optional() })),
  campaigns: z.array(z.object({ id: z.string(), title: z.string(), gameName: z.string(), status: z.enum(["draft", "active", "paused", "completed"]), visibility: z.string(), totalBudget: z.number() })),
  submissions: z.array(z.object({ id: z.string(), title: z.string().optional(), campaignTitle: z.string(), creatorDiscordId: z.string(), platform: z.string(), videoUrl: z.string(), status: z.string(), submittedAt: z.union([z.string(), z.date()]) })),
  support: z.array(z.object({
    id: z.string(),
    targetDiscordId: z.string(),
    category: z.string(),
    status: z.enum(["open", "in_progress", "resolved"]),
    messages: z.array(z.object({ id: z.string(), senderDiscordId: z.string(), body: z.string(), createdAt: z.union([z.string(), z.date()]) })),
  })),
  generatedAt: z.string(),
});
type DeveloperOverview = z.infer<typeof DeveloperOverviewSchema>;

async function fetchDeveloperOverview(): Promise<DeveloperOverview> {
  const response = await fetch("/api/developer/overview", { cache: "no-store" });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "Developer data could not be loaded.";
    throw new Error(message);
  }
  const parsed = DeveloperOverviewSchema.safeParse(body);
  if (!parsed.success) throw new Error("The developer overview response was invalid.");
  return parsed.data;
}

export function DeveloperConsole() {
  const [data, setData] = useState<DeveloperOverview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  async function load() {
    setError("");
    try {
      setData(await fetchDeveloperOverview());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Developer data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(id: string, action: Record<string, unknown>) {
    setBusy(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "This developer action could not be completed.";
        throw new Error(message);
      }
      setNotice("Change saved.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This developer action could not be completed.");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    let active = true;
    fetchDeveloperOverview()
      .then((overview) => { if (active) setData(overview); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Developer data could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="empty-state">Loading developer console…</div>;
  if (!data) return <div className="empty-state" role="alert"><h2>Developer console unavailable</h2><p>{error}</p><button className="button button-outline" onClick={() => { setLoading(true); void load(); }}>Try again</button></div>;

  const can = (permission: string) => data.permissions.includes(permission);
  return <div className="developer-console">
    <div className="developer-readonly-banner"><strong>Scoped developer access</strong><span>Only the capabilities listed below are available to this account.</span></div>
    <div className="metric-grid">{Object.entries(data.metrics).map(([label, value]) => <article className="metric-card" key={label}><div className="metric-label">{label.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</div><div className="metric-value">{value}</div><div className="metric-detail">Aggregate count only</div></article>)}</div>
    <div className="developer-panels">
      <section className="panel"><div className="panel-heading">Service readiness <span>Configuration status only</span></div>{Object.entries(data.configuration).map(([name, configured]) => <div className="admin-status-row" key={name}><span>{name.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</span><strong className={configured ? "status-ok" : "status-pending"}>{configured ? "Ready" : "Not configured"}</strong></div>)}</section>
      <section className="panel"><div className="panel-heading">Developer permissions <span>Current scope</span></div>{data.permissions.map((permission) => <div className="developer-permission" key={permission}>✓ {permission.replace(":", " · ").replaceAll("_", " ")}</div>)}{!data.permissions.length && <p className="admin-help">No developer permissions are currently assigned. Ask the platform administrator for a specific access scope.</p>}<p className="admin-help">Each granted operation is permission-checked by the API and recorded in the audit log.</p></section>
    </div>
    {can("users:manage") && <section className="panel developer-operation"><div className="panel-heading">User access <span>{data.users.length} recent accounts</span></div>{data.users.map((item) => <article className="developer-operation-row" key={item.discordId}><div><strong>{item.displayName} <span>@{item.username}</span></strong><small>{item.discordId} · {item.roles.join(", ") || "no role"}</small></div><button className={`button ${item.disabled ? "button-primary" : "button-outline"}`} type="button" disabled={Boolean(busy)} onClick={() => void runAction(item.discordId, { action: "user", discordId: item.discordId, creator: item.roles.includes("creator"), suspended: !item.disabled })}>{item.disabled ? "Restore" : "Suspend"}</button></article>)}</section>}
    {can("studios:manage") && <section className="panel developer-operation"><div className="panel-heading">Studio workspaces <span>{data.studios.length} recent</span></div>{data.studios.map((item) => <article className="developer-operation-row" key={item.id}><div><strong>{item.name}</strong><small>Owner {item.ownerDiscordId} · {item.status ?? "active"}</small></div><button className="button button-outline" type="button" disabled={Boolean(busy)} onClick={() => void runAction(item.id, { action: "studio", id: item.id, suspended: item.status !== "suspended" })}>{item.status === "suspended" ? "Restore" : "Suspend"}</button></article>)}</section>}
    {can("campaigns:manage") && <section className="panel developer-operation"><div className="panel-heading">Campaign status <span>{data.campaigns.length} recent</span></div>{data.campaigns.map((item) => <article className="developer-operation-row" key={item.id}><div><strong>{item.title}</strong><small>{item.gameName} · {item.status}</small></div><select className="select" value={item.status} disabled={Boolean(busy)} onChange={(event) => void runAction(item.id, { action: "campaign", id: item.id, status: event.target.value })}><option value="draft">Draft</option><option value="active" disabled>Active (funding required)</option><option value="paused">Paused</option><option value="completed">Completed</option></select></article>)}</section>}
    {can("submissions:review") && <section className="panel developer-operation"><div className="panel-heading">Pending submissions <span>{data.submissions.length} to review</span></div>{data.submissions.map((item) => <article className="developer-operation-row" key={item.id}><div><strong>{item.title || item.campaignTitle}</strong><small>{item.platform} · Creator {item.creatorDiscordId}</small><a className="text-link" href={item.videoUrl} target="_blank" rel="noreferrer">Open video ↗</a></div><div className="admin-actions"><button className="button button-primary" type="button" disabled={Boolean(busy)} onClick={() => void runAction(item.id, { action: "submission", id: item.id, decision: "approved" })}>Approve</button><button className="button button-outline" type="button" disabled={Boolean(busy)} onClick={() => void runAction(item.id, { action: "submission", id: item.id, decision: "rejected", note: "Reviewed by platform developer." })}>Reject</button></div></article>)}</section>}
    {can("support:manage") && <section className="developer-support-list"><div className="panel-heading">Open support conversations <span>{data.support.length}</span></div>{data.support.map((ticket) => <article className="panel developer-operation" key={ticket.id}><div className="panel-heading">{ticket.category} · {ticket.status.replace("_", " ")}<span>{ticket.targetDiscordId}</span></div>{ticket.messages.map((message) => <div className="admin-support-message" key={message.id}><strong>{message.senderDiscordId === ticket.targetDiscordId ? "User" : "Alypne team"}</strong><p>{message.body}</p><time>{formatDateTime(message.createdAt)}</time></div>)}<div className="admin-actions">{(["open", "in_progress", "resolved"] as const).map((status) => <button className={`button ${ticket.status === status ? "button-primary" : "button-outline"}`} type="button" key={status} disabled={Boolean(busy) || ticket.status === status} onClick={() => void runAction(ticket.id, { action: "support", id: ticket.id, status })}>{status.replace("_", " ")}</button>)}</div>{ticket.status !== "resolved" && <form className="admin-support-reply" onSubmit={(event) => { event.preventDefault(); const reply = replyDrafts[ticket.id]?.trim(); if (reply) { void runAction(ticket.id, { action: "support", id: ticket.id, reply }); setReplyDrafts((current) => ({ ...current, [ticket.id]: "" })); } }}><textarea className="input" rows={2} maxLength={2000} value={replyDrafts[ticket.id] ?? ""} onChange={(event) => setReplyDrafts((current) => ({ ...current, [ticket.id]: event.target.value }))} placeholder="Reply to this conversation…" /><button className="button button-primary" type="submit" disabled={Boolean(busy) || !replyDrafts[ticket.id]?.trim()}>Send reply</button></form>}</article>)}</section>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="form-success" role="status">{notice}</p>}
    <p className="developer-updated">Last checked {formatDateTime(data.generatedAt)} <button className="button button-plain" type="button" onClick={() => void load()}>Refresh</button></p>
  </div>;
}
