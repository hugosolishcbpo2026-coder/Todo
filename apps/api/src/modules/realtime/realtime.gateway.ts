import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway({ cors: true })
export class RealtimeGateway {
  @WebSocketServer()
  server?: Server;

  emitRideUpdate(rideId: string, payload: unknown) {
    this.server?.to(`ride:${rideId}`).emit("ride:update", payload);
    this.server?.to("admin:live-map").emit("admin:ride:update", payload);
  }

  emitDriverLocation(driverId: string, payload: unknown) {
    this.server?.to(`driver:${driverId}`).emit("driver:location", payload);
    this.server?.to("admin:live-map").emit("admin:driver:location", payload);
  }
}

