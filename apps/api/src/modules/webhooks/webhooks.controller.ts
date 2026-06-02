import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/auth.decorators";
import { WebhooksService } from "./webhooks.service";

@ApiTags("webhooks")
@Public()
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post("stripe")
  stripe(@Body() body: unknown) {
    // TODO: verify the Stripe-Signature header against STRIPE_WEBHOOK_SECRET.
    return { received: true, provider: "stripe", body };
  }

  /** WhatsApp webhook verification handshake (Meta calls this on setup). */
  @Get("whatsapp")
  verifyWhatsApp(
    @Query("hub.challenge") challenge?: string,
    @Query("hub.verify_token") token?: string,
  ) {
    if (token && token === process.env.WHATSAPP_VERIFY_TOKEN) return challenge ?? "";
    return { error: "invalid_verify_token" };
  }

  @Post("whatsapp")
  whatsapp(@Body() body: unknown) {
    return this.webhooks.handleInbound(body as Parameters<WebhooksService["handleInbound"]>[0]);
  }
}
