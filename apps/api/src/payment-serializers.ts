import type { Payment, PaymentCallback, Refund } from "@prisma/client";

export type PaymentWithRecords = Payment & {
  callbacks?: PaymentCallback[];
  refunds?: Refund[];
};

function money(value: { toFixed: (digits: number) => string }) {
  return value.toFixed(2);
}

export function serializePayment(payment: PaymentWithRecords) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    status: payment.status,
    amount: money(payment.amount),
    currency: payment.currency,
    idempotencyKey: payment.idempotencyKey,
    providerPaymentId: payment.providerPaymentId,
    checkoutUrl: payment.checkoutUrl,
    failureReason: payment.failureReason,
    paidAt: payment.paidAt?.toISOString() ?? null,
    expiresAt: payment.expiresAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    callbacks: payment.callbacks?.map((callback) => ({
      id: callback.id,
      providerEventId: callback.providerEventId,
      providerPaymentId: callback.providerPaymentId,
      isVerified: callback.isVerified,
      processedAt: callback.processedAt?.toISOString() ?? null,
      processingResult: callback.processingResult,
      createdAt: callback.createdAt.toISOString()
    })) ?? [],
    refunds: payment.refunds?.map((refund) => ({
      id: refund.id,
      amount: money(refund.amount),
      currency: refund.currency,
      status: refund.status,
      reason: refund.reason,
      providerRefundId: refund.providerRefundId,
      createdAt: refund.createdAt.toISOString()
    })) ?? []
  };
}
