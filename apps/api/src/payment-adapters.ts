import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { PaymentProvider, RefundStatus } from "@prisma/client";

export type PaymentCallbackPayload = {
  providerPaymentId: string;
  providerEventId: string;
  status: "SUCCEEDED" | "FAILED";
  amount: string;
  currency: string;
  failureReason?: string;
};

export type AdapterCreatePaymentInput = {
  orderId: string;
  orderNo: string;
  amount: string;
  currency: string;
  expiresAt: Date;
};

export type AdapterPaymentIntent = {
  providerPaymentId: string;
  checkoutUrl: string;
  rawRequest: Record<string, unknown>;
  expiresAt: Date;
};

export type AdapterRefundResult = {
  providerRefundId: string;
  status: RefundStatus;
  rawResponse: Record<string, unknown>;
};

export interface PaymentAdapter {
  provider: PaymentProvider;
  createPayment(input: AdapterCreatePaymentInput): AdapterPaymentIntent;
  verifyCallback(payload: PaymentCallbackPayload, signature?: string): boolean;
  createRefund(input: { paymentId: string; amount: string; currency: string; reason?: string }): AdapterRefundResult;
}

export function signPaymentCallback(secret: string, payload: PaymentCallbackPayload) {
  return createHmac("sha256", secret).update(canonicalCallbackPayload(payload)).digest("hex");
}

function canonicalCallbackPayload(payload: PaymentCallbackPayload) {
  return [
    payload.providerEventId,
    payload.providerPaymentId,
    payload.status,
    Number(payload.amount).toFixed(2),
    payload.currency.toUpperCase()
  ].join(".");
}

function verifyHmac(secret: string, payload: PaymentCallbackPayload, signature?: string) {
  if (!signature) {
    return false;
  }

  const expected = Buffer.from(signPaymentCallback(secret, payload), "hex");
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export class TestPaymentAdapter implements PaymentAdapter {
  provider = PaymentProvider.TEST;

  createPayment(input: AdapterCreatePaymentInput) {
    const providerPaymentId = `test_${randomUUID()}`;
    const storefrontUrl = process.env.STOREFRONT_URL ?? "http://localhost:3000";

    return {
      providerPaymentId,
      checkoutUrl: `${storefrontUrl}/pay/test?providerPaymentId=${providerPaymentId}`,
      rawRequest: {
        orderNo: input.orderNo,
        amount: input.amount,
        currency: input.currency,
        mode: "local-test"
      },
      expiresAt: input.expiresAt
    };
  }

  verifyCallback(payload: PaymentCallbackPayload, signature?: string) {
    return verifyHmac(process.env.TEST_PAYMENT_WEBHOOK_SECRET ?? "dev-test-payment-secret", payload, signature);
  }

  createRefund(input: { paymentId: string; amount: string; currency: string; reason?: string }) {
    return {
      providerRefundId: `test_refund_${randomUUID()}`,
      status: RefundStatus.SUCCEEDED,
      rawResponse: {
        paymentId: input.paymentId,
        amount: input.amount,
        currency: input.currency,
        reason: input.reason ?? null,
        mode: "local-test"
      }
    };
  }
}

export class StripePaymentAdapter implements PaymentAdapter {
  provider = PaymentProvider.STRIPE;

  createPayment(input: AdapterCreatePaymentInput) {
    const providerPaymentId = `stripe_session_${randomUUID()}`;
    const checkoutBaseUrl = process.env.STRIPE_CHECKOUT_BASE_URL ?? "https://checkout.stripe.com/c/pay";

    return {
      providerPaymentId,
      checkoutUrl: `${checkoutBaseUrl}/${providerPaymentId}`,
      rawRequest: {
        orderId: input.orderId,
        orderNo: input.orderNo,
        amount: input.amount,
        currency: input.currency,
        mode: "stripe-adapter"
      },
      expiresAt: input.expiresAt
    };
  }

  verifyCallback(payload: PaymentCallbackPayload, signature?: string) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    return secret ? verifyHmac(secret, payload, signature) : false;
  }

  createRefund(input: { paymentId: string; amount: string; currency: string; reason?: string }) {
    return {
      providerRefundId: `stripe_refund_${randomUUID()}`,
      status: RefundStatus.PROCESSING,
      rawResponse: {
        paymentId: input.paymentId,
        amount: input.amount,
        currency: input.currency,
        reason: input.reason ?? null,
        mode: "stripe-adapter"
      }
    };
  }
}

export function createPaymentAdapter(provider: PaymentProvider): PaymentAdapter {
  if (provider === PaymentProvider.TEST) {
    return new TestPaymentAdapter();
  }

  return new StripePaymentAdapter();
}
