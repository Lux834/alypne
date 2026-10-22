import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 400 });

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const discordId = account.metadata?.discordId;
    if (discordId && /^\d{17,20}$/.test(discordId)) {
      const db = await getDatabase();
      await db.collection("users").updateOne(
        { discordId, stripeConnectAccountId: account.id },
        { $set: {
          stripePayoutsEnabled: account.payouts_enabled === true,
          stripeDetailsSubmitted: account.details_submitted === true,
          stripeConnectUpdatedAt: new Date(),
        } },
      );
    }
  }
  return NextResponse.json({ received: true });
}
