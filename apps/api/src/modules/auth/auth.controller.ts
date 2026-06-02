import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";

class RequestOtpDto {
  phone!: string;
}

class VerifyOtpDto {
  phone!: string;
  code!: string;
  role!: "rider" | "driver" | "admin" | "support";
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("otp/request")
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Post("otp/verify")
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @Get("me")
  me() {
    return {
      id: "dev-user",
      role: "admin",
      name: "Todo Operator",
      permissions: ["admin:read", "admin:write"]
    };
  }
}

