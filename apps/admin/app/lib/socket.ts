"use client";

import { io, Socket } from "socket.io-client";
import { RealtimeEvents, socketUrlFromApiUrl } from "@todo/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Connect to the live-operations channel. `onChange` fires whenever a ride or
 * driver update arrives so the dashboard can refresh. Auto-reconnects and
 * re-subscribes on `connect`.
 */
export function connectAdminSocket(onChange: () => void): Socket {
  const socket = io(socketUrlFromApiUrl(API_URL), { transports: ["websocket"] });
  socket.on("connect", () => socket.emit(RealtimeEvents.AdminSubscribe));
  socket.on(RealtimeEvents.AdminRideUpdate, onChange);
  socket.on(RealtimeEvents.AdminDriverLocation, onChange);
  return socket;
}
