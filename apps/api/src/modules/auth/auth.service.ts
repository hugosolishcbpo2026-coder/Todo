import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { StoreService } from "../core/store.service";
import { NotificationsService } from "../notifications/notifications.service";
import { VerifyOtpDto } from "./auth.dto";

const MOCK_CODE = "000000";

/**
 * OTP-based authentication.
 *
 * In mock mode (`NODE_ENV!=production` and `OTP_PROVIDER!=live`) the code is
 * fixed to "000000", returned as `devCode`, and accepted on verify — so local
 * dev needs no SMS/WhatsApp provider. In live mode a random code is generated,
 * stored with an expiry, delivered over WhatsApp, and checked on verify.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly store: StoreService,
    private readonly notifications: NotificationsService,
  ) {}

  private get devMode(): boolean {
    return process.env.NODE_ENV !== "production" && process.env.OTP_PROVIDER !== "live";
  }

  private get ttlMs(): number {
    return (Number(process.env.OTP_TTL_MINUTES) || 5) * 60 * 1000;
  }

  async requestOtp(phone: string) {
    const code = this.devMode ? MOCK_CODE : String(Math.floor(100000 + Math.random() * 900000));
    this.store.saveOtp(phone, code, new Date(Date.now() + this.ttlMs).toISOString());
    await this.notifications.sendOtp(phone, code);
    return {
      phone,
      status: "sent",
      channel: "whatsapp",
      devCode: this.devMode ? code : undefined,
    };
  }

  private isCodeValid(phone: string, code: string): boolean {
    if (this.devMode && code === MOCK_CODE) return true;
    const otp = this.store.getOtp(phone);
    if (!otp || otp.code !== code) return false;
    if (new Date(otp.expiresAt).getTime() < Date.now()) return false;
    return true;
  }

  verifyOtp(input: VerifyOtpDto) {
    if (!this.isCodeValid(input.phone, input.code)) {
      throw new UnauthorizedException("Invalid or expired verification code");
    }
    this.store.deleteOtp(input.phone);
    const user = this.store.upsertUserByPhone(input.phone, input.role, input.name);
    const accessToken = this.jwt.sign({ sub: user.id, phone: user.phone, role: user.role });
    return { accessToken, user };
  }

  me(userId: string) {
    return this.store.getUser(userId) ?? null;
  }
}
