import { CartStatus, ProductStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { serializeCart, type CartWithItems } from "./cart-serializers";

function decimal(value: string) {
  return { toFixed: () => value };
}

describe("serializeCart", () => {
  it("flags price changes and insufficient stock", () => {
    const cart = serializeCart({
      id: "cart-1",
      userId: "user-1",
      guestSessionId: null,
      status: CartStatus.ACTIVE,
      createdAt: new Date("2026-07-19T00:00:00.000Z"),
      updatedAt: new Date("2026-07-19T00:00:00.000Z"),
      items: [
        {
          id: "item-1",
          cartId: "cart-1",
          skuId: "sku-1",
          quantity: 4,
          unitPriceSnapshot: decimal("299.00"),
          createdAt: new Date("2026-07-19T00:00:00.000Z"),
          updatedAt: new Date("2026-07-19T00:00:00.000Z"),
          sku: {
            id: "sku-1",
            productId: "product-1",
            skuCode: "TEA-SET-CELADON",
            name: "Celadon set",
            optionSignature: { color: "Celadon" },
            costPrice: null,
            price: decimal("319.00"),
            compareAtPrice: null,
            weightGrams: null,
            stockQuantity: 3,
            lockedStockQuantity: 0,
            lowStockThreshold: 1,
            isActive: true,
            createdAt: new Date("2026-07-19T00:00:00.000Z"),
            updatedAt: new Date("2026-07-19T00:00:00.000Z"),
            product: {
              id: "product-1",
              categoryId: null,
              name: "Tea set",
              slug: "handmade-tea-set",
              summary: null,
              description: "Handmade tea set",
              status: ProductStatus.ACTIVE,
              deletedAt: null,
              createdAt: new Date("2026-07-19T00:00:00.000Z"),
              updatedAt: new Date("2026-07-19T00:00:00.000Z"),
              images: []
            }
          }
        }
      ]
    } as unknown as CartWithItems);

    expect(cart.hasPriceChanges).toBe(true);
    expect(cart.hasStockIssues).toBe(true);
    expect(cart.canCheckout).toBe(false);
    expect(cart.items[0]?.currentUnitPrice).toBe("319.00");
  });
});

