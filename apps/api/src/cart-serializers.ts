import { ProductStatus, type Cart, type CartItem, type Product, type ProductImage, type ProductSku } from "@prisma/client";

type CartItemWithSku = CartItem & {
  sku: ProductSku & {
    product: Product & {
      images: ProductImage[];
    };
  };
};

export type CartWithItems = Cart & {
  items: CartItemWithSku[];
};

function money(value: { toFixed: (digits: number) => string }) {
  return value.toFixed(2);
}

export function serializeCart(cart: CartWithItems) {
  const items = cart.items.map((item) => {
    const currentUnitPrice = money(item.sku.price);
    const snapshotUnitPrice = money(item.unitPriceSnapshot);
    const availableStock = item.sku.stockQuantity - item.sku.lockedStockQuantity;
    const productAvailable =
      item.sku.isActive && item.sku.product.status === ProductStatus.ACTIVE && item.sku.product.deletedAt === null;
    const priceChanged = currentUnitPrice !== snapshotUnitPrice;
    const insufficientStock = availableStock < item.quantity;
    const unavailable = !productAvailable;
    const image = item.sku.product.images.sort((a, b) => a.sortOrder - b.sortOrder)[0] ?? null;

    return {
      id: item.id,
      skuId: item.skuId,
      skuCode: item.sku.skuCode,
      skuName: item.sku.name,
      productId: item.sku.product.id,
      productName: item.sku.product.name,
      productSlug: item.sku.product.slug,
      image: image ? { url: image.url, altText: image.altText } : null,
      quantity: item.quantity,
      snapshotUnitPrice,
      currentUnitPrice,
      lineTotal: (Number(currentUnitPrice) * item.quantity).toFixed(2),
      availableStock,
      priceChanged,
      insufficientStock,
      unavailable,
      canPurchase: productAvailable && !insufficientStock
    };
  });

  return {
    id: cart.id,
    status: cart.status,
    userId: cart.userId,
    guestSessionId: cart.guestSessionId,
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: items.reduce((sum, item) => sum + Number(item.currentUnitPrice) * item.quantity, 0).toFixed(2),
    hasPriceChanges: items.some((item) => item.priceChanged),
    hasStockIssues: items.some((item) => item.insufficientStock || item.unavailable),
    canCheckout: items.length > 0 && items.every((item) => item.canPurchase)
  };
}

