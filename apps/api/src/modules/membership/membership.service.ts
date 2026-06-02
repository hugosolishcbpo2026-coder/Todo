import { Injectable, NotFoundException } from "@nestjs/common";
import {
  DAILY_MEMBERSHIP_MXN,
  MembershipPlan,
  MONTHLY_MEMBERSHIP_MXN,
} from "@todo/shared";
import { StoreService } from "../core/store.service";

export const MEMBERSHIP_PRICES: Record<MembershipPlan, number> = {
  daily: DAILY_MEMBERSHIP_MXN,
  monthly: MONTHLY_MEMBERSHIP_MXN,
};

/**
 * Membership is the platform's only revenue stream (no ride commission).
 * Activation extends the driver's paid period and records a membership
 * payment + ledger entry through the shared store.
 */
@Injectable()
export class MembershipService {
  constructor(private readonly store: StoreService) {}

  priceFor(plan: MembershipPlan): number {
    return MEMBERSHIP_PRICES[plan];
  }

  /** Activate/extend membership for the authenticated driver user. */
  activate(userId: string, plan: MembershipPlan) {
    const driver = this.store.getDriverByUserId(userId);
    if (!driver) {
      throw new NotFoundException("Driver profile not found. Complete onboarding first.");
    }
    const amount = this.priceFor(plan);
    const membership = this.store.activateMembership(driver.id, plan);
    const payment = this.store.createPayment({
      type: "membership",
      status: "succeeded",
      amount,
      currency: "MXN",
      driverId: driver.id,
      plan,
    });
    this.store.addLedgerEntry({ driverId: driver.id, type: "membership_fee", amount: -amount });
    return { membership, payment, eligibleForRides: driver.online };
  }

  status(userId: string) {
    const driver = this.store.getDriverByUserId(userId);
    if (!driver) {
      throw new NotFoundException("Driver profile not found. Complete onboarding first.");
    }
    const membership = this.store.getMembership(driver.id);
    return {
      active: this.store.isMembershipActive(driver.id),
      membership: membership ?? null,
      prices: MEMBERSHIP_PRICES,
    };
  }
}
