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
import { RealtimeEvents, Ride } from "@todo/shared";
import { StoreService } from "../core/store.service";

const DRIVERS_ROOM = "drivers:available";

/**
 * Socket.IO gateway for live ride/driver tracking and push dispatch.
 *
 * Rooms:
 *  - `ride:<rideId>`     rider + driver of a specific ride
 *  - `driver:<driverId>` a single driver's channel
 *  - `drivers:available` online drivers eligible for ride offers
 *  - `admin:live-map`    operations dashboard
 *
 * Reconnection: Socket.IO transparently reconnects; clients re-emit their
 * `*:subscribe` events on `connect` and receive the latest snapshot.
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

  @SubscribeMessage(RealtimeEvents.RideSubscribe)
  subscribeRide(@ConnectedSocket() client: Socket, @MessageBody() body: { rideId: string }) {
    void client.join(`ride:${body.rideId}`);
    return { subscribed: `ride:${body.rideId}`, ride: this.store.getRide(body.rideId) ?? null };
  }

  @SubscribeMessage(RealtimeEvents.DriverSubscribe)
  subscribeDriver(@ConnectedSocket() client: Socket, @MessageBody() body: { driverId: string }) {
    void client.join(`driver:${body.driverId}`);
    return { subscribed: `driver:${body.driverId}` };
  }

  /** A driver going online joins the offers room. */
  @SubscribeMessage(RealtimeEvents.DriversSubscribe)
  subscribeDrivers(@ConnectedSocket() client: Socket) {
    void client.join(DRIVERS_ROOM);
    return { subscribed: DRIVERS_ROOM };
  }

  @SubscribeMessage(RealtimeEvents.DriversUnsubscribe)
  unsubscribeDrivers(@ConnectedSocket() client: Socket) {
    void client.leave(DRIVERS_ROOM);
    return { unsubscribed: DRIVERS_ROOM };
  }

  @SubscribeMessage(RealtimeEvents.AdminSubscribe)
  subscribeAdmin(@ConnectedSocket() client: Socket) {
    void client.join("admin:live-map");
    return { subscribed: "admin:live-map", snapshot: this.store.snapshot() };
  }

  /** Driver app streams GPS over the socket; persist + fan out. */
  @SubscribeMessage(RealtimeEvents.DriverLocationIngest)
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
    this.server?.to(`ride:${rideId}`).emit(RealtimeEvents.RideUpdate, payload);
    this.server?.to("admin:live-map").emit(RealtimeEvents.AdminRideUpdate, payload);
  }

  /** Push a new ride request to all online drivers. */
  emitRideOffer(ride: Ride) {
    this.server?.to(DRIVERS_ROOM).emit(RealtimeEvents.RideOffer, ride);
    this.server?.to("admin:live-map").emit(RealtimeEvents.AdminRideUpdate, ride);
  }

  /** Tell drivers an offer is no longer available (accepted/cancelled). */
  emitRideTaken(rideId: string) {
    this.server?.to(DRIVERS_ROOM).emit(RealtimeEvents.RideOfferTaken, { rideId });
  }

  emitDriverLocation(driverId: string, payload: unknown) {
    this.server?.to(`driver:${driverId}`).emit(RealtimeEvents.DriverLocation, payload);
    this.server?.to("admin:live-map").emit(RealtimeEvents.AdminDriverLocation, payload);
  }
}
