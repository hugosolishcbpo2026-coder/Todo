import { Inject, Injectable } from "@nestjs/common";
import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
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
import { Row, SQLITE_DB } from "./database";

/**
 * Durable persistence layer (SQLite via node:sqlite) and the single source of
 * truth for the API. Every module reads and writes domain state through this
 * service. The public method surface is storage-agnostic, so a PostgreSQL
 * implementation could replace it without touching dependent modules.
 */
@Injectable()
export class StoreService {
  constructor(@Inject(SQLITE_DB) private readonly db: DatabaseSync) {}

  private now(): string {
    return new Date().toISOString();
  }

  // --- Row mappers ---------------------------------------------------------

  private toUser = (r: Row): User => ({
    id: String(r.id),
    phone: String(r.phone),
    role: r.role as UserRole,
    name: r.name == null ? undefined : String(r.name),
    createdAt: String(r.created_at),
  });

  private toDriver = (r: Row): Driver => ({
    id: String(r.id),
    userId: String(r.user_id),
    status: r.status as Driver["status"],
    online: Boolean(r.online),
    rating: Number(r.rating),
    acceptanceRate: Number(r.acceptance_rate),
    location: r.location_json ? (JSON.parse(String(r.location_json)) as DriverLocation) : undefined,
    vehicle: r.vehicle_json ? (JSON.parse(String(r.vehicle_json)) as Driver["vehicle"]) : undefined,
    createdAt: String(r.created_at),
  });

  private toMembership = (r: Row): Membership => ({
    id: String(r.id),
    driverId: String(r.driver_id),
    plan: r.plan as MembershipPlan,
    status: r.status as Membership["status"],
    startedAt: String(r.started_at),
    expiresAt: String(r.expires_at),
  });

  private toRide = (r: Row): Ride => ({
    id: String(r.id),
    status: r.status as Ride["status"],
    riderId: String(r.rider_id),
    driverId: r.driver_id == null ? undefined : String(r.driver_id),
    pickup: JSON.parse(String(r.pickup_json)),
    dropoff: JSON.parse(String(r.dropoff_json)),
    paymentMethod: r.payment_method as Ride["paymentMethod"],
    fare: Number(r.fare),
    estimate: JSON.parse(String(r.estimate_json)),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    acceptedAt: r.accepted_at == null ? undefined : String(r.accepted_at),
    completedAt: r.completed_at == null ? undefined : String(r.completed_at),
    cancelledAt: r.cancelled_at == null ? undefined : String(r.cancelled_at),
    events: JSON.parse(String(r.events_json)),
  });

  private toPayment = (r: Row): Payment => ({
    id: String(r.id),
    type: r.type as Payment["type"],
    status: r.status as Payment["status"],
    amount: Number(r.amount),
    currency: "MXN",
    createdAt: String(r.created_at),
    rideId: r.ride_id == null ? undefined : String(r.ride_id),
    riderId: r.rider_id == null ? undefined : String(r.rider_id),
    driverId: r.driver_id == null ? undefined : String(r.driver_id),
    plan: r.plan == null ? undefined : (r.plan as MembershipPlan),
  });

  // --- Users ---------------------------------------------------------------

  upsertUserByPhone(phone: string, role: UserRole, name?: string): User {
    const existing = this.db.prepare("SELECT * FROM users WHERE phone = ?").get(phone) as
      | Row
      | undefined;
    if (existing) {
      this.db
        .prepare("UPDATE users SET role = ?, name = COALESCE(name, ?) WHERE id = ?")
        .run(role, name ?? null, String(existing.id));
      return this.toUser(this.db.prepare("SELECT * FROM users WHERE id = ?").get(existing.id) as Row);
    }
    const user: User = { id: `usr_${randomUUID()}`, phone, role, name, createdAt: this.now() };
    this.db
      .prepare("INSERT INTO users (id, phone, role, name, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(user.id, user.phone, user.role, user.name ?? null, user.createdAt);
    return user;
  }

  getUser(id: string): User | undefined {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Row | undefined;
    return row ? this.toUser(row) : undefined;
  }

  // --- Drivers -------------------------------------------------------------

  createDriver(userId: string, vehicle?: Driver["vehicle"]): Driver {
    const existing = this.getDriverByUserId(userId);
    if (existing) return existing;
    const driver: Driver = {
      id: `drv_${randomUUID()}`,
      userId,
      status: "approved", // Auto-approved for MVP; review flow is a future step.
      online: false,
      rating: 5,
      acceptanceRate: 100,
      vehicle,
      createdAt: this.now(),
    };
    this.db
      .prepare(
        `INSERT INTO drivers (id, user_id, status, online, rating, acceptance_rate, vehicle_json, created_at)
         VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
      )
      .run(
        driver.id,
        driver.userId,
        driver.status,
        driver.rating,
        driver.acceptanceRate,
        vehicle ? JSON.stringify(vehicle) : null,
        driver.createdAt,
      );
    return driver;
  }

  getDriver(id: string): Driver | undefined {
    const row = this.db.prepare("SELECT * FROM drivers WHERE id = ?").get(id) as Row | undefined;
    return row ? this.toDriver(row) : undefined;
  }

  getDriverByUserId(userId: string): Driver | undefined {
    const row = this.db.prepare("SELECT * FROM drivers WHERE user_id = ?").get(userId) as
      | Row
      | undefined;
    return row ? this.toDriver(row) : undefined;
  }

  setDriverOnline(driverId: string, online: boolean): Driver | undefined {
    this.db.prepare("UPDATE drivers SET online = ? WHERE id = ?").run(online ? 1 : 0, driverId);
    return this.getDriver(driverId);
  }

  updateDriverLocation(driverId: string, location: DriverLocation): Driver | undefined {
    this.db
      .prepare("UPDATE drivers SET location_json = ? WHERE id = ?")
      .run(JSON.stringify(location), driverId);
    return this.getDriver(driverId);
  }

  /** Drivers eligible to receive ride offers: approved, online, paid-up, located. */
  listDispatchableDrivers(): Driver[] {
    const rows = this.db
      .prepare(
        `SELECT d.* FROM drivers d
         JOIN memberships m ON m.driver_id = d.id
         WHERE d.status = 'approved' AND d.online = 1
           AND d.location_json IS NOT NULL AND m.expires_at > ?`,
      )
      .all(this.now()) as Row[];
    return rows.map(this.toDriver);
  }

  // --- Memberships ---------------------------------------------------------

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
    this.db
      .prepare(
        `INSERT INTO memberships (driver_id, id, plan, status, started_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(driver_id) DO UPDATE SET
           plan = excluded.plan, status = excluded.status, expires_at = excluded.expires_at`,
      )
      .run(
        membership.driverId,
        membership.id,
        membership.plan,
        membership.status,
        membership.startedAt,
        membership.expiresAt,
      );
    return membership;
  }

  getMembership(driverId: string): Membership | undefined {
    const row = this.db.prepare("SELECT * FROM memberships WHERE driver_id = ?").get(driverId) as
      | Row
      | undefined;
    return row ? this.toMembership(row) : undefined;
  }

  isMembershipActive(driverId: string): boolean {
    const row = this.db
      .prepare("SELECT expires_at FROM memberships WHERE driver_id = ?")
      .get(driverId) as Row | undefined;
    return row ? new Date(String(row.expires_at)).getTime() > Date.now() : false;
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
    this.db
      .prepare(
        `INSERT INTO rides (id, status, rider_id, driver_id, pickup_json, dropoff_json,
           payment_method, fare, estimate_json, created_at, updated_at,
           accepted_at, completed_at, cancelled_at, events_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.status,
        record.riderId,
        record.driverId ?? null,
        JSON.stringify(record.pickup),
        JSON.stringify(record.dropoff),
        record.paymentMethod,
        record.fare,
        JSON.stringify(record.estimate),
        record.createdAt,
        record.updatedAt,
        record.acceptedAt ?? null,
        record.completedAt ?? null,
        record.cancelledAt ?? null,
        JSON.stringify(record.events),
      );
    return record;
  }

  getRide(id: string): Ride | undefined {
    const row = this.db.prepare("SELECT * FROM rides WHERE id = ?").get(id) as Row | undefined;
    return row ? this.toRide(row) : undefined;
  }

  updateRide(id: string, patch: Partial<Ride>): Ride | undefined {
    const ride = this.getRide(id);
    if (!ride) return undefined;
    Object.assign(ride, patch, { updatedAt: this.now() });
    if (patch.status && patch.status !== ride.events.at(-1)?.status) {
      ride.events.push({ status: patch.status, at: ride.updatedAt });
    }
    this.db
      .prepare(
        `UPDATE rides SET status = ?, driver_id = ?, fare = ?, updated_at = ?,
           accepted_at = ?, completed_at = ?, cancelled_at = ?, events_json = ?
         WHERE id = ?`,
      )
      .run(
        ride.status,
        ride.driverId ?? null,
        ride.fare,
        ride.updatedAt,
        ride.acceptedAt ?? null,
        ride.completedAt ?? null,
        ride.cancelledAt ?? null,
        JSON.stringify(ride.events),
        id,
      );
    return ride;
  }

  listRides(): Ride[] {
    const rows = this.db.prepare("SELECT * FROM rides ORDER BY created_at DESC").all() as Row[];
    return rows.map(this.toRide);
  }

  // --- Payments & ledger ---------------------------------------------------

  createPayment(payment: Omit<Payment, "id" | "createdAt">): Payment {
    const record: Payment = { ...payment, id: `pay_${randomUUID()}`, createdAt: this.now() };
    this.db
      .prepare(
        `INSERT INTO payments (id, type, status, amount, currency, created_at, ride_id, rider_id, driver_id, plan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.type,
        record.status,
        record.amount,
        record.currency,
        record.createdAt,
        record.rideId ?? null,
        record.riderId ?? null,
        record.driverId ?? null,
        record.plan ?? null,
      );
    return record;
  }

  listPayments(): Payment[] {
    const rows = this.db
      .prepare("SELECT * FROM payments ORDER BY created_at DESC")
      .all() as Row[];
    return rows.map(this.toPayment);
  }

  addLedgerEntry(entry: Omit<LedgerEntry, "id" | "createdAt">): LedgerEntry {
    const record: LedgerEntry = { ...entry, id: `led_${randomUUID()}`, createdAt: this.now() };
    this.db
      .prepare(
        "INSERT INTO ledger (id, driver_id, type, amount, ride_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(record.id, record.driverId, record.type, record.amount, record.rideId ?? null, record.createdAt);
    return record;
  }

  getDriverEarnings(driverId: string): DriverEarnings {
    const rows = this.db
      .prepare("SELECT amount, created_at FROM ledger WHERE driver_id = ? AND type = 'ride_earning'")
      .all(driverId) as Row[];
    const dayMs = 24 * 60 * 60 * 1000;
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const startOfWeek = startOfToday - 6 * dayMs;
    const sum = (since: number) =>
      rows
        .filter((r) => new Date(String(r.created_at)).getTime() >= since)
        .reduce((acc, r) => acc + Number(r.amount), 0);
    return {
      currency: "MXN",
      today: Math.round(sum(startOfToday) * 100) / 100,
      week: Math.round(sum(startOfWeek) * 100) / 100,
      allTime: Math.round(rows.reduce((acc, r) => acc + Number(r.amount), 0) * 100) / 100,
      rides: rows.length,
      platformCommission: 0,
    };
  }

  // --- Aggregates (admin) --------------------------------------------------

  snapshot() {
    const count = (sql: string, ...params: Array<string | number>) =>
      Number((this.db.prepare(sql).get(...params) as Row).n);
    const dayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return {
      users: count("SELECT COUNT(*) n FROM users"),
      drivers: count("SELECT COUNT(*) n FROM drivers"),
      onlineDrivers: count("SELECT COUNT(*) n FROM drivers WHERE online = 1"),
      activeRides: count("SELECT COUNT(*) n FROM rides WHERE status NOT IN ('completed','cancelled')"),
      totalRides: count("SELECT COUNT(*) n FROM rides"),
      expiringMemberships: count(
        "SELECT COUNT(*) n FROM memberships WHERE expires_at > ? AND expires_at < ?",
        this.now(),
        dayFromNow,
      ),
      payments: count("SELECT COUNT(*) n FROM payments"),
    };
  }
}
