import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { DispatchService } from "./dispatch.service";
import { PricingService } from "./pricing.service";
import { RidesController } from "./rides.controller";
import { RidesService } from "./rides.service";

@Module({
  imports: [NotificationsModule, RealtimeModule],
  controllers: [RidesController],
  providers: [RidesService, PricingService, DispatchService],
  exports: [RidesService]
})
export class RidesModule {}

