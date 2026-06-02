import { Injectable } from "@nestjs/common";
import { RideRequest, RideStatus } from "@todo/shared";
import { NotificationsService } from "../notifications/notifications.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { DispatchService } from "./dispatch.service";
import { PricingService } from "./pricing.service";

interface RideRecord {
  id: string;
  status: RideStatus;
  fare: number;
  riderId: string;
  driverId?: string;
  pickup: RideRequest["pickup"];
  dropoff: RideRequest["dropoff"];
}

@Injectable()
export class RidesService {
  private rides = new Map<string, RideRecord>();

  constructor(
    private readonly pricing: PricingService,
    private readonly dispatch: DispatchService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway
  ) {}

  estimate(dto: RideRequest) {
    return this.pricing.estimate(dto.pickup, dto.dropoff);
  }

  async requestRide(dto: RideRequest) {
    const estimate = this.estimate(dto);
    const matches = this.dispatch.findEligibleDrivers(dto.pickup);
    const ride: RideRecord = {
      id: `ride_${Date.now()}`,
      status: "requested",
      fare: estimate.riderPrice,
      riderId: dto.riderId,
      pickup: dto.pickup,
      dropoff: dto.dropoff
    };

    this.rides.set(ride.id, ride);
    this.realtime.emitRideUpdate(ride.id, ride);
    await this.notifications.notifyRideRequested(ride.id, matches[0]?.driverId);

    return { ride, estimate, matches };
  }

  getRide(id: string) {
    return this.rides.get(id) ?? { id, status: "not_found" };
  }

  async acceptRide(id: string, driverId: string) {
    const ride = this.rides.get(id);
    if (!ride) return { id, status: "not_found" };

    ride.status = "driver_assigned";
    ride.driverId = driverId;
    this.realtime.emitRideUpdate(id, ride);
    await this.notifications.notifyDriverAssigned(id, driverId);
    return ride;
  }

  async completeRide(id: string) {
    const ride = this.rides.get(id);
    if (!ride) return { id, status: "not_found" };

    ride.status = "completed";
    this.realtime.emitRideUpdate(id, ride);
    await this.notifications.notifyRideCompleted(id);
    return ride;
  }
}

