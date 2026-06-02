import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { DriversService } from "./drivers.service";
import { OnboardingDto, SetOnlineDto, UpdateLocationDto } from "./drivers.dto";

@ApiTags("drivers")
@ApiBearerAuth()
@Roles("driver")
@Controller("drivers")
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Post("onboarding")
  onboard(@CurrentUser("sub") userId: string, @Body() dto: OnboardingDto) {
    return this.drivers.createOnboarding(userId, dto);
  }

  @Patch("me/online")
  setOnline(@CurrentUser("sub") userId: string, @Body() dto: SetOnlineDto) {
    return this.drivers.setOnline(userId, dto.online);
  }

  @Post("me/location")
  updateLocation(@CurrentUser("sub") userId: string, @Body() dto: UpdateLocationDto) {
    return this.drivers.updateLocation(userId, dto);
  }

  @Get("me/earnings")
  earnings(@CurrentUser("sub") userId: string) {
    return this.drivers.getEarnings(userId);
  }
}
