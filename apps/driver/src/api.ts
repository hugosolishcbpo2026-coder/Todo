import { TodoApiClient } from "@todo/shared";

/**
 * API base URL. On a physical device, localhost points at the phone, so set
 * EXPO_PUBLIC_API_URL to the dev machine's LAN IP (e.g. http://192.168.0.10:4000/api/v1).
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Shared driver API client. Token is held in memory for the session. */
export const api = new TodoApiClient(API_URL);

/** Preset driver location near the rider pickup so dispatch can match (MVP). */
export const DRIVER_START_LOCATION = { lat: 22.889, lng: -109.915 };
