import { Injectable, Logger } from "@nestjs/common";
import {
  Driver,
  DriverEarnings,
  DriverLocation,
  LedgerEntry,
  Membership,
  MembershipPlan,
  MEMBERSHIP_DURATION_MS,
  Payment,
  Ride,
  User,
  UserRole,
} from "@todo/shared";
import { randomUUID } from "node:crypto";

/**
 * In-memory persistence layer acting as the single source of truth for the
 * API. Every module reads and writes domain state through this service.
 *
 * It is intentionally framework-agnostic and side-effect free so it can be
 * swapped for a PostgreSQL-backed implementation (same method surface) without
 * touching the modules that depend on it.
 */
@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  private readonly users = new Map<string, User>();
  private readonly drivers = new Map<string, Driver>();
  private readonly memberships = new Map<string, Membership>();
  private readonly rides = new Map<string, Ride>();
  private readonly payments = new Map<string, Payment>();
  private readonly ledger: LedgerEntry[] = [];

  private now(): string {
    return new Date().toISOString();
  }

  // --- Users ---------------------------------------------------------------

  /** Find an existing user by phone or create one (idempotent OTP login). */
  upsertUserByPhone(phone: string, role: UserRole, name?: string): User {
    const existing = [...this.users.values()].find((u) => u.phone === phone);
    if (existing) {
      // Allow role to be (re)asserted on login; keep the first known name.
      existing.role = role;
      if (name && !existing.name) existing.name = name;
      return existing;
    }
    const user: User = {
      id: `usr_${randomUUID()}`,
      phone,
      role,
      name,
      createdAt: this.now(),
    };
    this.users.set(user.id, user);
    return user;
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  // --- Drivers -------------------------------------------------------------

  createDriver(userId: string, vehicle?: Driver["vehicle"]): Driver {
    const existing = this.getDriverByUserId(userId);
    if (existing) return existing;
    const driver: Driver = {
      id: `drv_${randomUUID()}`,
      userId,
      // Auto-approved for MVP; real onboarding review is a future step.
      status: "approved",
      online: false,
      rating: 5,
      acceptanceRate: 100,
      vehicle,
      createdAt: this.now(),
    };
    this.drivers.set(driver.id, driver);
    return driver;
  }

  getDriver(id: string): Driver | undefined {
    return this.drivers.get(id);
  }

  getDriverByUserId(userId: string): Driver | undefined {
    return [...this.drivers.values()].find((d) => d.userId === userId);
  }

  setDriverOnline(driverId: string, online: boolean): Driver | undefined {
    const driver = this.drivers.get(driverId);
    if (!driver) return undefined;
    driver.online = online;
    return driver;
  }

  updateDriverLocation(driverId: string, location: DriverLocation): Driver | undefined {
    const driver = this.drivers.get(driverId);
    if (!driver) return undefined;
    driver.location = location;
    return driver;
  }

  /** Drivers eligible to receive ride offers: approved, online, paid-up, located. */
  listDispatchableDrivers(): Driver[] {
    return [...this.drivers.values()].filter(
      (d) => d.status === "approved" && d.online && !!d.location && this.isMembershipActive(d.id),
    );
  }

  // --- Memberships ---------------------------------------------------------

  /** Activate or extend a driver's membership. Stacks onto remaining time. */
  activateMembership(driverId: string, plan: MembershipPlan): Membership {
    const duration = MEMBERSHIP_DURATION_MS[plan];
    const current = this.getMembership(driverId);
    const base =
      current && new Date(current.expiresAt).getTime() > Date.now()
        ? new Date(current.expiresAt).getTime()
        : Date.now();
    const membership: Membership = {
      id: current?.id ?? `mem_${randomUUID()}`,
      driverId,
      plan,
      status: "active",
      startedAt: current?.startedAt ?? this.now(),
      expiresAt: new Date(base + duration).toISOString(),
    };
    this.memberships.set(driverId, membership);
    return membership;
  }

  getMembership(driverId: string): Membership | undefined {
    return this.memberships.get(driverId);
  }

  isMembershipActive(driverId: string): boolean {
    const membership = this.memberships.get(driverId);
    if (!membership) return false;
    return new Date(membership.expiresAt).getTime() > Date.now();
  }

  // --- Rides ---------------------------------------------------------------

  createRide(ride: Omit<Ride, "id" | "createdAt" | "updatedAt" | "events">): Ride {
    const ts = this.now();
    const record: Ride = {
      ...ride,
      id: `ride_${randomUUID()}`,
      createdAt: ts,
      updatedAt: ts,
      events: [{ status: ride.status, at: ts }],
    };
    this.rides.set(record.id, record);
    return record;
  }

  getRide(id: string): Ride | undefined {
    return this.rides.get(id);
  }

  updateRide(id: string, patch: Partial<Ride>): Ride | undefined {
    const ride = this.rides.get(id);
    if (!ride) return undefined;
    Object.assign(ride, patch, { updatedAt: this.now() });
    if (patch.status && patch.status !== ride.events.at(-1)?.status) {
      ride.events.push({ status: patch.status, at: ride.updatedAt });
    }
    return ride;
  }

  listRides(): Ride[] {
    return [...this.rides.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // --- Payments & ledger ---------------------------------------------------

  createPayment(payment: Omit<Payment, "id" | "createdAt">): Payment {
    const record: Payment = { ...payment, id: `pay_${randomUUID()}`, createdAt: this.now() };
    this.payments.set(record.id, record);
    return record;
  }

  listPayments(): Payment[] {
    return [...this.payments.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  addLedgerEntry(entry: Omit<LedgerEntry, "id" | "createdAt">): LedgerEntry {
    const record: LedgerEntry = { ...entry, id: `led_${randomUUID()}`, createdAt: this.now() };
    this.ledger.push(record);
    return record;
  }

  getDriverEarnings(driverId: string): DriverEarnings {
    const entries = this.ledger.filter((e) => e.driverId === driverId && e.type === "ride_earning");
    const dayMs = 24 * 60 * 60 * 1000;
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const startOfWeek = startOfToday - 6 * dayMs;
    const sum = (since: number) =>
      entries
        .filter((e) => new Date(e.createdAt).getTime() >= since)
        .reduce((acc, e) => acc + e.amount, 0);
    return {
      currency: "MXN",
      today: Math.round(sum(startOfToday) * 100) / 100,
      week: Math.round(sum(startOfWeek) * 100) / 100,
      allTime: Math.round(entries.reduce((acc, e) => acc + e.amount, 0) * 100) / 100,
      rides: entries.length,
      platformCommission: 0,
    };
  }

  // --- Aggregates (admin) --------------------------------------------------

  snapshot() {
    const rides = [...this.rides.values()];
    const activeRides = rides.filter(
      (r) => !["completed", "cancelled"].includes(r.status),
    ).length;
    const onlineDrivers = [...this.drivers.values()].filter((d) => d.online).length;
    const expiringMemberships = [...this.memberships.values()].filter((m) => {
      const ms = new Date(m.expiresAt).getTime() - Date.now();
      return ms > 0 && ms < 24 * 60 * 60 * 1000;
    }).length;
    return {
      users: this.users.size,
      drivers: this.drivers.size,
      onlineDrivers,
      activeRides,
      totalRides: rides.length,
      expiringMemberships,
      payments: this.payments.size,
    };
  }
}
