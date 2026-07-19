import { ProductStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { serializeProduct } from "./product-serializers";

describe("serializeProduct", () => {
  it("keeps independent SKU price and available stock", () => {
    const product = serializeProduct({
      id: "product-1",
      name: "茶具",
      slug: "tea-set",
      summary: null,
      description: "手作茶具",
      status: ProductStatus.ACTIVE,
      categoryId: null,
      deletedAt: null,
      createdAt: new Date("2026-07-19T00:00:00.000Z"),
      updatedAt: new Date("2026-07-19T00:00:00.000Z"),
      category: null,
      images: [],
      options: [],
      skus: [
        {
          id: "sku-1",
          productId: "product-1",
          skuCode: "SKU-A",
          name: "青瓷",
          optionSignature: { "釉色": "青瓷" },
          costPrice: null,
          price: { toFixed: () => "299.00" },
          compareAtPrice: null,
          weightGrams: null,
          stockQuantity: 10,
          lockedStockQuantity: 3,
          lowStockThreshold: 2,
          isActive: true,
          createdAt: new Date("2026-07-19T00:00:00.000Z"),
          updatedAt: new Date("2026-07-19T00:00:00.000Z")
        }
      ]
    } as never);

    expect(product.skus[0]?.price).toBe("299.00");
    expect(product.skus[0]?.availableStock).toBe(7);
  });
});

