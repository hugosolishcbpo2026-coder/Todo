import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { RideRequestDto } from "./rides.dto";
import { RidesService } from "./rides.service";

@ApiTags("rides")
@ApiBearerAuth()
@Controller("rides")
export class RidesController {
  constructor(private readonly rides: RidesService) {}

  @Roles("rider")
  @Post("estimate")
  estimate(@Body() dto: RideRequestDto) {
    return this.rides.estimate(dto);
  }

  @Roles("rider")
  @Post()
  requestRide(@CurrentUser("sub") riderId: string, @Body() dto: RideRequestDto) {
    return this.rides.requestRide(riderId, dto);
  }

  @Get(":id")
  getRide(@Param("id") id: string) {
    return this.rides.getRide(id);
  }

  @Roles("driver")
  @Post(":id/accept")
  accept(@Param("id") id: string, @CurrentUser("sub") driverUserId: string) {
    return this.rides.acceptRide(id, driverUserId);
  }

  @Roles("driver")
  @Post(":id/arrive")
  arrive(@Param("id") id: string) {
    return this.rides.advance(id, "driver_arriving");
  }

  @Roles("driver")
  @Post(":id/start")
  start(@Param("id") id: string) {
    return this.rides.advance(id, "in_progress");
  }

  @Roles("driver")
  @Post(":id/complete")
  complete(@Param("id") id: string) {
    return this.rides.completeRide(id);
  }

  @Post(":id/cancel")
  cancel(@Param("id") id: string) {
    return this.rides.cancelRide(id);
  }
}
