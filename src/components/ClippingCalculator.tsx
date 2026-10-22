"use client";

import { useMemo, useState } from "react";
import { estimateCreatorEarnings, estimateStudioCampaign } from "@/lib/calculator";

function money(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

export function ClippingCalculator() {
  const [mode, setMode] = useState<"creator" | "studio">("creator");
  const [views, setViews] = useState(100_000);
  const [rate, setRate] = useState(3);
  const [fee, setFee] = useState(0);
  const [cap, setCap] = useState(500);
  const [budget, setBudget] = useState(5000);
  const [clips, setClips] = useState(10);
  const [averageViews, setAverageViews] = useState(25_000);
  const creatorEstimate = useMemo(
    () => estimateCreatorEarnings({ eligibleViews: views, ratePerThousand: rate, feePercent: fee, clipCap: cap }),
    [views, rate, fee, cap],
  );
  const studioEstimate = useMemo(
    () => estimateStudioCampaign({ budget, ratePerThousand: rate, feePercent: fee, estimatedClips: clips, averageViewsPerClip: averageViews }),
    [budget, rate, fee, clips, averageViews],
  );

  return (
    <div className="calc-grid">
      <div className="filter-row" style={{ gridColumn: "1 / -1", marginBottom: 0 }} role="group" aria-label="Calculator mode">
        <button className={`button ${mode === "creator" ? "button-primary" : "button-outline"}`} type="button" aria-pressed={mode === "creator"} onClick={() => setMode("creator")}>Creator estimate</button>
        <button className={`button ${mode === "studio" ? "button-primary" : "button-outline"}`} type="button" aria-pressed={mode === "studio"} onClick={() => setMode("studio")}>Studio estimate</button>
      </div>
      <section className="panel calc-form" aria-label="Estimate inputs">
        {mode === "creator" ? <label>Eligible views<input className="input" type="number" min="0" value={views} onChange={(event) => setViews(Math.max(0, Number(event.target.value)))} /></label> : <>
          <label>Campaign budget (USD)<input className="input" type="number" min="0" value={budget} onChange={(event) => setBudget(Math.max(0, Number(event.target.value)))} /></label>
          <label>Estimated number of clips<input className="input" type="number" min="0" value={clips} onChange={(event) => setClips(Math.max(0, Number(event.target.value)))} /></label>
          <label>Average eligible views per clip<input className="input" type="number" min="0" value={averageViews} onChange={(event) => setAverageViews(Math.max(0, Number(event.target.value)))} /></label>
        </>}
        <label>Rate per 1,000 eligible views (USD)<input className="input" type="number" min="0" step="0.01" value={rate} onChange={(event) => setRate(Math.max(0, Number(event.target.value)))} /></label>
        <label>Estimated platform fee (%)<input className="input" type="number" min="0" max="100" step="0.1" value={fee} onChange={(event) => setFee(Math.min(100, Math.max(0, Number(event.target.value))))} /></label>
        {mode === "creator" && <label>Per-clip earnings cap (USD)<input className="input" type="number" min="0" step="0.01" value={cap} onChange={(event) => setCap(Math.max(0, Number(event.target.value)))} /></label>}
      </section>
      <section className="panel calc-result" aria-live="polite">
        {mode === "creator" ? <>
          <div><span className="eyebrow">Estimated creator earnings</span><strong>{money(creatorEstimate.net)}</strong><p>This estimate is illustrative only. Actual eligible views, campaign caps, fees, and payout terms depend on the campaign and verification source.</p></div>
          <div className="result-breakdown"><span>Gross before fee</span><strong>{money(creatorEstimate.gross)}</strong><span>Estimated fee</span><strong>{money(creatorEstimate.fee)}</strong><span>Net estimate</span><strong>{money(creatorEstimate.net)}</strong></div>
        </> : <>
          <div><span className="eyebrow">Estimated campaign spend</span><strong>{money(studioEstimate.totalSpend)}</strong><p>Based on an estimated clip count and average eligible views. Results are not a commitment or guaranteed delivery.</p></div>
          <div className="result-breakdown"><span>Estimated views</span><strong>{new Intl.NumberFormat().format(studioEstimate.estimatedViews)}</strong><span>Creator spend</span><strong>{money(studioEstimate.creatorSpend)}</strong><span>Estimated fees</span><strong>{money(studioEstimate.estimatedFees)}</strong><span>Budget remaining</span><strong>{money(studioEstimate.remainingBudget)}</strong></div>
        </>}
      </section>
    </div>
  );
}
