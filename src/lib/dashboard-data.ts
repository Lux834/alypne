import { getDatabase } from "@/lib/mongodb";

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
};

export async function getCreatorDashboardMetrics(discordId: string): Promise<DashboardMetric[]> {
  const db = await getDatabase();
  const [submitted, pending, approved, wallet] = await Promise.all([
    db.collection("submissions").countDocuments({ creatorDiscordId: discordId }),
    db.collection("submissions").countDocuments({ creatorDiscordId: discordId, status: "pending_review" }),
    db.collection("submissions").countDocuments({ creatorDiscordId: discordId, status: "approved" }),
    db.collection("ledger_entries").aggregate<{ _id: string; amountCents: number }>([
      { $match: { creatorDiscordId: discordId, status: "available" } },
      { $group: { _id: "$currency", amountCents: { $sum: "$amountCents" } } },
      { $limit: 2 },
    ]).toArray(),
  ]);

  const earnings = wallet.length === 1
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: wallet[0]._id }).format(wallet[0].amountCents / 100)
    : wallet.length > 1 ? "Multiple" : "—";

  return [
    { label: "Eligible views", value: "—", detail: "Verification unavailable" },
    { label: "Pending review", value: String(pending), detail: "Clips awaiting review" },
    { label: "Available earnings", value: earnings, detail: "Verified ledger only" },
    { label: "Approved clips", value: String(approved), detail: `${submitted} total submissions` },
  ];
}

export async function getStudioDashboardMetrics(studioId: string): Promise<DashboardMetric[]> {
  const db = await getDatabase();
  const [active, pending, campaignCount, totalBudgetCents] = await Promise.all([
    db.collection("campaigns").countDocuments({ studioId, status: "active" }),
    db.collection("submissions").countDocuments({ studioId, status: "pending_review" }),
    db.collection("campaigns").countDocuments({ studioId }),
    db.collection("campaigns").aggregate<{ _id: null; cents: number }>([
      { $match: { studioId } },
      { $group: { _id: null, cents: { $sum: { $multiply: ["$totalBudget", 100] } } } },
    ]).toArray(),
  ]);
  const campaignBudget = totalBudgetCents[0]?.cents;

  return [
    { label: "Active campaigns", value: String(active), detail: `${campaignCount} campaigns total` },
    { label: "Pending reviews", value: String(pending), detail: "Clips awaiting review" },
    { label: "Campaign budget", value: Number.isFinite(campaignBudget) ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format((campaignBudget ?? 0) / 100) : "—", detail: "Configured budget, not spend" },
    { label: "Eligible views", value: "—", detail: "Verification unavailable" },
  ];
}
