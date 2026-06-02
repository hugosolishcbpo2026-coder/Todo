import { Ride } from "./index";

/**
 * Socket.IO event names shared by the API gateway and all clients, so both
 * sides agree on the wire protocol.
 */
export const RealtimeEvents = {
  // Client -> server (subscriptions)
  RideSubscribe: "ride:subscribe",
  DriverSubscribe: "driver:subscribe",
  DriversSubscribe: "drivers:subscribe",
  DriversUnsubscribe: "drivers:unsubscribe",
  AdminSubscribe: "admin:subscribe",
  DriverLocationIngest: "driver:location",
  // Server -> client (broadcasts)
  RideUpdate: "ride:update",
  RideOffer: "ride:offer",
  RideOfferTaken: "ride:offer:taken",
  DriverLocation: "driver:location",
  AdminRideUpdate: "admin:ride:update",
  AdminDriverLocation: "admin:driver:location",
} as const;

export interface RideOfferTakenPayload {
  rideId: string;
}

export interface DriverLocationPayload {
  driverId: string;
  lat: number;
  lng: number;
  headingDeg?: number;
  updatedAt: string;
}

/** Server emits the full ride on `ride:update` / `ride:offer`. */
export type RideEventPayload = Ride;

/**
 * Derive the Socket.IO origin from a REST base URL by stripping the path
 * (e.g. "http://localhost:4000/api/v1" -> "http://localhost:4000").
 * Avoids depending on a URL polyfill so it works in React Native too.
 */
export function socketUrlFromApiUrl(apiUrl: string): string {
  const match = apiUrl.match(/^(https?:\/\/[^/]+)/i);
  return match ? match[1] : apiUrl;
}
