import { Module } from "@nestjs/common";
import { RealtimeModule } from "../realtime/realtime.module";
import { DriversController } from "./drivers.controller";
import { DriversService } from "./drivers.service";

@Module({
  imports: [RealtimeModule],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
