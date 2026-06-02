import { io, Socket } from "socket.io-client";
import { RealtimeEvents, Ride, socketUrlFromApiUrl } from "@todo/shared";
import { api } from "./api";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Subscribe to a single ride's live updates. Re-subscribes on reconnect and
 * syncs the current ride state via the subscribe acknowledgement, so no
 * status change is missed across a dropped connection.
 */
export function connectRideSocket(rideId: string, onUpdate: (ride: Ride) => void): Socket {
  const socket = io(socketUrlFromApiUrl(API_URL), {
    transports: ["websocket"],
    auth: { token: api.hasToken() ? "rider" : undefined },
  });
  socket.on("connect", () => {
    socket.emit(RealtimeEvents.RideSubscribe, { rideId }, (ack?: { ride: Ride | null }) => {
      if (ack?.ride) onUpdate(ack.ride);
    });
  });
  socket.on(RealtimeEvents.RideUpdate, (ride: Ride) => onUpdate(ride));
  return socket;
}
