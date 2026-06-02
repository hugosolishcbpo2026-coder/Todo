import { Injectable } from "@nestjs/common";
import { DAILY_MEMBERSHIP_MXN, MONTHLY_MEMBERSHIP_MXN } from "@todo/shared";

@Injectable()
export class PaymentsService {
  createMembershipCheckout(plan: "daily" | "monthly") {
    const amount = plan === "daily" ? DAILY_MEMBERSHIP_MXN : MONTHLY_MEMBERSHIP_MXN;
    return {
      provider: "stripe",
      mode: process.env.STRIPE_SECRET_KEY ? "checkout" : "mock",
      plan,
      amount,
      currency: "MXN",
      checkoutUrl: process.env.STRIPE_SECRET_KEY ? "https://checkout.stripe.com/..." : null
    };
  }
}

