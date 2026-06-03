import { Body, Controller, Get, Headers, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/auth.decorators";
import { WebhooksService } from "./webhooks.service";

/** Minimal shape Nest populates when created with `{ rawBody: true }`. */
interface RawRequest {
  rawBody?: Buffer;
  body?: unknown;
}

@ApiTags("webhooks")
@Public()
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post("stripe")
  stripe(@Req() req: RawRequest, @Headers("stripe-signature") signature?: string) {
    // Verify against the exact raw bytes (falls back to JSON-serialized body if absent).
    const payload = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    return this.webhooks.handleStripe(payload, signature);
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
