import { Injectable, NotFoundException } from "@nestjs/common";
import { DAILY_MEMBERSHIP_MXN, Driver, MONTHLY_MEMBERSHIP_MXN } from "@todo/shared";
import { StoreService } from "../core/store.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { OnboardingDto, UpdateLocationDto } from "./drivers.dto";

@Injectable()
export class DriversService {
  constructor(
    private readonly store: StoreService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** Resolve the driver profile for an authenticated driver user. */
  private requireDriver(userId: string): Driver {
    const driver = this.store.getDriverByUserId(userId);
    if (!driver) {
      throw new NotFoundException("Driver profile not found. Complete onboarding first.");
    }
    return driver;
  }

  createOnboarding(userId: string, dto: OnboardingDto) {
    const driver = this.store.createDriver(userId, dto.vehicle);
    return { driver, membershipRequired: DAILY_MEMBERSHIP_MXN };
  }

  setOnline(userId: string, online: boolean) {
    const driver = this.requireDriver(userId);
    this.store.setDriverOnline(driver.id, online);
    const membershipActive = this.store.isMembershipActive(driver.id);
    return {
      driverId: driver.id,
      online,
      membershipActive,
      eligibleForRides: online && membershipActive,
      membershipRequired: DAILY_MEMBERSHIP_MXN,
    };
  }

  updateLocation(userId: string, dto: UpdateLocationDto) {
    const driver = this.requireDriver(userId);
    const location = { ...dto, updatedAt: new Date().toISOString() };
    this.store.updateDriverLocation(driver.id, location);
    this.realtime.emitDriverLocation(driver.id, { driverId: driver.id, ...location });
    return { driverId: driver.id, location, accepted: true };
  }

  getEarnings(userId: string) {
    const driver = this.requireDriver(userId);
    const membership = this.store.getMembership(driver.id);
    return {
      ...this.store.getDriverEarnings(driver.id),
      membership: {
        daily: DAILY_MEMBERSHIP_MXN,
        monthly: MONTHLY_MEMBERSHIP_MXN,
        status: this.store.isMembershipActive(driver.id) ? "active" : "inactive",
        expiresAt: membership?.expiresAt ?? null,
      },
    };
  }
}
