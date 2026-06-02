export type UserRole = "rider" | "driver" | "admin" | "support";

export type RideStatus =
  | "requested"
  | "driver_assigned"
  | "driver_arriving"
  | "in_progress"
  | "completed"
  | "cancelled";

export type DriverStatus = "pending" | "approved" | "rejected" | "suspended";
export type MembershipStatus = "active" | "expired" | "past_due";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface FareEstimate {
  currency: "MXN";
  distanceKm: number;
  durationMinutes: number;
  riderPrice: number;
  platformCommission: 0;
  driverEarnings: number;
}

export interface RideRequest {
  riderId: string;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  scheduledFor?: string;
  paymentMethod: "cash" | "card";
}

export interface DriverMatch {
  driverId: string;
  score: number;
  etaMinutes: number;
  distanceKm: number;
  rating: number;
  acceptanceRate: number;
}

export const DAILY_MEMBERSHIP_MXN = 100;
export const MONTHLY_MEMBERSHIP_MXN = 2500;

