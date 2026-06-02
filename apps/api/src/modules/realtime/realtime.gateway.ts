import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { StoreService } from "../core/store.service";

/**
 * Socket.IO gateway for live ride/driver tracking.
 *
 * Rooms:
 *  - `ride:<rideId>`     rider + driver of a specific ride
 *  - `driver:<driverId>` a single driver's channel
 *  - `admin:live-map`    operations dashboard
 *
 * Reconnection: Socket.IO transparently reconnects; clients simply re-emit
 * their `*:subscribe` events on reconnect and receive the latest snapshot.
 */
@WebSocketGateway({ cors: true })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server?: Server;

  constructor(private readonly store: StoreService) {}

  handleConnection(client: Socket) {
    this.logger.debug(`socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`socket disconnected: ${client.id}`);
  }

  // --- Subscriptions -------------------------------------------------------

  @SubscribeMessage("ride:subscribe")
  subscribeRide(@ConnectedSocket() client: Socket, @MessageBody() body: { rideId: string }) {
    void client.join(`ride:${body.rideId}`);
    return { subscribed: `ride:${body.rideId}`, ride: this.store.getRide(body.rideId) ?? null };
  }

  @SubscribeMessage("driver:subscribe")
  subscribeDriver(@ConnectedSocket() client: Socket, @MessageBody() body: { driverId: string }) {
    void client.join(`driver:${body.driverId}`);
    return { subscribed: `driver:${body.driverId}` };
  }

  @SubscribeMessage("admin:subscribe")
  subscribeAdmin(@ConnectedSocket() client: Socket) {
    void client.join("admin:live-map");
    return { subscribed: "admin:live-map", snapshot: this.store.snapshot() };
  }

  /** Driver app streams GPS over the socket; persist + fan out. */
  @SubscribeMessage("driver:location")
  ingestLocation(
    @MessageBody() body: { driverId: string; lat: number; lng: number; headingDeg?: number },
  ) {
    const location = {
      lat: body.lat,
      lng: body.lng,
      headingDeg: body.headingDeg,
      updatedAt: new Date().toISOString(),
    };
    this.store.updateDriverLocation(body.driverId, location);
    this.emitDriverLocation(body.driverId, { driverId: body.driverId, ...location });
    return { accepted: true };
  }

  // --- Server-side emitters (called by services) ---------------------------

  emitRideUpdate(rideId: string, payload: unknown) {
    this.server?.to(`ride:${rideId}`).emit("ride:update", payload);
    this.server?.to("admin:live-map").emit("admin:ride:update", payload);
  }

  emitDriverLocation(driverId: string, payload: unknown) {
    this.server?.to(`driver:${driverId}`).emit("driver:location", payload);
    this.server?.to("admin:live-map").emit("admin:driver:location", payload);
  }
}
