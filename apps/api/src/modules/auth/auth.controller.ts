import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { CurrentUser, Public } from "./auth.decorators";
import { RequestOtpDto, VerifyOtpDto } from "./auth.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("otp/request")
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Public()
  @Post("otp/verify")
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @ApiBearerAuth()
  @Get("me")
  me(@CurrentUser("sub") userId: string) {
    return this.auth.me(userId);
  }
}
