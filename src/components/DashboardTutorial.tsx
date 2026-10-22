"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

const steps = [
  { eyebrow: "YOUR DASHBOARD", title: "Your work, at a glance", body: "Use your overview to follow campaigns, submissions, and account activity. Metrics only appear when they come from real platform data." },
  { eyebrow: "WORKSPACES", title: "Switch between creator and studio", body: "Use the workspace switcher in the sidebar to find creator campaigns or manage your studio. Studio owners can invite teammates with limited permissions." },
  { eyebrow: "NEED A HAND?", title: "Alypne support is one click away", body: "Open your profile menu to adjust settings, switch workspaces, or send a private message to the Alypne team." },
];

export function DashboardTutorial({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function finish(skipped: boolean) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipped }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "Your tutorial progress could not be saved.";
        throw new Error(message);
      }
      onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your tutorial progress could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const current = steps[step];
  return <div className="tutorial-backdrop" role="presentation">
    <section className="tutorial-card" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorial-topline"><span className="eyebrow">WELCOME TO ALYPNE · {step + 1} OF {steps.length}</span><button className="icon-button" type="button" disabled={busy} onClick={() => void finish(true)} aria-label="Skip tutorial"><X size={16} /></button></div>
      <div className="tutorial-art" aria-hidden="true"><span>{String(step + 1).padStart(2, "0")}</span></div>
      <span className="eyebrow">{current.eyebrow}</span>
      <h2 id="tutorial-title">{current.title}</h2>
      <p>{current.body}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="tutorial-footer">
        <button className="button button-plain" type="button" disabled={busy} onClick={() => void finish(true)}>Skip tutorial</button>
        <div>{step > 0 && <button className="button button-outline" type="button" disabled={busy} onClick={() => setStep((currentStep) => currentStep - 1)}><ArrowLeft size={14} /> Back</button>}
          {step < steps.length - 1 ? <button className="button button-primary" type="button" onClick={() => setStep((currentStep) => currentStep + 1)}>Next <ArrowRight size={14} /></button> : <button className="button button-primary" type="button" disabled={busy} onClick={() => void finish(false)}>{busy ? "Saving…" : "Get started"}</button>}
        </div>
      </div>
    </section>
  </div>;
}
