import { Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("driver-membership/daily")
  dailyMembership() {
    return this.payments.createMembershipCheckout("daily");
  }

  @Post("driver-membership/monthly")
  monthlyMembership() {
    return this.payments.createMembershipCheckout("monthly");
  }
}

