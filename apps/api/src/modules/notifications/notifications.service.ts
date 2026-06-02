import { Injectable } from "@nestjs/common";
import { Ride } from "@todo/shared";
import { StoreService } from "../core/store.service";
import { WhatsAppService } from "./whatsapp.service";

const peso = (n: number) => `$${Math.round(n)} MXN`;

/**
 * Resolves ride participants to phone numbers and sends WhatsApp notifications.
 * All sends are best-effort (the WhatsApp client never throws).
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly whatsApp: WhatsAppService,
    private readonly store: StoreService,
  ) {}

  private riderPhone(ride: Ride): string | undefined {
    return this.store.getUser(ride.riderId)?.phone;
  }

  private driverPhone(driverId?: string): string | undefined {
    if (!driverId) return undefined;
    const driver = this.store.getDriver(driverId);
    return driver ? this.store.getUser(driver.userId)?.phone : undefined;
  }

  sendOtp(phone: string, code: string) {
    return this.whatsApp.sendOtp(phone, code);
  }

  notifyRideRequested(ride: Ride, driverId?: string) {
    const phone = this.driverPhone(driverId);
    if (!phone) return Promise.resolve({ skipped: "no_driver_match" });
    return this.whatsApp.sendText(
      phone,
      `New Todo ride request — ${peso(ride.fare)} (${ride.paymentMethod}). Open the app to accept.`,
    );
  }

  notifyDriverAssigned(ride: Ride) {
    const phone = this.riderPhone(ride);
    if (!phone) return Promise.resolve({ skipped: "no_rider" });
    return this.whatsApp.sendText(phone, "Your Todo driver is on the way. Track them in the app.");
  }

  notifyRideCompleted(ride: Ride) {
    const phone = this.riderPhone(ride);
    if (!phone) return Promise.resolve({ skipped: "no_rider" });
    return this.whatsApp.sendText(
      phone,
      `Trip completed — ${peso(ride.fare)}. Thanks for riding with Todo!`,
    );
  }
}
