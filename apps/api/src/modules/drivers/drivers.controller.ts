import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DriversService } from "./drivers.service";

@ApiTags("drivers")
@Controller("drivers")
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Post("onboarding")
  onboard(@Body() dto: unknown) {
    return this.drivers.createOnboarding(dto);
  }

  @Patch("me/online")
  setOnline(@Body("online") online: boolean) {
    return this.drivers.setOnline(online);
  }

  @Post("me/location")
  updateLocation(@Body() dto: { lat: number; lng: number }) {
    return this.drivers.updateLocation(dto);
  }

  @Get("me/earnings")
  earnings() {
    return this.drivers.getEarnings();
  }
}

