import { DiscountType, InventoryChangeType, PrismaClient, ProductStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const category = await prisma.category.upsert({
    where: { slug: "traditional-crafts" },
    update: {
      name: "传统手作",
      description: "适合阶段 1 验收的实物商品分类",
      isActive: true
    },
    create: {
      name: "传统手作",
      slug: "traditional-crafts",
      description: "适合阶段 1 验收的实物商品分类",
      sortOrder: 1
    }
  });

  const product = await prisma.product.upsert({
    where: { slug: "handmade-tea-set" },
    update: {
      name: "手作陶瓷茶具套装",
      summary: "两种釉色 SKU，独立价格和库存。",
      description: "阶段 1 种子商品，用于验证分类、图片、SKU、上下架和库存流水。",
      status: ProductStatus.ACTIVE,
      categoryId: category.id,
      deletedAt: null
    },
    create: {
      name: "手作陶瓷茶具套装",
      slug: "handmade-tea-set",
      summary: "两种釉色 SKU，独立价格和库存。",
      description: "阶段 1 种子商品，用于验证分类、图片、SKU、上下架和库存流水。",
      status: ProductStatus.ACTIVE,
      categoryId: category.id
    }
  });

  await prisma.productImage.upsert({
    where: {
      id: "00000000-0000-4000-8000-000000000101"
    },
    update: {
      productId: product.id,
      url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1200&q=80",
      altText: "手作陶瓷茶具套装",
      sortOrder: 1
    },
    create: {
      id: "00000000-0000-4000-8000-000000000101",
      productId: product.id,
      url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1200&q=80",
      altText: "手作陶瓷茶具套装",
      sortOrder: 1
    }
  });

  const glazeOption = await prisma.productOption.upsert({
    where: {
      productId_name: {
        productId: product.id,
        name: "釉色"
      }
    },
    update: { position: 1 },
    create: {
      productId: product.id,
      name: "釉色",
      position: 1
    }
  });

  for (const [index, value] of ["青瓷", "白瓷"].entries()) {
    await prisma.productOptionValue.upsert({
      where: {
        optionId_value: {
          optionId: glazeOption.id,
          value
        }
      },
      update: { position: index + 1 },
      create: {
        optionId: glazeOption.id,
        value,
        position: index + 1
      }
    });
  }

  const skus = [
    {
      skuCode: "TEA-SET-CELADON",
      name: "青瓷套装",
      optionSignature: { "釉色": "青瓷" },
      price: "299.00",
      compareAtPrice: "359.00",
      stockQuantity: 18,
      lowStockThreshold: 5
    },
    {
      skuCode: "TEA-SET-WHITE",
      name: "白瓷套装",
      optionSignature: { "釉色": "白瓷" },
      price: "269.00",
      compareAtPrice: "329.00",
      stockQuantity: 8,
      lowStockThreshold: 5
    }
  ];

  for (const item of skus) {
    const sku = await prisma.productSku.upsert({
      where: { skuCode: item.skuCode },
      update: {
        productId: product.id,
        name: item.name,
        optionSignature: item.optionSignature,
        price: item.price,
        compareAtPrice: item.compareAtPrice,
        stockQuantity: item.stockQuantity,
        lowStockThreshold: item.lowStockThreshold,
        isActive: true
      },
      create: {
        productId: product.id,
        skuCode: item.skuCode,
        name: item.name,
        optionSignature: item.optionSignature,
        price: item.price,
        compareAtPrice: item.compareAtPrice,
        stockQuantity: item.stockQuantity,
        lowStockThreshold: item.lowStockThreshold
      }
    });

    const existingInitialRecord = await prisma.inventoryRecord.findFirst({
      where: {
        skuId: sku.id,
        type: InventoryChangeType.INITIAL
      }
    });

    if (!existingInitialRecord) {
      await prisma.inventoryRecord.create({
        data: {
          skuId: sku.id,
          type: InventoryChangeType.INITIAL,
          quantity: item.stockQuantity,
          beforeStock: 0,
          afterStock: item.stockQuantity,
          note: "阶段 1 初始化库存"
        }
      });
    }
  }

  await prisma.shippingTemplate.upsert({
    where: { id: "00000000-0000-4000-8000-000000000301" },
    update: {
      name: "Default shipping",
      province: null,
      baseFee: "15.00",
      freeShippingThreshold: "299.00",
      isActive: true
    },
    create: {
      id: "00000000-0000-4000-8000-000000000301",
      name: "Default shipping",
      province: null,
      baseFee: "15.00",
      freeShippingThreshold: "299.00",
      isActive: true
    }
  });

  await prisma.coupon.upsert({
    where: { code: "STAGE3" },
    update: {
      name: "Stage 3 checkout coupon",
      type: DiscountType.FIXED_AMOUNT,
      amount: "20.00",
      minSubtotal: "100.00",
      usageLimit: 100,
      isActive: true
    },
    create: {
      code: "STAGE3",
      name: "Stage 3 checkout coupon",
      type: DiscountType.FIXED_AMOUNT,
      amount: "20.00",
      minSubtotal: "100.00",
      usageLimit: 100,
      isActive: true
    }
  });

  const now = new Date();
  const endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await prisma.coupon.upsert({
    where: { code: "LIMITED26" },
    update: {
      name: "Stage 6 limited discount",
      type: DiscountType.PERCENTAGE,
      amount: "12.00",
      minSubtotal: "100.00",
      usageLimit: 50,
      startsAt: now,
      endsAt,
      isActive: true
    },
    create: {
      code: "LIMITED26",
      name: "Stage 6 limited discount",
      type: DiscountType.PERCENTAGE,
      amount: "12.00",
      minSubtotal: "100.00",
      usageLimit: 50,
      startsAt: now,
      endsAt,
      isActive: true
    }
  });

  for (const [index, faq] of [
    {
      question: "How do I request a refund?",
      answer: "Open Account, find the paid order, and submit an after-sales request with the amount and reason."
    },
    {
      question: "How do return refunds work?",
      answer: "Choose return and refund, add the return tracking number when available, and wait for admin review."
    },
    {
      question: "How do coupons work?",
      answer: "Enter the coupon code during checkout. Eligible full reduction and limited discount coupons are shown on Support."
    }
  ].entries()) {
    await prisma.faqEntry.upsert({
      where: { id: `00000000-0000-4000-8000-00000000040${index + 1}` },
      update: {
        question: faq.question,
        answer: faq.answer,
        sortOrder: index + 1,
        isActive: true
      },
      create: {
        id: `00000000-0000-4000-8000-00000000040${index + 1}`,
        question: faq.question,
        answer: faq.answer,
        sortOrder: index + 1,
        isActive: true
      }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
