import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  requestOtp(phone: string) {
    return {
      phone,
      status: "sent",
      channel: "sms",
      devCode: process.env.NODE_ENV === "production" ? undefined : "000000"
    };
  }

  verifyOtp(input: { phone: string; code: string; role: string }) {
    const token = this.jwt.sign({
      sub: `usr_${input.phone.replace(/\D/g, "")}`,
      phone: input.phone,
      role: input.role
    });

    return {
      accessToken: token,
      user: {
        id: `usr_${input.phone.replace(/\D/g, "")}`,
        phone: input.phone,
        role: input.role
      }
    };
  }
}

