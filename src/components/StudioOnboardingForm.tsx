"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StudioOnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/studios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, websiteUrl, bannerUrl }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "The studio could not be created.";
        throw new Error(message);
      }
      router.push("/dashboard/studio");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The studio could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel studio-onboarding-form" onSubmit={submit}>
      <div className="studio-setup-intro"><span className="eyebrow">STUDIO SETUP · 1 OF 1</span><h2>Make this workspace yours</h2><p>Set up your studio profile. You can change the details and banner later in workspace settings.</p></div>
      <div className="studio-banner-preview" style={bannerUrl ? { backgroundImage: `linear-gradient(90deg, rgba(7, 8, 9, .9), rgba(7, 8, 9, .2)), url(${JSON.stringify(bannerUrl)})` } : undefined}>
        <div><span>YOUR STUDIO</span><strong>{name.trim() || "Studio name"}</strong><small>{description.trim() || "Your studio workspace preview"}</small></div>
      </div>
      <label className="settings-field">Studio name<input className="input" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your studio or brand name" /></label>
      <label className="settings-field">About your studio<textarea className="input" rows={3} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell creators what your studio makes." /></label>
      <label className="settings-field">Website <span className="settings-field-optional">Optional · public HTTPS URL</span><input className="input" type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://yourstudio.com" /></label>
      <label className="settings-field">Workspace banner <span className="settings-field-optional">Optional · public HTTPS image URL</span><input className="input" type="url" value={bannerUrl} onChange={(event) => setBannerUrl(event.target.value)} placeholder="https://images.example.com/studio-banner.jpg" /></label>
      <p className="settings-help">Your Discord account becomes the studio owner. Banner images are linked from a public HTTPS host; Alypne does not upload or copy image files.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={saving || name.trim().length < 2}>{saving ? "Creating…" : "Create studio workspace"}</button>
    </form>
  );
}
