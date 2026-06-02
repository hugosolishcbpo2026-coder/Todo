import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/auth.decorators";
import { AdminService } from "./admin.service";

@ApiTags("admin")
@ApiBearerAuth()
@Roles("admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("live")
  live() {
    return this.admin.liveOperations();
  }

  @Get("analytics")
  analytics() {
    return this.admin.analytics();
  }

  @Get("rides")
  rides() {
    return this.admin.recentRides();
  }
}
