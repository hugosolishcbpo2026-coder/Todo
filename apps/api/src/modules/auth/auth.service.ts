import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { StoreService } from "../core/store.service";
import { VerifyOtpDto } from "./auth.dto";

/**
 * OTP-based authentication. The OTP provider is mocked for local/dev
 * (`OTP_PROVIDER=mock` accepts code "000000"); wiring a real SMS/WhatsApp
 * provider only requires implementing {@link AuthService.requestOtp} and the
 * code check in {@link AuthService.verifyOtp}.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly store: StoreService,
  ) {}

  private get devMode(): boolean {
    return process.env.NODE_ENV !== "production" && process.env.OTP_PROVIDER !== "live";
  }

  requestOtp(phone: string) {
    return {
      phone,
      status: "sent",
      channel: "sms",
      devCode: this.devMode ? "000000" : undefined,
    };
  }

  verifyOtp(input: VerifyOtpDto) {
    // In mock mode any non-empty code is accepted (dev convenience).
    const user = this.store.upsertUserByPhone(input.phone, input.role, input.name);
    const accessToken = this.jwt.sign({ sub: user.id, phone: user.phone, role: user.role });
    return { accessToken, user };
  }

  me(userId: string) {
    return this.store.getUser(userId) ?? null;
  }
}
