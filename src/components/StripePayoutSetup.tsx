"use client";

import { useEffect, useState } from "react";
import { z } from "zod";

const PayoutStatusSchema = z.object({
  configured: z.boolean(),
  connected: z.boolean(),
  payoutsEnabled: z.boolean().optional().default(false),
  detailsSubmitted: z.boolean().optional().default(false),
});
type PayoutStatus = z.infer<typeof PayoutStatusSchema>;

export function StripePayoutSetup() {
  const [status, setStatus] = useState<PayoutStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/payouts/stripe/onboarding", { cache: "no-store" })
      .then(async (response) => {
        const body: unknown = await response.json();
        if (!response.ok) throw new Error("Stripe payout status could not be loaded.");
        const parsed = PayoutStatusSchema.safeParse(body);
        if (!parsed.success) throw new Error("The payout status response was invalid.");
        if (active) setStatus(parsed.data);
      })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Stripe payout status could not be loaded."); });
    return () => { active = false; };
  }, []);

  async function connect() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/payouts/stripe/onboarding", { method: "POST" });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
          ? body.error
          : "Stripe onboarding could not be started.";
        throw new Error(message);
      }
      if (typeof body !== "object" || body === null || !("url" in body) || typeof body.url !== "string") {
        throw new Error("Stripe returned an invalid onboarding link.");
      }
      window.location.assign(body.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Stripe onboarding could not be started.");
      setBusy(false);
    }
  }

  return <section className="panel stripe-payout-card">
    <div><span className="eyebrow">CREATOR PAYOUTS</span><h2>Stripe Connect</h2><p>Securely connect a Stripe Express account to receive payouts when eligible earnings become available.</p></div>
    {status?.connected && <span className="status-pill">{status.payoutsEnabled ? "Payouts enabled" : status.detailsSubmitted ? "Review in progress" : "Finish setup"}</span>}
    {!status?.configured
      ? <p className="settings-help">Stripe Connect is not configured yet. Alypne must add its Stripe keys, country, and webhook before creators can connect accounts.</p>
      : <button className="button button-primary" type="button" disabled={busy} onClick={() => void connect()}>{busy ? "Opening Stripe…" : status?.connected ? "Continue Stripe setup" : "Connect Stripe account"}</button>}
    <p className="settings-help">Connecting Stripe does not create a balance or guarantee payment. Payouts require approved, verified earnings and funded platform balance.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
