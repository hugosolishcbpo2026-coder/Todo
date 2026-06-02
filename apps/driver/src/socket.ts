import { io, Socket } from "socket.io-client";
import { RealtimeEvents, Ride, RideOfferTakenPayload, socketUrlFromApiUrl } from "@todo/shared";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export interface DriverSocketHandlers {
  onOffer: (ride: Ride) => void;
  onTaken: (payload: RideOfferTakenPayload) => void;
  onConnect: () => void;
}

/** Connect to the driver realtime channel for push ride offers. */
export function connectDriverSocket(handlers: DriverSocketHandlers): Socket {
  const socket = io(socketUrlFromApiUrl(API_URL), { transports: ["websocket"] });
  socket.on("connect", handlers.onConnect);
  socket.on(RealtimeEvents.RideOffer, handlers.onOffer);
  socket.on(RealtimeEvents.RideOfferTaken, handlers.onTaken);
  return socket;
}
