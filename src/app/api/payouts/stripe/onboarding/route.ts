import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { appUrl } from "@/lib/app-url";
import { getDatabase } from "@/lib/mongodb";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getStripeClient, getStripeConnectCountry } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!user.roles.includes("creator")) return NextResponse.json({ error: "Creator access is required." }, { status: 403 });
  const country = getStripeConnectCountry();
  const configured = Boolean(process.env.STRIPE_SECRET_KEY && country && process.env.STRIPE_WEBHOOK_SECRET);
  if (!configured) return NextResponse.json({ configured: false, connected: false });

  const db = await getDatabase();
  const record = await db.collection("users").findOne(
    { discordId: user.discordId },
    { projection: { stripeConnectAccountId: 1, stripePayoutsEnabled: 1, stripeDetailsSubmitted: 1 } },
  );
  return NextResponse.json({
    configured: true,
    connected: Boolean(record?.stripeConnectAccountId),
    payoutsEnabled: record?.stripePayoutsEnabled === true,
    detailsSubmitted: record?.stripeDetailsSubmitted === true,
  });
}

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!user.roles.includes("creator")) return NextResponse.json({ error: "Creator access is required." }, { status: 403 });
  const country = getStripeConnectCountry();
  if (!country || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe Connect is not configured. Contact Alypne support." }, { status: 503 });
  }
  const limit = await enforceRateLimit(user.discordId, "stripe-connect-onboarding", 5, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Please wait before requesting another Stripe setup link." }, { status: 429 });

  try {
    const stripe = getStripeClient();
    const db = await getDatabase();
    const existing = await db.collection("users").findOne(
      { discordId: user.discordId },
      { projection: { stripeConnectAccountId: 1 } },
    );
    let accountId = typeof existing?.stripeConnectAccountId === "string" ? existing.stripeConnectAccountId : null;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country,
        capabilities: { transfers: { requested: true } },
        metadata: { discordId: user.discordId },
      }, { idempotencyKey: `alypne-connect-${user.discordId}` });
      accountId = account.id;
      await db.collection("users").updateOne(
        { discordId: user.discordId },
        { $set: { stripeConnectAccountId: accountId, updatedAt: new Date() } },
      );
    }

    const returnUrl = appUrl("/dashboard/creator/earnings?stripe=return").toString();
    const refreshUrl = appUrl("/dashboard/creator/earnings?stripe=refresh").toString();
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });
    return NextResponse.json({ url: link.url });
  } catch (error) {
    console.error("Stripe Connect onboarding could not start", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Stripe onboarding could not be started. Try again or contact support." }, { status: 503 });
  }
}
