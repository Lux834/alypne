"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { formatDate } from "@/lib/date-format";

const StudioSettingsSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  websiteUrl: z.string(),
  bannerUrl: z.string(),
  owner: z.boolean(),
});
const StudioResponseSchema = z.object({ studio: StudioSettingsSchema });
type StudioSettings = z.infer<typeof StudioSettingsSchema>;
const TeamDataSchema = z.object({
  members: z.array(z.object({ discordId: z.string(), permissions: z.array(z.string()) })),
  invites: z.array(z.object({ id: z.string(), permissions: z.array(z.string()), expiresAt: z.string() })),
});
type TeamData = z.infer<typeof TeamDataSchema>;
const teamPermissions = [
  { id: "campaigns:read", label: "View campaigns" },
  { id: "campaigns:manage", label: "Create and manage campaigns" },
  { id: "submissions:read", label: "View clip submissions" },
  { id: "submissions:review", label: "Review clip submissions" },
  { id: "analytics:read", label: "View analytics" },
] as const;
async function fetchTeamData(): Promise<TeamData> {
  const response = await fetch("/api/studios/invites", { cache: "no-store" });
  const body: unknown = await response.json();
  if (!response.ok) throw new Error("Team members and invites could not be loaded.");
  const parsed = TeamDataSchema.safeParse(body);
  if (!parsed.success) throw new Error("The team response was invalid.");
  return parsed.data;
}

export function StudioWorkspaceSettings() {
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [team, setTeam] = useState<TeamData>({ members: [], invites: [] });
  const [memberEdits, setMemberEdits] = useState<Record<string, string[]>>({});
  const [invitePermissions, setInvitePermissions] = useState<string[]>(["campaigns:read", "submissions:read"]);
  const [inviteUrl, setInviteUrl] = useState("");
  const [teamBusy, setTeamBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/studios", { cache: "no-store" })
      .then(async (response) => {
        const body: unknown = await response.json();
        if (!response.ok) {
          const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "Workspace could not be loaded.";
          throw new Error(message);
        }
        const parsed = StudioResponseSchema.safeParse(body);
        if (!parsed.success) throw new Error("The workspace response was invalid.");
        const studio = parsed.data.studio;
        if (active) {
          setSettings(studio);
          setName(studio.name);
          setDescription(studio.description);
          setWebsiteUrl(studio.websiteUrl);
          setBannerUrl(studio.bannerUrl);
        }
      })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Workspace could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!settings?.owner) return;
    let active = true;
    fetchTeamData()
      .then((data) => { if (active) setTeam(data); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Team data could not be loaded."); });
    return () => { active = false; };
  }, [settings?.owner]);

  async function createInvite() {
    setTeamBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/studios/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: invitePermissions }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "Invite could not be created.";
        throw new Error(message);
      }
      if (typeof body !== "object" || body === null || !("inviteUrl" in body) || typeof body.inviteUrl !== "string") {
        throw new Error("The invite response was invalid.");
      }
      setInviteUrl(body.inviteUrl);
      setNotice("Invite link created. It expires in 7 days and can be used once.");
      setTeam(await fetchTeamData());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invite could not be created.");
    } finally {
      setTeamBusy(false);
    }
  }

  async function revokeInvite(id: string) {
    setTeamBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/studios/invites?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "Invite could not be revoked.";
        throw new Error(message);
      }
      setTeam((current) => ({ ...current, invites: current.invites.filter((invite) => invite.id !== id) }));
      setNotice("Invite revoked.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invite could not be revoked.");
    } finally {
      setTeamBusy(false);
    }
  }

  async function saveMemberPermissions(discordId: string) {
    const permissions = memberEdits[discordId] ?? [];
    setTeamBusy(true);
    setError("");
    try {
      const response = await fetch("/api/studios/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordId, permissions }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "Member permissions could not be saved.";
        throw new Error(message);
      }
      setTeam((current) => ({ ...current, members: current.members.map((member) => member.discordId === discordId ? { ...member, permissions } : member) }));
      setMemberEdits((current) => { const next = { ...current }; delete next[discordId]; return next; });
      setNotice("Member permissions updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Member permissions could not be saved.");
    } finally {
      setTeamBusy(false);
    }
  }

  async function removeMember(discordId: string) {
    setTeamBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/studios/members?discordId=${encodeURIComponent(discordId)}`, { method: "DELETE" });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "Member could not be removed.";
        throw new Error(message);
      }
      setTeam((current) => ({ ...current, members: current.members.filter((member) => member.discordId !== discordId) }));
      setMemberEdits((current) => { const next = { ...current }; delete next[discordId]; return next; });
      setNotice("Member removed from the workspace.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Member could not be removed.");
    } finally {
      setTeamBusy(false);
    }
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setNotice("Invite link copied.");
    } catch {
      setError("Could not access the clipboard. Select and copy the invite link from the field.");
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/studios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, websiteUrl, bannerUrl }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string" ? body.error : "Workspace settings could not be saved.";
        throw new Error(message);
      }
      setSettings((current) => current ? { ...current, name: name.trim(), description: description.trim(), websiteUrl, bannerUrl } : current);
      setNotice("Workspace branding saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workspace settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="empty-state">Loading workspace settings…</div>;
  if (!settings) return <div className="empty-state" role="alert"><h2>Workspace unavailable</h2><p>{error || "Create a studio workspace to manage its settings."}</p></div>;

  return (
    <div className="studio-settings-layout">
      <aside className="settings-sidebar">
        <div className="settings-identity"><span className="studio-avatar">{settings.name.slice(0, 1).toUpperCase()}</span><div><strong>{settings.name}</strong><span>{settings.owner ? "Workspace owner" : "Studio member"}</span></div></div>
        <div className="settings-nav" aria-label="Studio settings"><span className="active">Workspace</span><span>Branding</span></div>
        <div className="settings-legal"><a href="/tos">Terms</a><a href="/privacy">Privacy</a></div>
      </aside>
      <form className="settings-main settings-content" onSubmit={save}>
        <h2>Workspace</h2>
        <section className="panel">
          <h3>Workspace banner</h3>
          <p className="settings-help">Add a wide image to personalize the top of your studio dashboard. Use a public HTTPS image URL.</p>
          <div className="studio-banner-preview" style={bannerUrl ? { backgroundImage: `linear-gradient(90deg, rgba(7, 8, 9, .9), rgba(7, 8, 9, .18)), url(${JSON.stringify(bannerUrl)})` } : undefined}>
            <div><span>STUDIO WORKSPACE</span><strong>{name.trim() || "Your studio"}</strong><small>{description.trim() || "Campaigns and creator collaboration"}</small></div>
          </div>
          <label className="settings-field">Studio name<input className="input" value={name} minLength={2} maxLength={80} required disabled={!settings.owner} onChange={(event) => setName(event.target.value)} /></label>
          <label className="settings-field">About your studio<textarea className="input" rows={3} maxLength={500} value={description} disabled={!settings.owner} onChange={(event) => setDescription(event.target.value)} /></label>
          <label className="settings-field">Website <span className="settings-field-optional">Optional · public HTTPS URL</span><input className="input" type="url" value={websiteUrl} disabled={!settings.owner} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://yourstudio.com" /></label>
          <label className="settings-field">Banner image URL<input className="input" type="url" placeholder="https://example.com/your-workspace-banner.jpg" value={bannerUrl} disabled={!settings.owner} onChange={(event) => setBannerUrl(event.target.value)} /></label>
          <p className="settings-help">Alypne stores the banner URL, not the image file. Use an image host you trust; a dedicated image-upload provider is not configured.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-success" role="status">{notice}</p>}
          {settings.owner ? <button className="button button-primary" type="submit" disabled={saving || name.trim().length < 2}>{saving ? "Saving…" : "Save workspace"}</button> : <p className="settings-help">Ask the workspace owner to edit branding.</p>}
        </section>
        {settings.owner && <section className="panel team-management">
          <h3>Workspace team</h3>
          <p className="settings-help">Invite teammates with only the access they need. Links expire after 7 days and work once.</p>
          <div className="team-permission-grid">
            {teamPermissions.map(({ id, label }) => <label key={id} className="team-permission"><input type="checkbox" checked={invitePermissions.includes(id)} onChange={(event) => setInvitePermissions((current) => event.target.checked ? [...current, id] : current.filter((permission) => permission !== id))} /><span>{label}</span></label>)}
          </div>
          <button className="button button-primary" type="button" disabled={teamBusy || invitePermissions.length === 0} onClick={() => void createInvite()}>{teamBusy ? "Working…" : "Create invite link"}</button>
          {inviteUrl && <div className="settings-field">New invite link<div className="invite-link-row"><input className="input" readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} /><button className="button button-outline" type="button" onClick={() => void copyInviteLink()}>Copy link</button></div></div>}
          {team.members.length > 0 && <div className="team-list"><h4>Members</h4>{team.members.map((member) => {
            const permissions = memberEdits[member.discordId] ?? member.permissions;
            return <article className="team-member-card" key={member.discordId}>
              <div className="team-row"><span>{member.discordId}</span><button className="button button-plain" type="button" disabled={teamBusy} onClick={() => void removeMember(member.discordId)}>Remove member</button></div>
              <div className="team-permission-grid">{teamPermissions.map(({ id, label }) => <label key={id} className="team-permission"><input type="checkbox" checked={permissions.includes(id)} onChange={(event) => setMemberEdits((current) => ({ ...current, [member.discordId]: event.target.checked ? [...permissions, id] : permissions.filter((permission) => permission !== id) }))} /><span>{label}</span></label>)}</div>
              <button className="button button-outline" type="button" disabled={teamBusy || !memberEdits[member.discordId]} onClick={() => void saveMemberPermissions(member.discordId)}>Save member access</button>
            </article>;
          })}</div>}
          {team.invites.length > 0 && <div className="team-list"><h4>Active invites</h4>{team.invites.map((invite) => <div className="team-row" key={invite.id}><span>Expires {formatDate(invite.expiresAt)}</span><button className="button button-plain" type="button" disabled={teamBusy} onClick={() => void revokeInvite(invite.id)}>Revoke</button></div>)}</div>}
        </section>}
      </form>
    </div>
  );
}
