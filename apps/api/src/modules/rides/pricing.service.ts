import { Injectable } from "@nestjs/common";
import { FareEstimate, GeoPoint } from "@todo/shared";

@Injectable()
export class PricingService {
  estimate(pickup: GeoPoint, dropoff: GeoPoint): FareEstimate {
    const distanceKm = this.haversineKm(pickup, dropoff);
    const durationMinutes = Math.max(6, Math.round(distanceKm * 3.2));
    const riderPrice = Math.round((35 + distanceKm * 12 + durationMinutes * 1.8) * 100) / 100;

    return {
      currency: "MXN",
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMinutes,
      riderPrice,
      platformCommission: 0,
      driverEarnings: riderPrice
    };
  }

  private haversineKm(a: GeoPoint, b: GeoPoint) {
    const earthKm = 6371;
    const dLat = this.toRad(b.lat - a.lat);
    const dLng = this.toRad(b.lng - a.lng);
    const lat1 = this.toRad(a.lat);
    const lat2 = this.toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * earthKm * Math.asin(Math.sqrt(h));
  }

  private toRad(value: number) {
    return (value * Math.PI) / 180;
  }
}

