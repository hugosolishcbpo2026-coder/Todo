import { Injectable } from "@nestjs/common";
import { DriverMatch, geoDistanceKm, GeoPoint } from "@todo/shared";
import { StoreService } from "../core/store.service";

/** Average urban speed used to derive an ETA from distance, in km/h. */
const AVG_SPEED_KMH = 22;
/** Drivers farther than this from the pickup are not offered the ride. */
const MAX_PICKUP_RADIUS_KM = 8;

@Injectable()
export class DispatchService {
  constructor(private readonly store: StoreService) {}

  /**
   * Rank dispatchable drivers (approved, online, paid-up, located) by a blended
   * score of proximity, ETA, acceptance rate and rating. Closest/best first.
   */
  findEligibleDrivers(pickup: GeoPoint): DriverMatch[] {
    return this.store
      .listDispatchableDrivers()
      .map((driver) => {
        const distanceKm = Math.round(geoDistanceKm(driver.location!, pickup) * 100) / 100;
        const etaMinutes = Math.max(1, Math.round((distanceKm / AVG_SPEED_KMH) * 60));
        const match: Omit<DriverMatch, "score"> = {
          driverId: driver.id,
          distanceKm,
          etaMinutes,
          rating: driver.rating,
          acceptanceRate: driver.acceptanceRate,
        };
        return { ...match, score: this.score(match) };
      })
      .filter((m) => m.distanceKm <= MAX_PICKUP_RADIUS_KM)
      .sort((a, b) => b.score - a.score);
  }

  private score(driver: Omit<DriverMatch, "score">) {
    const distanceScore = Math.max(0, 100 - driver.distanceKm * 15);
    const etaScore = Math.max(0, 100 - driver.etaMinutes * 8);
    return distanceScore * 0.45 + etaScore * 0.25 + driver.acceptanceRate * 0.2 + driver.rating * 2;
  }
}
