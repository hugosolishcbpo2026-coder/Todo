import { Injectable } from "@nestjs/common";

@Injectable()
export class AdminService {
  liveOperations() {
    return {
      activeRides: 18,
      onlineDrivers: 73,
      expiringMemberships: 9,
      fraudAlerts: 2,
      supportTickets: 6
    };
  }

  analytics() {
    return {
      currency: "MXN",
      rideVolumeToday: 312,
      riderAvgFare: 96.5,
      driverEarningsToday: 30108,
      platformRideCommission: 0,
      membershipRevenueToday: 7300
    };
  }
}

