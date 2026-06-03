/**
 * Tiered Stripe subscription plans (distinct from the driver daily-membership
 * that gates dispatch). Subscription state is always server-authoritative —
 * never trust a client-reported plan/status.
 */
export type SubscriptionPlan = "free" | "basic" | "premium" | "business";

export type SubscriptionStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export interface PlanDefinition {
  id: SubscriptionPlan;
  name: string;
  /** Display price in MXN per month (0 for Free). */
  priceMxn: number;
  interval: "month" | null;
  /** Env var holding the Stripe Price ID for paid plans. */
  stripePriceEnv?: string;
  features: string[];
}

export const PLAN_CATALOG: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    priceMxn: 0,
    interval: null,
    features: ["Standard ride requests", "WhatsApp support"],
  },
  {
    id: "basic",
    name: "Basic",
    priceMxn: 199,
    interval: "month",
    stripePriceEnv: "STRIPE_PRICE_BASIC",
    features: ["Priority dispatch", "Ride history", "WhatsApp support"],
  },
  {
    id: "premium",
    name: "Premium",
    priceMxn: 499,
    interval: "month",
    stripePriceEnv: "STRIPE_PRICE_PREMIUM",
    features: ["Top-priority dispatch", "Discounted fares", "Priority support"],
  },
  {
    id: "business",
    name: "Business / Fleet",
    priceMxn: 1499,
    interval: "month",
    stripePriceEnv: "STRIPE_PRICE_BUSINESS",
    features: ["Multiple drivers", "Centralized billing", "Fleet analytics", "Dedicated support"],
  },
];

export function getPlan(plan: SubscriptionPlan): PlanDefinition | undefined {
  return PLAN_CATALOG.find((p) => p.id === plan);
}

export const PAID_PLANS: SubscriptionPlan[] = ["basic", "premium", "business"];

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  /** ISO timestamp the current paid period ends. */
  currentPeriodEnd?: string;
  createdAt: string;
  updatedAt: string;
}
