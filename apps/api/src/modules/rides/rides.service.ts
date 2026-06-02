import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  GeoPoint,
  Ride,
  RidePaymentMethod,
  RideStatus,
  TERMINAL_RIDE_STATUSES,
} from "@todo/shared";

interface RequestRideInput {
  pickup: GeoPoint;
  dropoff: GeoPoint;
  paymentMethod: RidePaymentMethod;
}
import { StoreService } from "../core/store.service";
import { NotificationsService } from "../notifications/notifications.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { DispatchService } from "./dispatch.service";
import { PricingService } from "./pricing.service";

/** Allowed forward transitions for the ride state machine. */
const TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  requested: ["driver_assigned", "cancelled"],
  driver_assigned: ["driver_arriving", "cancelled"],
  driver_arriving: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

@Injectable()
export class RidesService {
  constructor(
    private readonly pricing: PricingService,
    private readonly dispatch: DispatchService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
    private readonly store: StoreService,
  ) {}

  estimate(input: { pickup: GeoPoint; dropoff: GeoPoint }) {
    return this.pricing.estimate(input.pickup, input.dropoff);
  }

  private requireRide(id: string): Ride {
    const ride = this.store.getRide(id);
    if (!ride) throw new NotFoundException(`Ride ${id} not found`);
    return ride;
  }

  private assertCanTransition(ride: Ride, next: RideStatus) {
    if (TERMINAL_RIDE_STATUSES.includes(ride.status)) {
      throw new BadRequestException(`Ride is already ${ride.status}`);
    }
    if (!TRANSITIONS[ride.status].includes(next)) {
      throw new BadRequestException(`Cannot move ride from ${ride.status} to ${next}`);
    }
  }

  async requestRide(riderId: string, dto: RequestRideInput) {
    const estimate = this.estimate(dto);
    const matches = this.dispatch.findEligibleDrivers(dto.pickup);
    const ride = this.store.createRide({
      status: "requested",
      riderId,
      pickup: dto.pickup,
      dropoff: dto.dropoff,
      paymentMethod: dto.paymentMethod,
      fare: estimate.riderPrice,
      estimate,
    });

    this.realtime.emitRideUpdate(ride.id, ride);
    this.realtime.emitRideOffer(ride); // push the offer to online drivers
    await this.notifications.notifyRideRequested(ride.id, matches[0]?.driverId);

    return { ride, estimate, matches };
  }

  getRide(id: string) {
    return this.requireRide(id);
  }

  /** Open ride offers a driver can accept (still in `requested` state). */
  availableForDriver(driverUserId: string): Ride[] {
    const driver = this.store.getDriverByUserId(driverUserId);
    if (!driver) return [];
    return this.store.listRides().filter((r) => r.status === "requested");
  }

  /** The driver's own in-progress rides. */
  activeForDriver(driverUserId: string): Ride[] {
    const driver = this.store.getDriverByUserId(driverUserId);
    if (!driver) return [];
    return this.store
      .listRides()
      .filter((r) => r.driverId === driver.id && !TERMINAL_RIDE_STATUSES.includes(r.status));
  }

  async acceptRide(id: string, driverUserId: string) {
    const ride = this.requireRide(id);
    const driver = this.store.getDriverByUserId(driverUserId);
    if (!driver) throw new NotFoundException("Driver profile not found");
    if (!this.store.isMembershipActive(driver.id)) {
      throw new ForbiddenException("Active membership required to accept rides");
    }
    this.assertCanTransition(ride, "driver_assigned");

    const updated = this.store.updateRide(id, { status: "driver_assigned", driverId: driver.id, acceptedAt: new Date().toISOString() })!;
    this.realtime.emitRideUpdate(id, updated);
    this.realtime.emitRideTaken(id); // remove the offer from other drivers
    await this.notifications.notifyDriverAssigned(id, driver.id);
    return updated;
  }

  /** Generic transition for driver_arriving / in_progress. */
  async advance(id: string, next: Extract<RideStatus, "driver_arriving" | "in_progress">) {
    const ride = this.requireRide(id);
    this.assertCanTransition(ride, next);
    const updated = this.store.updateRide(id, { status: next })!;
    this.realtime.emitRideUpdate(id, updated);
    return updated;
  }

  async completeRide(id: string) {
    const ride = this.requireRide(id);
    this.assertCanTransition(ride, "completed");

    const completed = this.store.updateRide(id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    })!;

    // No commission: the rider's fare is the driver's earning in full.
    if (completed.driverId) {
      this.store.createPayment({
        type: "ride",
        status: "succeeded",
        amount: completed.fare,
        currency: "MXN",
        rideId: completed.id,
        riderId: completed.riderId,
        driverId: completed.driverId,
      });
      this.store.addLedgerEntry({
        driverId: completed.driverId,
        type: "ride_earning",
        amount: completed.fare,
        rideId: completed.id,
      });
    }

    this.realtime.emitRideUpdate(id, completed);
    await this.notifications.notifyRideCompleted(id);
    return completed;
  }

  async cancelRide(id: string) {
    const ride = this.requireRide(id);
    this.assertCanTransition(ride, "cancelled");
    const cancelled = this.store.updateRide(id, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
    })!;
    this.realtime.emitRideUpdate(id, cancelled);
    this.realtime.emitRideTaken(id); // withdraw any pending offer
    return cancelled;
  }
}
