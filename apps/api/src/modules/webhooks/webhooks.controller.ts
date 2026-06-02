import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/auth.decorators";

@ApiTags("webhooks")
@Public()
@Controller("webhooks")
export class WebhooksController {
  @Post("stripe")
  stripe(@Body() body: unknown) {
    return { received: true, provider: "stripe", body };
  }

  @Get("whatsapp")
  verifyWhatsApp(@Query("hub.challenge") challenge?: string, @Query("hub.verify_token") token?: string) {
    if (token === process.env.WHATSAPP_VERIFY_TOKEN) return challenge ?? "";
    return { error: "invalid_verify_token" };
  }

  @Post("whatsapp")
  whatsapp(@Body() body: unknown) {
    return { received: true, provider: "whatsapp", body };
  }
}

