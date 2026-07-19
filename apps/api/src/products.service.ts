import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InventoryChangeType, Prisma, ProductStatus } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { serializeProduct } from "./product-serializers";

type ProductImageInput = {
  url: string;
  altText?: string;
};

type ProductOptionInput = {
  name: string;
  values: string[];
};

type ProductSkuInput = {
  skuCode: string;
  name: string;
  optionSignature: Record<string, string>;
  price: string | number;
  compareAtPrice?: string | number | null;
  costPrice?: string | number | null;
  weightGrams?: number | null;
  stockQuantity: number;
  lowStockThreshold?: number;
};

export type CreateProductInput = {
  categoryId?: string;
  category?: {
    name: string;
    slug: string;
    description?: string;
  };
  name: string;
  slug: string;
  summary?: string;
  description: string;
  status?: ProductStatus;
  images?: ProductImageInput[];
  options?: ProductOptionInput[];
  skus: ProductSkuInput[];
};

export type InventoryAdjustmentInput = {
  skuId: string;
  quantity: number;
  note?: string;
};

const catalogInclude = {
  category: true,
  images: true,
  options: {
    include: {
      values: true
    }
  },
  skus: true
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listCategories() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
  }

  async listPublicProducts(categorySlug?: string) {
    const products = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
        deletedAt: null,
        category: categorySlug
          ? {
              slug: categorySlug,
              isActive: true
            }
          : {
              isActive: true
            }
      },
      include: catalogInclude,
      orderBy: { createdAt: "desc" }
    });

    return products.map(serializeProduct);
  }

  async listAdminProducts() {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: catalogInclude,
      orderBy: { createdAt: "desc" }
    });

    return products.map(serializeProduct);
  }

  async getPublicProduct(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
        category: {
          isActive: true
        }
      },
      include: catalogInclude
    });

    if (!product) {
      throw new NotFoundException("Product is not available");
    }

    return serializeProduct(product);
  }

  async createProduct(input: CreateProductInput) {
    this.validateProductInput(input);

    const product = await this.prisma.$transaction(async (tx) => {
      const categoryId = input.categoryId ?? (await this.createCategoryIfNeeded(tx, input.category))?.id;

      const created = await tx.product.create({
        data: {
          categoryId,
          name: input.name.trim(),
          slug: input.slug.trim(),
          summary: input.summary?.trim(),
          description: input.description.trim(),
          status: input.status ?? ProductStatus.DRAFT,
          images: {
            create: input.images?.map((image, index) => ({
              url: image.url.trim(),
              altText: image.altText?.trim(),
              sortOrder: index + 1
            }))
          },
          options: {
            create: input.options?.map((option, optionIndex) => ({
              name: option.name.trim(),
              position: optionIndex + 1,
              values: {
                create: option.values.map((value, valueIndex) => ({
                  value: value.trim(),
                  position: valueIndex + 1
                }))
              }
            }))
          },
          skus: {
            create: input.skus.map((sku) => ({
              skuCode: sku.skuCode.trim(),
              name: sku.name.trim(),
              optionSignature: sku.optionSignature,
              price: sku.price,
              compareAtPrice: sku.compareAtPrice ?? null,
              costPrice: sku.costPrice ?? null,
              weightGrams: sku.weightGrams ?? null,
              stockQuantity: sku.stockQuantity,
              lowStockThreshold: sku.lowStockThreshold ?? 0
            }))
          }
        },
        include: catalogInclude
      });

      for (const sku of created.skus) {
        await tx.inventoryRecord.create({
          data: {
            skuId: sku.id,
            type: InventoryChangeType.INITIAL,
            quantity: sku.stockQuantity,
            beforeStock: 0,
            afterStock: sku.stockQuantity,
            note: "商品创建初始库存"
          }
        });
      }

      return created;
    });

    return serializeProduct(product);
  }

  async updateProductStatus(productId: string, status: ProductStatus) {
    if (!Object.values(ProductStatus).includes(status)) {
      throw new BadRequestException("Invalid product status");
    }

    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { status },
      include: catalogInclude
    });

    return serializeProduct(product);
  }

  async adjustInventory(input: InventoryAdjustmentInput) {
    if (!input.skuId || !Number.isInteger(input.quantity) || input.quantity === 0) {
      throw new BadRequestException("skuId and non-zero integer quantity are required");
    }

    return this.prisma.$transaction(async (tx) => {
      const sku = await tx.productSku.findUnique({
        where: { id: input.skuId }
      });

      if (!sku) {
        throw new NotFoundException("SKU not found");
      }

      const nextStock = sku.stockQuantity + input.quantity;
      if (nextStock < sku.lockedStockQuantity) {
        throw new BadRequestException("Stock cannot be lower than locked stock");
      }

      const updated = await tx.productSku.update({
        where: { id: input.skuId },
        data: {
          stockQuantity: nextStock
        }
      });

      const type = input.quantity > 0 ? InventoryChangeType.RESTOCK : InventoryChangeType.STOCK_OUT;
      const record = await tx.inventoryRecord.create({
        data: {
          skuId: input.skuId,
          type,
          quantity: input.quantity,
          beforeStock: sku.stockQuantity,
          afterStock: nextStock,
          note: input.note?.trim()
        }
      });

      return {
        skuId: updated.id,
        stockQuantity: updated.stockQuantity,
        lockedStockQuantity: updated.lockedStockQuantity,
        availableStock: updated.stockQuantity - updated.lockedStockQuantity,
        record
      };
    });
  }

  async listInventoryRecords(skuId?: string) {
    return this.prisma.inventoryRecord.findMany({
      where: skuId ? { skuId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  private async createCategoryIfNeeded(
    tx: Prisma.TransactionClient,
    category?: CreateProductInput["category"]
  ) {
    if (!category) {
      return null;
    }

    return tx.category.upsert({
      where: { slug: category.slug.trim() },
      update: {
        name: category.name.trim(),
        description: category.description?.trim(),
        isActive: true
      },
      create: {
        name: category.name.trim(),
        slug: category.slug.trim(),
        description: category.description?.trim()
      }
    });
  }

  private validateProductInput(input: CreateProductInput) {
    if (!input.name?.trim() || !input.slug?.trim() || !input.description?.trim()) {
      throw new BadRequestException("name, slug and description are required");
    }

    if (!input.categoryId && !input.category) {
      throw new BadRequestException("categoryId or category is required");
    }

    if (!input.skus?.length) {
      throw new BadRequestException("at least one SKU is required");
    }

    for (const sku of input.skus) {
      if (!sku.skuCode?.trim() || !sku.name?.trim()) {
        throw new BadRequestException("skuCode and SKU name are required");
      }

      if (Number(sku.price) < 0 || !Number.isInteger(sku.stockQuantity) || sku.stockQuantity < 0) {
        throw new BadRequestException("SKU price and stockQuantity must be valid");
      }
    }
  }
}
