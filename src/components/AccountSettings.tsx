"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { PlatformBrandIcon } from "@/components/PlatformBrandIcon";

const UserSchema = z.object({
  discordId: z.string(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url().nullable().optional(),
  roles: z.array(z.string()).default([]),
  preferences: z.object({
    campaignUpdates: z.boolean().optional(),
    submissionUpdates: z.boolean().optional(),
  }).optional(),
  discordProfileSyncedAt: z.string().optional(),
});
const ResponseSchema = z.object({
  user: UserSchema,
  profileSync: z.enum(["updated", "recent", "unavailable"]).optional(),
});
type AccountUser = z.infer<typeof UserSchema>;
type SettingsTab = "Account" | "Notifications" | "Connections" | "Security";

async function errorFrom(response: Response) {
  const body: unknown = await response.json();
  return typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
    ? body.error
    : "Account settings could not be loaded.";
}

export function AccountSettings() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [preferences, setPreferences] = useState({ campaignUpdates: true, submissionUpdates: true });
  const [tab, setTab] = useState<SettingsTab>("Account");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [profileSyncUnavailable, setProfileSyncUnavailable] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadUser = useCallback(async (method: "GET" | "POST" = "GET") => {
    const response = await fetch("/api/auth/me", { method, cache: "no-store" });
    if (!response.ok) throw new Error(await errorFrom(response));
    const parsed = ResponseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("The account settings response was invalid.");
    setUser(parsed.data.user);
    setProfileSyncUnavailable(parsed.data.profileSync === "unavailable");
    setDisplayName(parsed.data.user.displayName);
    setPreferences({
      campaignUpdates: parsed.data.user.preferences?.campaignUpdates ?? true,
      submissionUpdates: parsed.data.user.preferences?.submissionUpdates ?? true,
    });
    return parsed.data.profileSync;
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await errorFrom(response));
        const parsed = ResponseSchema.safeParse(await response.json());
        if (!parsed.success) throw new Error("The account settings response was invalid.");
        if (!active) return;
        setUser(parsed.data.user);
        setProfileSyncUnavailable(parsed.data.profileSync === "unavailable");
        setDisplayName(parsed.data.user.displayName);
        setPreferences({
          campaignUpdates: parsed.data.user.preferences?.campaignUpdates ?? true,
          submissionUpdates: parsed.data.user.preferences?.submissionUpdates ?? true,
        });
      })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Account settings could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      if (!response.ok) throw new Error(await errorFrom(response));
      setNotice("Profile changes saved.");
      setUser((current) => current ? { ...current, displayName: displayName.trim() } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile changes could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function savePreferences(key: "campaignUpdates" | "submissionUpdates", enabled: boolean) {
    const next = { ...preferences, [key]: enabled };
    setPreferences(next);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { [key]: enabled } }),
      });
      if (!response.ok) throw new Error(await errorFrom(response));
      setNotice("Notification preferences saved.");
    } catch (cause) {
      setPreferences((current) => ({ ...current, [key]: !enabled }));
      setError(cause instanceof Error ? cause.message : "Notification preferences could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function refreshDiscordProfile() {
    setSyncing(true);
    setError("");
    setNotice("");
    try {
      await loadUser("POST");
      setNotice("Discord profile photo and name are up to date.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Discord profile could not be refreshed.");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <div className="empty-state">Loading account settings…</div>;
  if (!user) return <div className="empty-state" role="alert"><h2>Settings unavailable</h2><p>{error || "Account information could not be loaded."}</p></div>;

  return (
    <div className="settings-layout">
      <aside className="settings-sidebar">
        <div className="settings-identity">
          {user.avatarUrl ? <Image className="settings-avatar" src={user.avatarUrl} alt="" width={48} height={48} unoptimized /> : <span className="settings-avatar settings-avatar-fallback">{user.displayName.slice(0, 1).toUpperCase()}</span>}
          <div><strong>{user.displayName}</strong><span>@{user.username}</span></div>
        </div>
        <nav className="settings-nav" aria-label="Settings sections">
          {(["Account", "Notifications", "Connections", "Security"] as const).map((item) => <button type="button" key={item} className={tab === item ? "active" : ""} onClick={() => { setTab(item); setError(""); setNotice(""); }}>{item}</button>)}
        </nav>
        <div className="settings-legal"><a href="/tos">Terms</a><a href="/privacy">Privacy</a><a href="/data-deletion">Data deletion</a></div>
      </aside>

      <div className="settings-main">
        <h2>{tab}</h2>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-success" role="status">{notice}</p>}

        {tab === "Account" && <form className="settings-content" onSubmit={saveProfile}>
          <section className="panel settings-profile-card">
            <div className="settings-profile-heading">
              {user.avatarUrl ? <Image className="settings-avatar settings-avatar-large" src={user.avatarUrl} alt="" width={72} height={72} unoptimized /> : <span className="settings-avatar settings-avatar-large settings-avatar-fallback">{user.displayName.slice(0, 1).toUpperCase()}</span>}
              <div><strong>Discord profile photo</strong><p>Your avatar and username sync from Discord when you sign in and when you open settings.</p></div>
              <button className="button button-outline" type="button" onClick={() => void refreshDiscordProfile()} disabled={syncing}>{syncing ? "Refreshing…" : "Sync now"}</button>
            </div>
            {profileSyncUnavailable && <p className="form-error" role="status">Discord profile sync needs a fresh authorization. <a className="text-link" href="/api/auth/discord">Reconnect Discord →</a></p>}
            <label className="settings-field">Display name<input className="input" value={displayName} minLength={2} maxLength={60} required onChange={(event) => setDisplayName(event.target.value)} /></label>
            <div className="settings-readonly"><span>Discord username</span><strong>@{user.username}</strong></div>
            <div className="settings-readonly"><span>Account ID</span><code>{user.discordId}</code></div>
            <p className="settings-help">Alypne keeps your profile photo in sync using an encrypted Discord refresh token. Revoke Alypne in Discord’s Authorized Apps settings to disconnect; the next profile sync removes the revoked local token.</p>
            <button className="button button-primary" type="submit" disabled={saving || displayName.trim().length < 2}>{saving ? "Saving…" : "Save profile"}</button>
          </section>
        </form>}

        {tab === "Notifications" && <section className="panel settings-content">
          <h3>In-app updates</h3>
          <p className="settings-help">Choose which account updates Alypne sends to your notification center.</p>
          <label className="settings-toggle"><span><strong>Campaign updates</strong><small>Campaign status and workspace announcements</small></span><input type="checkbox" checked={preferences.campaignUpdates} disabled={saving} onChange={(event) => void savePreferences("campaignUpdates", event.target.checked)} /></label>
          <label className="settings-toggle"><span><strong>Submission updates</strong><small>Clip review decisions and submission status</small></span><input type="checkbox" checked={preferences.submissionUpdates} disabled={saving} onChange={(event) => void savePreferences("submissionUpdates", event.target.checked)} /></label>
          <p className="settings-help">Email and push notifications are not enabled because no delivery provider is configured.</p>
        </section>}

        {tab === "Connections" && <section className="settings-content settings-connections">
          <article className="panel settings-connection"><div><span className="connection-mark discord-mark">D</span><div><strong>Discord</strong><p>Connected as @{user.username}. Used to sign in and sync your profile photo.</p></div></div><span className="status-pill">Connected</span></article>
          {(["TikTok", "YouTube", "Instagram"] as const).map((platform) => <article className="panel settings-connection" key={platform}><div><span className={`connection-mark platform-mark platform-mark-${platform.toLowerCase()}`}><PlatformBrandIcon platform={platform} /></span><div><strong>{platform}</strong><p>Social account verification is not configured yet.</p></div></div><span className="settings-unavailable">Unavailable</span></article>)}
        </section>}

        {tab === "Security" && <section className="panel settings-content">
          <h3>Sign-in and sessions</h3>
          <p className="settings-help">Your Alypne session stays active for up to 30 days on this browser. Sign out sooner from any page using the account menu.</p>
          <div className="settings-readonly"><span>Sign-in provider</span><strong>Discord OAuth</strong></div>
          <div className="settings-readonly"><span>Permissions</span><strong>Identity only</strong></div>
          <a className="text-link" href="https://discord.com/settings/authorized-apps" target="_blank" rel="noreferrer">Manage connected apps in Discord ↗</a>
        </section>}
      </div>
    </div>
  );
}
