import type { Order, OrderItem } from "@prisma/client";

export type OrderWithItems = Order & {
  items: OrderItem[];
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
    expiresAt: order.expiresAt.toISOString(),
    closedAt: order.closedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
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
    }))
  };
}

