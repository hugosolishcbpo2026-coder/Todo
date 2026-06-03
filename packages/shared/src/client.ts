import {
  Driver,
  DriverEarnings,
  DriverMatch,
  FareEstimate,
  GeoPoint,
  Membership,
  MembershipPlan,
  Payment,
  PlanDefinition,
  Ride,
  RidePaymentMethod,
  Subscription,
  SubscriptionPlan,
  User,
  UserRole,
} from "./index";

export interface AuthResult {
  accessToken: string;
  user: User;
}

export interface AdminLiveOps {
  activeRides: number;
  onlineDrivers: number;
  totalDrivers: number;
  totalRiders: number;
  expiringMemberships: number;
}

export interface AdminAnalytics {
  currency: "MXN";
  rideVolumeToday: number;
  riderAvgFare: number;
  driverEarningsToday: number;
  platformRideCommission: 0;
  membershipRevenueToday: number;
}

export interface RideRequestPayload {
  pickup: GeoPoint;
  dropoff: GeoPoint;
  paymentMethod: RidePaymentMethod;
}

export interface RequestRideResult {
  ride: Ride;
  estimate: FareEstimate;
  matches: DriverMatch[];
}

/** Thrown for non-2xx responses; carries the HTTP status and parsed body. */
export class TodoApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "TodoApiError";
  }
}

/**
 * Framework-agnostic, fully-typed client for the Todo API. Works in the
 * browser (admin dashboard) and React Native (rider/driver apps) since it
 * relies only on the global `fetch`.
 */
export class TodoApiClient {
  private token?: string;

  constructor(private readonly baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /** Set (or clear) the bearer token used for authenticated requests. */
  setToken(token?: string): void {
    this.token = token;
  }

  hasToken(): boolean {
    return Boolean(this.token);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    const parsed = text ? safeJson(text) : undefined;
    if (!res.ok) {
      const message =
        (parsed && typeof parsed === "object" && "message" in parsed
          ? String((parsed as { message: unknown }).message)
          : res.statusText) || `Request failed (${res.status})`;
      throw new TodoApiError(res.status, message, parsed);
    }
    return parsed as T;
  }

  // --- Health & auth -------------------------------------------------------

  health() {
    return this.request<{ status: string; uptimeSeconds: number }>("GET", "/health");
  }

  requestOtp(phone: string) {
    return this.request<{ phone: string; status: string; devCode?: string }>(
      "POST",
      "/auth/otp/request",
      { phone },
    );
  }

  verifyOtp(input: { phone: string; code: string; role: UserRole; name?: string }) {
    return this.request<AuthResult>("POST", "/auth/otp/verify", input);
  }

  me() {
    return this.request<User>("GET", "/auth/me");
  }

  // --- Rider / rides -------------------------------------------------------

  estimateRide(payload: RideRequestPayload) {
    return this.request<FareEstimate>("POST", "/rides/estimate", payload);
  }

  requestRide(payload: RideRequestPayload) {
    return this.request<RequestRideResult>("POST", "/rides", payload);
  }

  getRide(id: string) {
    return this.request<Ride>("GET", `/rides/${id}`);
  }

  /** Driver: open ride offers that can be accepted. */
  availableRides() {
    return this.request<Ride[]>("GET", "/rides/available");
  }

  /** Driver: own in-progress rides. */
  myActiveRides() {
    return this.request<Ride[]>("GET", "/rides/mine");
  }

  acceptRide(id: string) {
    return this.request<Ride>("POST", `/rides/${id}/accept`);
  }

  arriveRide(id: string) {
    return this.request<Ride>("POST", `/rides/${id}/arrive`);
  }

  startRide(id: string) {
    return this.request<Ride>("POST", `/rides/${id}/start`);
  }

  completeRide(id: string) {
    return this.request<Ride>("POST", `/rides/${id}/complete`);
  }

  cancelRide(id: string) {
    return this.request<Ride>("POST", `/rides/${id}/cancel`);
  }

  // --- Driver --------------------------------------------------------------

  onboardDriver(vehicle?: Driver["vehicle"]) {
    return this.request<{ driver: Driver }>("POST", "/drivers/onboarding", { vehicle });
  }

  setOnline(online: boolean) {
    return this.request<{ driverId: string; online: boolean; eligibleForRides: boolean }>(
      "PATCH",
      "/drivers/me/online",
      { online },
    );
  }

  updateLocation(location: GeoPoint & { headingDeg?: number }) {
    return this.request<{ accepted: boolean }>("POST", "/drivers/me/location", location);
  }

  earnings() {
    return this.request<DriverEarnings & { membership: { status: string } }>(
      "GET",
      "/drivers/me/earnings",
    );
  }

  // --- Membership / payments ----------------------------------------------

  activateMembership(plan: MembershipPlan) {
    return this.request<{ membership: Membership }>(
      "POST",
      `/payments/driver-membership/${plan}`,
    );
  }

  membershipStatus() {
    return this.request<{ active: boolean; membership: Membership | null }>(
      "GET",
      "/membership/status",
    );
  }

  // --- Tiered subscriptions ------------------------------------------------

  plans() {
    return this.request<PlanDefinition[]>("GET", "/payments/plans");
  }

  subscription() {
    return this.request<Subscription>("GET", "/payments/subscription");
  }

  subscriptionCheckout(plan: SubscriptionPlan) {
    return this.request<{ plan: SubscriptionPlan; mode: "mock" | "live"; url: string | null }>(
      "POST",
      "/payments/subscription/checkout",
      { plan },
    );
  }

  billingPortal() {
    return this.request<{ mode: "mock" | "live"; url: string }>(
      "POST",
      "/payments/subscription/portal",
    );
  }

  // --- Admin ---------------------------------------------------------------

  adminLive() {
    return this.request<AdminLiveOps>("GET", "/admin/live");
  }

  adminAnalytics() {
    return this.request<AdminAnalytics>("GET", "/admin/analytics");
  }

  adminRides() {
    return this.request<Ride[]>("GET", "/admin/rides");
  }

  adminPayments() {
    return this.request<Payment[]>("GET", "/payments");
  }

  adminSubscriptions() {
    return this.request<Subscription[]>("GET", "/payments/subscriptions");
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
