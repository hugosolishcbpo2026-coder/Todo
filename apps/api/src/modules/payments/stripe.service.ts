import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import Stripe from "stripe";
import { getPlan, SubscriptionPlan } from "@todo/shared";

/**
 * Thin wrapper around the Stripe SDK. Runs in mock mode when STRIPE_SECRET_KEY
 * is absent so local development needs no Stripe account; all webhook signature
 * verification is delegated to the SDK's battle-tested `constructEvent`.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private client?: Stripe;

  get configured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }

  /** Lazily-created Stripe client (host overridable for tests via STRIPE_API_BASE). */
  private get stripe(): Stripe {
    if (!this.client) {
      const apiBase = process.env.STRIPE_API_BASE;
      this.client = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        ...(apiBase
          ? { host: new URL(apiBase).hostname, protocol: new URL(apiBase).protocol.replace(":", "") as "http" | "https", port: Number(new URL(apiBase).port) || undefined }
          : {}),
      });
    }
    return this.client;
  }

  private priceIdFor(plan: SubscriptionPlan): string {
    const def = getPlan(plan);
    if (!def?.stripePriceEnv) throw new BadRequestException(`Plan ${plan} is not purchasable`);
    const priceId = process.env[def.stripePriceEnv];
    if (!priceId) throw new BadRequestException(`Missing price id for plan ${plan} (${def.stripePriceEnv})`);
    return priceId;
  }

  /** Create a subscription Checkout Session, or a deterministic mock when unconfigured. */
  async createCheckoutSession(input: {
    userId: string;
    plan: SubscriptionPlan;
    email?: string;
    customerId?: string;
  }): Promise<{ mode: "mock" | "live"; url: string | null; sessionId?: string }> {
    if (!this.configured) {
      return { mode: "mock", url: `https://checkout.stripe.com/mock/${input.plan}/${input.userId}` };
    }
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: this.priceIdFor(input.plan), quantity: 1 }],
      ...(input.customerId ? { customer: input.customerId } : { customer_email: input.email }),
      client_reference_id: input.userId,
      metadata: { userId: input.userId, plan: input.plan },
      subscription_data: { metadata: { userId: input.userId, plan: input.plan } },
      success_url: process.env.STRIPE_CHECKOUT_SUCCESS_URL ?? "https://todo.local/billing/success",
      cancel_url: process.env.STRIPE_CHECKOUT_CANCEL_URL ?? "https://todo.local/billing/cancel",
    });
    return { mode: "live", url: session.url, sessionId: session.id };
  }

  /** Create a Billing Portal session so customers can manage/cancel. */
  async createPortalSession(customerId: string): Promise<{ mode: "mock" | "live"; url: string }> {
    if (!this.configured) {
      return { mode: "mock", url: `https://billing.stripe.com/mock/${customerId}` };
    }
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.STRIPE_PORTAL_RETURN_URL ?? "https://todo.local/billing",
    });
    return { mode: "live", url: session.url };
  }

  /** Verify and parse a webhook payload using the Stripe signature. Throws on failure. */
  constructEvent(payload: Buffer | string, signature: string): Stripe.Event {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new BadRequestException("STRIPE_WEBHOOK_SECRET not configured");
    return this.stripeForWebhooks.webhooks.constructEvent(payload, signature, secret);
  }

  /** A Stripe instance is required for the crypto helpers even without a live key. */
  private get stripeForWebhooks(): Stripe {
    return this.configured ? this.stripe : new Stripe("sk_test_placeholder_for_webhook_crypto");
  }
}
