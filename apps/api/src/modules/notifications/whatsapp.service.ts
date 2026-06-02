import { Injectable, Logger } from "@nestjs/common";

export interface WhatsAppResult {
  provider: "whatsapp";
  mode: "mock" | "sent" | "error";
  to: string;
  messageId?: string;
  error?: string;
  preview?: string;
}

/**
 * WhatsApp Business Platform (Cloud API) client.
 *
 * Sends real messages when WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID
 * are configured; otherwise runs in mock mode (logs + returns the payload) so
 * local development works without any credentials. Never throws — messaging is
 * best-effort and must not break the ride flow.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  private get accessToken(): string | undefined {
    return process.env.WHATSAPP_ACCESS_TOKEN;
  }

  private get phoneNumberId(): string | undefined {
    return process.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  private get configured(): boolean {
    return Boolean(this.accessToken && this.phoneNumberId);
  }

  private get endpoint(): string {
    const base = process.env.WHATSAPP_API_BASE ?? "https://graph.facebook.com";
    const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
    return `${base}/${version}/${this.phoneNumberId}/messages`;
  }

  /** Send a plain text message (valid inside the 24h customer service window). */
  sendText(to: string, body: string): Promise<WhatsAppResult> {
    return this.send(to, { messaging_product: "whatsapp", to, type: "text", text: { body } }, body);
  }

  /**
   * Send a pre-approved template message. `variables` fill the body component's
   * positional parameters ({{1}}, {{2}}, …) in order.
   */
  sendTemplate(to: string, template: string, variables: string[] = []): Promise<WhatsAppResult> {
    const components = variables.length
      ? [{ type: "body", parameters: variables.map((text) => ({ type: "text", text })) }]
      : undefined;
    return this.send(
      to,
      {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_LANG ?? "en_US" },
          components,
        },
      },
      `template:${template}(${variables.join(", ")})`,
    );
  }

  /** Deliver an OTP code — via an auth template if configured, else plain text. */
  sendOtp(to: string, code: string): Promise<WhatsAppResult> {
    const template = process.env.WHATSAPP_OTP_TEMPLATE;
    if (template) return this.sendTemplate(to, template, [code]);
    return this.sendText(to, `Your Todo verification code is ${code}. It expires in a few minutes.`);
  }

  private async send(to: string, payload: unknown, preview: string): Promise<WhatsAppResult> {
    if (!this.configured) {
      this.logger.log(`[mock] WhatsApp -> ${to}: ${preview}`);
      return { provider: "whatsapp", mode: "mock", to, preview };
    }
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        messages?: Array<{ id: string }>;
        error?: { message?: string };
      };
      if (!res.ok) {
        const error = data.error?.message ?? `HTTP ${res.status}`;
        this.logger.warn(`WhatsApp send failed to ${to}: ${error}`);
        return { provider: "whatsapp", mode: "error", to, error };
      }
      return { provider: "whatsapp", mode: "sent", to, messageId: data.messages?.[0]?.id };
    } catch (err) {
      const error = err instanceof Error ? err.message : "unknown error";
      this.logger.warn(`WhatsApp send error to ${to}: ${error}`);
      return { provider: "whatsapp", mode: "error", to, error };
    }
  }
}
