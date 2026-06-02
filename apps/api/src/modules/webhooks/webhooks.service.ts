import { Injectable, Logger } from "@nestjs/common";

export interface InboundWhatsAppMessage {
  from: string;
  id: string;
  type: string;
  text?: string;
  timestamp?: string;
}

/** WhatsApp Cloud API webhook payload (only the fields we consume). */
interface WhatsAppWebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from: string;
          id: string;
          type: string;
          timestamp?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  /** Flatten a WhatsApp webhook into the inbound messages it carries. */
  parseWhatsApp(body: WhatsAppWebhookBody): InboundWhatsAppMessage[] {
    const messages: InboundWhatsAppMessage[] = [];
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const message of change.value?.messages ?? []) {
          messages.push({
            from: message.from,
            id: message.id,
            type: message.type,
            text: message.text?.body,
            timestamp: message.timestamp,
          });
        }
      }
    }
    return messages;
  }

  /**
   * Handle inbound customer messages. For now this logs and acknowledges; this
   * is the hook point for support routing / auto-replies in a later step.
   */
  handleInbound(body: WhatsAppWebhookBody): { received: true; messages: number } {
    const messages = this.parseWhatsApp(body);
    for (const message of messages) {
      this.logger.log(`inbound WhatsApp from ${message.from} (${message.type}): ${message.text ?? ""}`);
    }
    return { received: true, messages: messages.length };
  }
}
