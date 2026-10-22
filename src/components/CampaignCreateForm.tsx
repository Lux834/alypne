"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { PlatformBrandIcon } from "@/components/PlatformBrandIcon";

const stepSchemas = [
  z.object({
    title: z.string().trim().min(3, "Campaign name must be at least 3 characters.").max(100),
    gameName: z.string().trim().min(2, "Add the game name.").max(100),
    gameUrl: z.union([
      z.literal(""),
      z.string().url().refine((value) => {
        const url = new URL(value);
        return url.protocol === "https:" && ["roblox.com", "www.roblox.com"].includes(url.hostname);
      }, "Use an official HTTPS Roblox game URL."),
    ]),
  }),
  z.object({
    objective: z.string().trim().min(5, "Describe the campaign objective.").max(500),
    description: z.string().trim().min(10, "Add a creative brief.").max(4000),
    requiredContent: z.string().trim().max(2000),
    prohibitedContent: z.string().trim().max(2000),
    disclosure: z.string().trim().max(500),
  }),
  z.object({ platforms: z.array(z.string()).min(1, "Choose at least one supported platform.").max(3) }),
  z.object({
    ratePerThousand: z.coerce.number().finite().nonnegative().max(100_000),
    perClipCap: z.coerce.number().finite().nonnegative().max(1_000_000),
    totalBudget: z.coerce.number().finite().positive().max(10_000_000),
    startsAt: z.iso.date({ error: "Choose a valid campaign start date." }),
    endsAt: z.iso.date({ error: "Choose a valid campaign end date." }),
  }).refine(({ startsAt }) => startsAt >= new Date().toISOString().slice(0, 10), {
    message: "Campaign start date cannot be in the past.",
    path: ["startsAt"],
  }).refine(({ startsAt, endsAt }) => endsAt > startsAt, {
    message: "End date must be after the start date.",
    path: ["endsAt"],
  }),
];

const steps = ["Campaign basics", "Creative brief", "Platforms", "Budget & schedule"];

function dateInputValue(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function CampaignCreateForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function getStepValues(form: HTMLFormElement) {
    const data = new FormData(form);
    const values: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
    for (const key of ["title", "gameName", "gameUrl", "objective", "description", "requiredContent", "prohibitedContent", "disclosure", "ratePerThousand", "perClipCap", "totalBudget", "startsAt", "endsAt"]) {
      values[key] = data.get(key) ?? "";
    }
    values.platforms = data.getAll("platforms");
    return values;
  }

  function validateStep(form: HTMLFormElement) {
    const parsed = stepSchemas[step].safeParse(getStepValues(form));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the required fields.");
      return false;
    }
    setError("");
    return true;
  }

  function advance(form: HTMLFormElement) {
    if (!validateStep(form)) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    if (step < steps.length - 1) {
      advance(form);
      return;
    }
    if (!validateStep(form)) return;
    const validation = stepSchemas.map((schema) => schema.safeParse(getStepValues(form)));
    const invalidStep = validation.findIndex((result) => !result.success);
    if (invalidStep !== -1) {
      setStep(invalidStep);
      const result = validation[invalidStep];
      setError(result && !result.success ? result.error.issues[0]?.message ?? "Please check the required fields." : "Please check the required fields.");
      return;
    }

    const data = new FormData(form);
    const payload = {
      title: String(data.get("title") ?? ""),
      gameName: String(data.get("gameName") ?? ""),
      gameUrl: String(data.get("gameUrl") ?? ""),
      objective: String(data.get("objective") ?? ""),
      description: String(data.get("description") ?? ""),
      requiredContent: String(data.get("requiredContent") ?? ""),
      prohibitedContent: String(data.get("prohibitedContent") ?? ""),
      disclosure: String(data.get("disclosure") ?? ""),
      platforms: data.getAll("platforms").map(String),
      ratePerThousand: Number(data.get("ratePerThousand")),
      perClipCap: Number(data.get("perClipCap")),
      totalBudget: Number(data.get("totalBudget")),
      startsAt: String(data.get("startsAt") ?? ""),
      endsAt: String(data.get("endsAt") ?? ""),
    };
    setSaving(true);
    try {
      const response = await fetch("/api/studio/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "Campaign draft could not be saved.";
        throw new Error(message);
      }
      router.push("/dashboard/studio/campaigns");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Campaign draft could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel calc-form wizard-form" onSubmit={submit} noValidate style={{ maxWidth: 760 }}>
      <div className="wizard-steps" aria-label={`Step ${step + 1} of ${steps.length}`}>
        {steps.map((label, index) => <span className={index === step ? "current" : index < step ? "complete" : ""} key={label}>{index + 1}. {label}</span>)}
      </div>
      <h2 className="wizard-heading">{steps[step]}</h2>
      <div hidden={step !== 0}>
        <label>Campaign name<input className="input" name="title" required minLength={3} maxLength={100} /></label>
        <label>Roblox game<input className="input" name="gameName" required minLength={2} maxLength={100} /></label>
        <label>Official game URL<input className="input" name="gameUrl" type="url" placeholder="https://www.roblox.com/games/…" /></label>
      </div>
      <div hidden={step !== 1}>
        <label>Campaign objective<input className="input" name="objective" required minLength={5} maxLength={500} placeholder="What should this campaign achieve?" /></label>
        <label>Creator brief<textarea className="input" name="description" required minLength={10} maxLength={4000} rows={4} placeholder="Describe the content and creative direction." /></label>
        <label>Required content<textarea className="input" name="requiredContent" maxLength={2000} rows={3} /></label>
        <label>Prohibited content<textarea className="input" name="prohibitedContent" maxLength={2000} rows={3} /></label>
        <label>Required disclosures<textarea className="input" name="disclosure" maxLength={500} rows={2} /></label>
      </div>
      <fieldset className="platform-options" hidden={step !== 2}>
        <legend>Supported social platforms</legend>
        {(["TikTok", "YouTube", "Instagram"] as const).map((platform) => <label className="platform-choice" key={platform}><input type="checkbox" name="platforms" value={platform} /><PlatformBrandIcon platform={platform} />{platform}</label>)}
        <p>Platforms remain subject to official API availability and campaign-specific eligibility.</p>
      </fieldset>
      <div hidden={step !== 3}>
        <div className="wizard-grid">
          <label>Rate per 1,000 eligible views ($)<input className="input" name="ratePerThousand" type="number" min="0" step="0.01" required /></label>
          <label>Per-clip cap ($)<input className="input" name="perClipCap" type="number" min="0" step="0.01" required /></label>
          <label>Total campaign budget ($)<input className="input" name="totalBudget" type="number" min="0.01" step="0.01" required /></label>
          <label>Start date<input className="input" name="startsAt" type="date" min={dateInputValue()} defaultValue={dateInputValue()} required /></label>
          <label>End date<input className="input" name="endsAt" type="date" min={dateInputValue(1)} defaultValue={dateInputValue(7)} required /></label>
        </div>
        <p className="wizard-note">Saving creates a private draft. Publishing, funding, and creator payouts stay disabled until payment and eligibility systems are configured.</p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="wizard-actions">
        {step > 0 && <button className="button button-outline" type="button" onClick={() => { setError(""); setStep((current) => current - 1); }}>Back</button>}
        {step < steps.length - 1
          ? <button className="button button-primary" type="button" onClick={(event) => { const form = event.currentTarget.closest("form"); if (form) advance(form); }}>Continue</button>
          : <button className="button button-primary" type="submit" disabled={saving}>{saving ? "Saving draft…" : "Save private draft"}</button>}
      </div>
    </form>
  );
}
