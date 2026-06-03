import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { PAID_PLANS, PLAN_CATALOG, SubscriptionPlan } from "@todo/shared";
import { AuthUser, CurrentUser, Public, Roles } from "../auth/auth.decorators";
import { PaymentsService } from "./payments.service";

class CheckoutDto {
  @IsIn(PAID_PLANS)
  plan!: SubscriptionPlan;
}

@ApiTags("payments")
@ApiBearerAuth()
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  // --- Driver daily/monthly membership ------------------------------------

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

  // --- Tiered subscriptions -----------------------------------------------

  @Public()
  @Get("plans")
  plans() {
    return PLAN_CATALOG;
  }

  @Post("subscription/checkout")
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.payments.startSubscriptionCheckout(user.sub, dto.plan, user.phone);
  }

  @Post("subscription/portal")
  portal(@CurrentUser("sub") userId: string) {
    return this.payments.openCustomerPortal(userId);
  }

  @Get("subscription")
  subscription(@CurrentUser("sub") userId: string) {
    return this.payments.getSubscription(userId);
  }

  // --- Admin ---------------------------------------------------------------

  @Roles("admin")
  @Get("subscriptions")
  subscriptions() {
    return this.payments.listSubscriptions();
  }

  @Roles("admin")
  @Get()
  list() {
    return this.payments.listPayments();
  }
}
