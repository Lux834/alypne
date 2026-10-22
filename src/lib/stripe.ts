import Stripe from "stripe";

let client: Stripe | undefined;

export function isStripeConnectConfigured() {
  const country = getStripeConnectCountry();
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    country &&
    process.env.STRIPE_WEBHOOK_SECRET,
  );
}

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  client ??= new Stripe(secretKey);
  return client;
}

export function getStripeConnectCountry() {
  const country = process.env.STRIPE_CONNECT_COUNTRY?.trim().toUpperCase();
  return country && /^[A-Z]{2}$/.test(country) ? country : null;
}
