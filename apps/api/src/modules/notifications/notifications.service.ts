import { Injectable } from "@nestjs/common";
import { WhatsAppService } from "./whatsapp.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly whatsApp: WhatsAppService) {}

  notifyRideRequested(rideId: string, driverId?: string) {
    if (!driverId) return Promise.resolve({ skipped: "no_driver_match" });
    return this.whatsApp.sendTemplate({
      to: driverId,
      template: "driver_new_ride_request",
      variables: { rideId }
    });
  }

  notifyDriverAssigned(rideId: string, driverId: string) {
    return this.whatsApp.sendTemplate({
      to: driverId,
      template: "rider_driver_assigned",
      variables: { rideId, driverId }
    });
  }

  notifyRideCompleted(rideId: string) {
    return this.whatsApp.sendTemplate({
      to: "rider",
      template: "ride_completed",
      variables: { rideId }
    });
  }
}

