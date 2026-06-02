import { Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@ApiBearerAuth()
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Roles("driver")
  @Post("driver-membership/daily")
  dailyMembership(@CurrentUser("sub") userId: string) {
    return this.payments.createMembershipCheckout(userId, "daily");
  }

  @Roles("driver")
  @Post("driver-membership/monthly")
  monthlyMembership(@CurrentUser("sub") userId: string) {
    return this.payments.createMembershipCheckout(userId, "monthly");
  }

  @Roles("admin")
  @Get()
  list() {
    return this.payments.listPayments();
  }
}
