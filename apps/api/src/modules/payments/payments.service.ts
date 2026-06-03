import { Injectable, Logger } from "@nestjs/common";
import {
  MembershipPlan,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@todo/shared";
import { MembershipService } from "../membership/membership.service";
import { StoreService } from "../core/store.service";
import { StripeService } from "./stripe.service";

/**
 * Payment orchestration.
 *
 * Two distinct systems:
 *  - Driver daily/monthly membership (gates dispatch) — settled immediately in
 *    mock mode so the local ride flow works without Stripe.
 *  - Tiered Stripe subscriptions (Free/Basic/Premium/Business) — created via
 *    Checkout and confirmed by verified webhooks. Subscription state is always
 *    server-authoritative (never trust the client).
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly membership: MembershipService,
    private readonly store: StoreService,
    private readonly stripe: StripeService,
  ) {}

  private get liveMode(): boolean {
    return this.stripe.configured;
  }

  // --- Driver daily/monthly membership ------------------------------------

  createMembershipCheckout(userId: string, plan: MembershipPlan) {
    const amount = this.membership.priceFor(plan);
    // Settle immediately so the driver becomes dispatch-eligible (mock + live MVP).
    const result = this.membership.activate(userId, plan);
    return { provider: "stripe", mode: "mock", plan, amount, currency: "MXN", checkoutUrl: null, ...result };
  }

  listPayments() {
    return this.store.listPayments();
  }

  // --- Tiered Stripe subscriptions ----------------------------------------

  async startSubscriptionCheckout(userId: string, plan: SubscriptionPlan, email?: string) {
    const existing = this.store.getSubscriptionByUser(userId);
    const session = await this.stripe.createCheckoutSession({
      userId,
      plan,
      email,
      customerId: existing?.stripeCustomerId,
    });
    // In mock mode (no Stripe), activate immediately so the flow is testable.
    if (session.mode === "mock") {
      this.applySubscription({ userId, plan, status: "active" });
    }
    return { plan, ...session };
  }

  async openCustomerPortal(userId: string) {
    const sub = this.store.getSubscriptionByUser(userId);
    if (!sub?.stripeCustomerId) {
      return { mode: "mock" as const, url: "https://billing.stripe.com/mock/no-customer" };
    }
    return this.stripe.createPortalSession(sub.stripeCustomerId);
  }

  /** Server-authoritative subscription for a user (defaults to Free). */
  getSubscription(userId: string): Subscription {
    return (
      this.store.getSubscriptionByUser(userId) ?? {
        id: "none",
        userId,
        plan: "free",
        status: "none",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  }

  listSubscriptions() {
    return this.store.listSubscriptions();
  }

  /** Apply subscription state (called by checkout-mock and verified webhooks). */
  applySubscription(input: {
    userId: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: string;
  }): Subscription {
    this.logger.log(`subscription update: user=${input.userId} plan=${input.plan} status=${input.status}`);
    return this.store.upsertSubscription(input);
  }
}
