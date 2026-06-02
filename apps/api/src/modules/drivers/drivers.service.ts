import { Injectable } from "@nestjs/common";
import { DAILY_MEMBERSHIP_MXN, MONTHLY_MEMBERSHIP_MXN } from "@todo/shared";

@Injectable()
export class DriversService {
  createOnboarding(dto: unknown) {
    return { status: "pending_review", received: dto };
  }

  setOnline(online: boolean) {
    return {
      driverId: "drv_dev",
      online,
      eligibleForRides: online,
      membershipRequired: DAILY_MEMBERSHIP_MXN
    };
  }

  updateLocation(location: { lat: number; lng: number }) {
    return { driverId: "drv_dev", location, accepted: true };
  }

  getEarnings() {
    return {
      currency: "MXN",
      today: 1240,
      week: 7820,
      platformCommission: 0,
      membership: {
        daily: DAILY_MEMBERSHIP_MXN,
        monthly: MONTHLY_MEMBERSHIP_MXN,
        status: "active"
      }
    };
  }
}

