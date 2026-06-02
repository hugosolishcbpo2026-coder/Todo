/**
 * Seed demo data into the local SQLite database.
 *
 * Build first, then run:  pnpm --filter @todo/api db:seed
 * (equivalently: node dist/apps/api/src/scripts/seed.js)
 */
import { openDatabase, resolveDbPath } from "../modules/core/database";
import { StoreService } from "../modules/core/store.service";
import { PricingService } from "../modules/rides/pricing.service";
import { DAILY_MEMBERSHIP_MXN, GeoPoint } from "@todo/shared";

const PICKUP: GeoPoint = { lat: 22.8869, lng: -109.9122 };
const DROPOFF: GeoPoint = { lat: 23.0631, lng: -109.6981 };

function seed() {
  const path = resolveDbPath();
  const db = openDatabase(path);
  const store = new StoreService(db);
  const pricing = new PricingService();

  store.upsertUserByPhone("+5216240000000", "admin", "Operator");
  const rider = store.upsertUserByPhone("+5216241112233", "rider", "Demo Rider");
  const driverUser = store.upsertUserByPhone("+5216249998877", "driver", "Demo Driver");

  const driver = store.createDriver(driverUser.id, { plate: "BCS-0001", model: "Nissan Versa" });
  store.activateMembership(driver.id, "daily");
  store.createPayment({
    type: "membership",
    status: "succeeded",
    amount: DAILY_MEMBERSHIP_MXN,
    currency: "MXN",
    driverId: driver.id,
    plan: "daily",
  });
  store.addLedgerEntry({ driverId: driver.id, type: "membership_fee", amount: -DAILY_MEMBERSHIP_MXN });
  store.setDriverOnline(driver.id, true);
  store.updateDriverLocation(driver.id, { lat: 22.889, lng: -109.915, updatedAt: new Date().toISOString() });

  // A few completed rides so earnings + admin analytics have history.
  for (let i = 0; i < 3; i++) {
    const estimate = pricing.estimate(PICKUP, DROPOFF);
    const ride = store.createRide({
      status: "requested",
      riderId: rider.id,
      pickup: PICKUP,
      dropoff: DROPOFF,
      paymentMethod: "cash",
      fare: estimate.riderPrice,
      estimate,
    });
    store.updateRide(ride.id, { status: "driver_assigned", driverId: driver.id, acceptedAt: new Date().toISOString() });
    store.updateRide(ride.id, { status: "driver_arriving" });
    store.updateRide(ride.id, { status: "in_progress" });
    store.updateRide(ride.id, { status: "completed", completedAt: new Date().toISOString() });
    store.createPayment({
      type: "ride",
      status: "succeeded",
      amount: ride.fare,
      currency: "MXN",
      rideId: ride.id,
      riderId: rider.id,
      driverId: driver.id,
    });
    store.addLedgerEntry({ driverId: driver.id, type: "ride_earning", amount: ride.fare, rideId: ride.id });
  }

  const snapshot = store.snapshot();
  db.close();

  console.log(`Seeded SQLite database at: ${path}`);
  console.log(JSON.stringify(snapshot, null, 2));
}

seed();
