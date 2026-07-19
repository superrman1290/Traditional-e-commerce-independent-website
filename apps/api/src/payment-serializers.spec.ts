import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { serializePayment, type PaymentWithRecords } from "./payment-serializers";

function decimal(value: string) {
  return { toFixed: () => value };
}

describe("serializePayment", () => {
  it("keeps payment, callback and refund records readable", () => {
    const payment = serializePayment({
      id: "payment-1",
      orderId: "order-1",
      provider: PaymentProvider.TEST,
      status: PaymentStatus.SUCCEEDED,
      amount: decimal("279.00"),
      currency: "CNY",
      idempotencyKey: "pay-1",
      providerPaymentId: "test-payment-1",
      checkoutUrl: "http://localhost:3000/pay/test",
      failureReason: null,
      rawRequest: null,
      paidAt: new Date("2026-07-19T00:01:00.000Z"),
      expiresAt: new Date("2026-07-19T00:30:00.000Z"),
      createdAt: new Date("2026-07-19T00:00:00.000Z"),
      updatedAt: new Date("2026-07-19T00:01:00.000Z"),
      callbacks: [
        {
          id: "callback-1",
          paymentId: "payment-1",
          provider: PaymentProvider.TEST,
          providerEventId: "evt-1",
          providerPaymentId: "test-payment-1",
          rawPayload: {},
          signature: "sig",
          isVerified: true,
          processedAt: new Date("2026-07-19T00:01:00.000Z"),
          processingResult: "payment_succeeded",
          createdAt: new Date("2026-07-19T00:01:00.000Z")
        }
      ],
      refunds: []
    } as unknown as PaymentWithRecords);

    expect(payment.amount).toBe("279.00");
    expect(payment.callbacks[0]?.processingResult).toBe("payment_succeeded");
  });
});
