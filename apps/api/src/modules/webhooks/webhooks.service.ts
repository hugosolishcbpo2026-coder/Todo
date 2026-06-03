import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type Stripe from "stripe";
import { SubscriptionPlan, SubscriptionStatus } from "@todo/shared";
import { StoreService } from "../core/store.service";
import { PaymentsService } from "../payments/payments.service";
import { StripeService } from "../payments/stripe.service";

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

  constructor(
    private readonly stripe: StripeService,
    private readonly payments: PaymentsService,
    private readonly store: StoreService,
  ) {}

  // --- Stripe --------------------------------------------------------------

  /**
   * Verify a Stripe webhook signature, dedupe by event id (replay protection),
   * and apply server-authoritative subscription state.
   */
  handleStripe(payload: Buffer, signature: string | undefined) {
    if (!signature) throw new BadRequestException("Missing stripe-signature header");

    let event: Stripe.Event;
    try {
      event = this.stripe.constructEvent(payload, signature);
    } catch (err) {
      this.logger.warn(`Stripe signature verification failed: ${(err as Error).message}`);
      throw new BadRequestException("Invalid Stripe signature");
    }

    if (this.store.isWebhookProcessed(event.id)) {
      return { received: true, duplicate: true, type: event.type };
    }
    this.store.markWebhookProcessed(event.id, "stripe", event.type);

    switch (event.type) {
      case "checkout.session.completed":
        this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        this.onSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        this.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        this.onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        this.logger.debug(`unhandled Stripe event: ${event.type}`);
    }
    return { received: true, type: event.type };
  }

  private planFromPriceId(priceId?: string): SubscriptionPlan | undefined {
    if (!priceId) return undefined;
    const map: Record<string, SubscriptionPlan> = {
      [process.env.STRIPE_PRICE_BASIC ?? "__basic"]: "basic",
      [process.env.STRIPE_PRICE_PREMIUM ?? "__premium"]: "premium",
      [process.env.STRIPE_PRICE_BUSINESS ?? "__business"]: "business",
    };
    return map[priceId];
  }

  private mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case "active":
        return "active";
      case "trialing":
        return "trialing";
      case "past_due":
        return "past_due";
      case "incomplete":
        return "incomplete";
      default:
        return "canceled";
    }
  }

  private idOf(value: string | { id: string } | null | undefined): string | undefined {
    if (!value) return undefined;
    return typeof value === "string" ? value : value.id;
  }

  private onCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.client_reference_id ?? session.metadata?.userId;
    const plan = (session.metadata?.plan as SubscriptionPlan) ?? "basic";
    if (!userId) return;
    this.payments.applySubscription({
      userId,
      plan,
      status: "active",
      stripeCustomerId: this.idOf(session.customer),
      stripeSubscriptionId: this.idOf(session.subscription),
    });
  }

  private resolveUserId(sub: Stripe.Subscription): string | undefined {
    const existing =
      this.store.getSubscriptionByStripeId(sub.id) ??
      (this.idOf(sub.customer)
        ? this.store.getSubscriptionByCustomer(this.idOf(sub.customer) as string)
        : undefined);
    return existing?.userId ?? sub.metadata?.userId;
  }

  private onSubscriptionUpdated(sub: Stripe.Subscription) {
    const userId = this.resolveUserId(sub);
    if (!userId) return;
    const priceId = sub.items?.data?.[0]?.price?.id;
    const plan = this.planFromPriceId(priceId) ?? this.store.getSubscriptionByUser(userId)?.plan ?? "basic";
    const periodEnd = (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end;
    this.payments.applySubscription({
      userId,
      plan,
      status: this.mapStatus(sub.status),
      stripeCustomerId: this.idOf(sub.customer),
      stripeSubscriptionId: sub.id,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined,
    });
  }

  private onSubscriptionDeleted(sub: Stripe.Subscription) {
    const userId = this.resolveUserId(sub);
    if (!userId) return;
    this.payments.applySubscription({ userId, plan: "free", status: "canceled" });
  }

  private onInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = this.idOf(invoice.customer);
    const existing = customerId ? this.store.getSubscriptionByCustomer(customerId) : undefined;
    if (!existing) return;
    this.payments.applySubscription({
      userId: existing.userId,
      plan: existing.plan,
      status: "past_due",
      stripeCustomerId: customerId,
      stripeSubscriptionId: existing.stripeSubscriptionId,
    });
  }

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
