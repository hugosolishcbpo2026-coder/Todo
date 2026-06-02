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
export type MembershipPlan = "daily" | "monthly";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";
export type PaymentType = "ride" | "membership";
export type RidePaymentMethod = "cash" | "card";

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
  paymentMethod: RidePaymentMethod;
}

export interface DriverMatch {
  driverId: string;
  score: number;
  etaMinutes: number;
  distanceKm: number;
  rating: number;
  acceptanceRate: number;
}

/** A user account. Phone is the unique identity key (OTP login). */
export interface User {
  id: string;
  phone: string;
  role: UserRole;
  name?: string;
  createdAt: string;
}

export interface DriverLocation extends GeoPoint {
  updatedAt: string;
  headingDeg?: number;
}

/** Driver profile, keyed by its own id and linked to a {@link User}. */
export interface Driver {
  id: string;
  userId: string;
  status: DriverStatus;
  online: boolean;
  rating: number;
  acceptanceRate: number;
  location?: DriverLocation;
  vehicle?: { plate: string; model?: string; color?: string };
  createdAt: string;
}

export interface Membership {
  id: string;
  driverId: string;
  plan: MembershipPlan;
  status: MembershipStatus;
  startedAt: string;
  /** ISO timestamp at which the membership stops being active. */
  expiresAt: string;
}

export interface Ride {
  id: string;
  status: RideStatus;
  riderId: string;
  driverId?: string;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  paymentMethod: RidePaymentMethod;
  fare: number;
  estimate: FareEstimate;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  /** Ordered status-transition audit trail. */
  events: Array<{ status: RideStatus; at: string }>;
}

export interface Payment {
  id: string;
  type: PaymentType;
  status: PaymentStatus;
  amount: number;
  currency: "MXN";
  createdAt: string;
  rideId?: string;
  riderId?: string;
  driverId?: string;
  plan?: MembershipPlan;
}

export interface LedgerEntry {
  id: string;
  driverId: string;
  type: "ride_earning" | "membership_fee";
  amount: number;
  rideId?: string;
  createdAt: string;
}

export interface DriverEarnings {
  currency: "MXN";
  today: number;
  week: number;
  allTime: number;
  rides: number;
  platformCommission: 0;
}

export const DAILY_MEMBERSHIP_MXN = 100;
export const MONTHLY_MEMBERSHIP_MXN = 2500;

/** Membership duration in milliseconds per plan. */
export const MEMBERSHIP_DURATION_MS: Record<MembershipPlan, number> = {
  daily: 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

/** Terminal ride states no further transition is allowed from. */
export const TERMINAL_RIDE_STATUSES: RideStatus[] = ["completed", "cancelled"];

/** Great-circle distance between two coordinates, in kilometres. */
export function geoDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const earthKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat));
  return 2 * earthKm * Math.asin(Math.sqrt(h));
}
