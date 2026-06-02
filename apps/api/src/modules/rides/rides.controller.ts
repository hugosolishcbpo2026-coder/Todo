import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RideRequest } from "@todo/shared";
import { RidesService } from "./rides.service";

@ApiTags("rides")
@Controller("rides")
export class RidesController {
  constructor(private readonly rides: RidesService) {}

  @Post("estimate")
  estimate(@Body() dto: RideRequest) {
    return this.rides.estimate(dto);
  }

  @Post()
  requestRide(@Body() dto: RideRequest) {
    return this.rides.requestRide(dto);
  }

  @Get(":id")
  getRide(@Param("id") id: string) {
    return this.rides.getRide(id);
  }

  @Post(":id/accept")
  accept(@Param("id") id: string, @Body("driverId") driverId: string) {
    return this.rides.acceptRide(id, driverId);
  }

  @Post(":id/complete")
  complete(@Param("id") id: string) {
    return this.rides.completeRide(id);
  }
}

