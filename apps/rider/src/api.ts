import { TodoApiClient } from "@todo/shared";

/**
 * API base URL. On a physical device, localhost points at the phone, so set
 * EXPO_PUBLIC_API_URL to the dev machine's LAN IP (e.g. http://192.168.0.10:4000/api/v1).
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Shared rider API client. Token is held in memory for the session. */
export const api = new TodoApiClient(API_URL);

/** Preset Los Cabos coordinates so the MVP works without map/geocoding. */
export const PRESET_LOCATIONS = {
  pickup: { label: "Cabo San Lucas Marina", lat: 22.8869, lng: -109.9122 },
  dropoff: { label: "San José del Cabo Centro", lat: 23.0631, lng: -109.6981 },
} as const;
