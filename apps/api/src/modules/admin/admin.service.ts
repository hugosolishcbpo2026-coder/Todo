import { Injectable } from "@nestjs/common";
import { StoreService } from "../core/store.service";

@Injectable()
export class AdminService {
  constructor(private readonly store: StoreService) {}

  liveOperations() {
    const snapshot = this.store.snapshot();
    return {
      activeRides: snapshot.activeRides,
      onlineDrivers: snapshot.onlineDrivers,
      totalDrivers: snapshot.drivers,
      totalRiders: snapshot.users,
      expiringMemberships: snapshot.expiringMemberships,
    };
  }

  analytics() {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const payments = this.store.listPayments();
    const ridePaymentsToday = payments.filter(
      (p) => p.type === "ride" && new Date(p.createdAt).getTime() >= startOfToday,
    );
    const membershipPaymentsToday = payments.filter(
      (p) => p.type === "membership" && new Date(p.createdAt).getTime() >= startOfToday,
    );
    const driverEarningsToday = ridePaymentsToday.reduce((acc, p) => acc + p.amount, 0);
    const riderAvgFare = ridePaymentsToday.length
      ? Math.round((driverEarningsToday / ridePaymentsToday.length) * 100) / 100
      : 0;

    return {
      currency: "MXN",
      rideVolumeToday: ridePaymentsToday.length,
      riderAvgFare,
      driverEarningsToday: Math.round(driverEarningsToday * 100) / 100,
      platformRideCommission: 0,
      membershipRevenueToday: Math.round(
        membershipPaymentsToday.reduce((acc, p) => acc + p.amount, 0) * 100,
      ) / 100,
    };
  }

  recentRides(limit = 20) {
    return this.store.listRides().slice(0, limit);
  }
}
