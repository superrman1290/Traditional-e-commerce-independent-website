import type { Order, OrderItem, Payment, PaymentCallback, Refund, Shipment } from "@prisma/client";

export type OrderWithItems = Order & {
  items: OrderItem[];
  shipment?: Shipment | null;
  payments?: Array<Payment & { callbacks?: PaymentCallback[]; refunds?: Refund[] }>;
};

function money(value: { toFixed: (digits: number) => string }) {
  return value.toFixed(2);
}

export function serializeOrder(order: OrderWithItems) {
  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    couponCode: order.couponCode,
    addressSnapshot: order.addressSnapshot,
    subtotalAmount: money(order.subtotalAmount),
    shippingFee: money(order.shippingFee),
    discountAmount: money(order.discountAmount),
    totalAmount: money(order.totalAmount),
    paidAmount: order.paidAmount ? money(order.paidAmount) : null,
    paidCurrency: order.paidCurrency,
    paidAt: order.paidAt?.toISOString() ?? null,
    expiresAt: order.expiresAt.toISOString(),
    closedAt: order.closedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    shipment: order.shipment
      ? {
          id: order.shipment.id,
          carrierName: order.shipment.carrierName,
          carrierCode: order.shipment.carrierCode,
          trackingNumber: order.shipment.trackingNumber,
          trackingUrl: order.shipment.trackingUrl,
          shippedAt: order.shipment.shippedAt.toISOString(),
          autoConfirmAt: order.shipment.autoConfirmAt.toISOString(),
          confirmedAt: order.shipment.confirmedAt?.toISOString() ?? null,
          createdAt: order.shipment.createdAt.toISOString()
        }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      skuId: item.skuId,
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      skuCode: item.skuCode,
      skuName: item.skuName,
      optionSignature: item.optionSignature as Record<string, string>,
      imageUrl: item.imageUrl,
      quantity: item.quantity,
      unitPrice: money(item.unitPrice),
      lineTotal: money(item.lineTotal)
    })),
    payments:
      order.payments?.map((payment) => ({
        id: payment.id,
        provider: payment.provider,
        status: payment.status,
        amount: money(payment.amount),
        currency: payment.currency,
        providerPaymentId: payment.providerPaymentId,
        checkoutUrl: payment.checkoutUrl,
        failureReason: payment.failureReason,
        paidAt: payment.paidAt?.toISOString() ?? null,
        createdAt: payment.createdAt.toISOString(),
        callbacks: payment.callbacks?.map((callback) => ({
          id: callback.id,
          providerEventId: callback.providerEventId,
          isVerified: callback.isVerified,
          processingResult: callback.processingResult,
          processedAt: callback.processedAt?.toISOString() ?? null
        })) ?? [],
        refunds: payment.refunds?.map((refund) => ({
          id: refund.id,
          amount: money(refund.amount),
          currency: refund.currency,
          status: refund.status,
          reason: refund.reason,
          providerRefundId: refund.providerRefundId
        })) ?? []
      })) ?? []
  };
}
