import { OrderStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { serializeOrder, type OrderWithItems } from "./order-serializers";

function decimal(value: string) {
  return { toFixed: () => value };
}

describe("serializeOrder", () => {
  it("keeps immutable product and amount snapshots", () => {
    const order = serializeOrder({
      id: "order-1",
      orderNo: "ORD202607190001",
      userId: "user-1",
      cartId: "cart-1",
      couponId: null,
      couponCode: null,
      status: OrderStatus.PENDING_PAYMENT,
      idempotencyKey: "idem-1",
      addressSnapshot: { recipientName: "Ada" },
      subtotalAmount: decimal("299.00"),
      shippingFee: decimal("0.00"),
      discountAmount: decimal("20.00"),
      totalAmount: decimal("279.00"),
      expiresAt: new Date("2026-07-19T00:30:00.000Z"),
      closedAt: null,
      createdAt: new Date("2026-07-19T00:00:00.000Z"),
      shipment: null,
      updatedAt: new Date("2026-07-19T00:00:00.000Z"),
      items: [
        {
          id: "item-1",
          orderId: "order-1",
          skuId: "sku-1",
          productId: "product-1",
          productName: "Tea set",
          productSlug: "handmade-tea-set",
          skuCode: "TEA-SET-CELADON",
          skuName: "Celadon set",
          optionSignature: { glaze: "Celadon" },
          imageUrl: null,
          quantity: 1,
          unitPrice: decimal("299.00"),
          lineTotal: decimal("299.00"),
          createdAt: new Date("2026-07-19T00:00:00.000Z")
        }
      ]
    } as unknown as OrderWithItems);

    expect(order.orderNo).toBe("ORD202607190001");
    expect(order.totalAmount).toBe("279.00");
    expect(order.shipment).toBeNull();
    expect(order.items[0]?.productName).toBe("Tea set");
  });
});
