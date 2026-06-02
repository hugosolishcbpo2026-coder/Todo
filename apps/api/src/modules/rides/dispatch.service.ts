import { Injectable } from "@nestjs/common";
import { DriverMatch, GeoPoint } from "@todo/shared";

@Injectable()
export class DispatchService {
  findEligibleDrivers(pickup: GeoPoint): DriverMatch[] {
    const seed: DriverMatch[] = [
      { driverId: "drv_001", distanceKm: 1.2, etaMinutes: 4, rating: 4.92, acceptanceRate: 98, score: 0 },
      { driverId: "drv_002", distanceKm: 2.1, etaMinutes: 6, rating: 4.88, acceptanceRate: 94, score: 0 }
    ];

    return seed
      .map((driver) => ({
        ...driver,
        score: this.score(driver)
      }))
      .sort((a, b) => b.score - a.score);
  }

  private score(driver: Omit<DriverMatch, "score">) {
    const distanceScore = Math.max(0, 100 - driver.distanceKm * 15);
    const etaScore = Math.max(0, 100 - driver.etaMinutes * 8);
    return distanceScore * 0.45 + etaScore * 0.25 + driver.acceptanceRate * 0.2 + driver.rating * 2;
  }
}

