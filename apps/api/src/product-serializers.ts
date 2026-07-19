import type {
  Category,
  Product,
  ProductImage,
  ProductOption,
  ProductOptionValue,
  ProductSku
} from "@prisma/client";

type ProductWithCatalog = Product & {
  category: Category | null;
  images: ProductImage[];
  options: Array<ProductOption & { values: ProductOptionValue[] }>;
  skus: ProductSku[];
};

export function serializeProduct(product: ProductWithCatalog) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    summary: product.summary,
    description: product.description,
    status: product.status,
    category: product.category
      ? {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
          description: product.category.description,
          isActive: product.category.isActive
        }
      : null,
    images: product.images
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((image) => ({
        id: image.id,
        url: image.url,
        altText: image.altText,
        sortOrder: image.sortOrder
      })),
    options: product.options
      .sort((a, b) => a.position - b.position)
      .map((option) => ({
        id: option.id,
        name: option.name,
        position: option.position,
        values: option.values
          .sort((a, b) => a.position - b.position)
          .map((value) => ({
            id: value.id,
            value: value.value,
            position: value.position
          }))
      })),
    skus: product.skus.map((sku) => ({
      id: sku.id,
      skuCode: sku.skuCode,
      name: sku.name,
      price: sku.price.toFixed(2),
      compareAtPrice: sku.compareAtPrice?.toFixed(2) ?? null,
      stockQuantity: sku.stockQuantity,
      lockedStockQuantity: sku.lockedStockQuantity,
      availableStock: sku.stockQuantity - sku.lockedStockQuantity,
      lowStockThreshold: sku.lowStockThreshold,
      isActive: sku.isActive,
      optionSignature: sku.optionSignature as Record<string, string>
    })),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString()
  };
}

