import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { MembershipPlan } from "@todo/shared";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { MembershipService } from "./membership.service";

class ActivateMembershipDto {
  @IsIn(["daily", "monthly"])
  plan!: MembershipPlan;
}

@ApiTags("membership")
@ApiBearerAuth()
@Roles("driver")
@Controller("membership")
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  @Post("activate")
  activate(@CurrentUser("sub") userId: string, @Body() dto: ActivateMembershipDto) {
    return this.membership.activate(userId, dto.plan);
  }

  @Get("status")
  status(@CurrentUser("sub") userId: string) {
    return this.membership.status(userId);
  }
}
