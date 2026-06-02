import { Injectable } from "@nestjs/common";

interface WhatsAppTemplateMessage {
  to: string;
  template: string;
  variables: Record<string, string>;
}

@Injectable()
export class WhatsAppService {
  async sendTemplate(message: WhatsAppTemplateMessage) {
    if (!process.env.WHATSAPP_ACCESS_TOKEN) {
      return {
        provider: "whatsapp",
        mode: "mock",
        message
      };
    }

    return {
      provider: "whatsapp",
      mode: "queued",
      message
    };
  }
}

