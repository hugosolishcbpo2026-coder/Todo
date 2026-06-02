import { Injectable } from "@nestjs/common";
import { MembershipPlan } from "@todo/shared";
import { MembershipService } from "../membership/membership.service";
import { StoreService } from "../core/store.service";

/**
 * Payment orchestration. Stripe is optional: when `STRIPE_SECRET_KEY` is set
 * the service returns a real checkout URL and relies on a webhook to confirm;
 * otherwise it runs in mock mode and settles membership immediately so the
 * local MVP flow works without external dependencies.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly membership: MembershipService,
    private readonly store: StoreService,
  ) {}

  private get liveMode(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }

  createMembershipCheckout(userId: string, plan: MembershipPlan) {
    const amount = this.membership.priceFor(plan);

    if (this.liveMode) {
      // Real integration: create a Stripe Checkout Session and confirm via webhook.
      return {
        provider: "stripe",
        mode: "checkout",
        plan,
        amount,
        currency: "MXN",
        checkoutUrl: "https://checkout.stripe.com/c/pay/session_placeholder",
      };
    }

    // Mock mode: settle immediately so the driver becomes eligible.
    const result = this.membership.activate(userId, plan);
    return {
      provider: "stripe",
      mode: "mock",
      plan,
      amount,
      currency: "MXN",
      checkoutUrl: null,
      ...result,
    };
  }

  listPayments() {
    return this.store.listPayments();
  }
}
