import { PaymentStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { signPaymentCallback, TestPaymentAdapter, type PaymentCallbackPayload } from "./payment-adapters";

describe("TestPaymentAdapter", () => {
  it("verifies signed callbacks and rejects tampered amounts", () => {
    const adapter = new TestPaymentAdapter();
    const payload: PaymentCallbackPayload = {
      providerEventId: "evt-1",
      providerPaymentId: "test-payment-1",
      status: PaymentStatus.SUCCEEDED,
      amount: "279.00",
      currency: "CNY"
    };
    const signature = signPaymentCallback("dev-test-payment-secret", payload);

    expect(adapter.verifyCallback(payload, signature)).toBe(true);
    expect(adapter.verifyCallback({ ...payload, amount: "0.01" }, signature)).toBe(false);
  });
});
