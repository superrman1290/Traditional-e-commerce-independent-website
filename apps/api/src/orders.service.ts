import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CartStatus, DiscountType, OrderStatus, Prisma, ProductStatus } from "@prisma/client";
import { serializeOrder } from "./order-serializers";
import { PrismaService } from "./prisma.service";

const orderInclude = {
  items: {
    orderBy: { createdAt: "asc" }
  },
  payments: {
    include: {
      callbacks: {
        orderBy: { createdAt: "desc" }
      },
      refunds: {
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { createdAt: "desc" }
  }
} satisfies Prisma.OrderInclude;

const checkoutCartInclude = {
  items: {
    include: {
      sku: {
        include: {
          product: {
            include: {
              images: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "asc" }
  }
} satisfies Prisma.CartInclude;

type CheckoutCart = Prisma.CartGetPayload<{ include: typeof checkoutCartInclude }>;

export type CheckoutSummaryInput = {
  addressId?: string;
  couponCode?: string;
};

export type CreateOrderInput = {
  addressId: string;
  couponCode?: string;
  idempotencyKey: string;
};

@Injectable()
export class OrdersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getCheckoutSummary(userId: string, input: CheckoutSummaryInput) {
    await this.closeExpiredOrders();

    const cart = await this.getActiveCart(userId);
    const address = input.addressId
      ? await this.prisma.userAddress.findFirst({ where: { id: input.addressId, userId } })
      : await this.prisma.userAddress.findFirst({
          where: { userId },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
        });

    const summary = await this.calculateTotals(cart, address?.province, input.couponCode);

    return {
      cart: this.serializeCheckoutCart(cart),
      address,
      ...summary
    };
  }

  async createOrder(userId: string, input: CreateOrderInput) {
    await this.closeExpiredOrders();

    if (!input.addressId?.trim()) {
      throw new BadRequestException("addressId is required");
    }

    if (!input.idempotencyKey?.trim()) {
      throw new BadRequestException("idempotencyKey is required");
    }

    const existingByKey = await this.prisma.order.findUnique({
      where: {
        userId_idempotencyKey: {
          userId,
          idempotencyKey: input.idempotencyKey.trim()
        }
      },
      include: orderInclude
    });

    if (existingByKey) {
      return serializeOrder(existingByKey);
    }

    try {
      const order = await this.prisma.$transaction(
        async (tx) => {
          const cart = await tx.cart.findFirst({
            where: { userId, status: CartStatus.ACTIVE },
            include: checkoutCartInclude
          });

          if (!cart || cart.items.length === 0) {
            throw new BadRequestException("active cart is empty");
          }

          const existingByCart = await tx.order.findUnique({
            where: { cartId: cart.id },
            include: orderInclude
          });

          if (existingByCart) {
            return existingByCart;
          }

          const address = await tx.userAddress.findFirst({
            where: { id: input.addressId, userId }
          });

          if (!address) {
            throw new BadRequestException("valid address is required");
          }

          this.validateCartItems(cart);

          const totals = await this.calculateTotalsWithClient(tx, cart, address.province, input.couponCode);
          const orderNo = this.generateOrderNo();
          const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

          if (totals.coupon) {
            const updatedCoupons = await tx.$executeRawUnsafe(
              'UPDATE "coupons" SET "used_count" = "used_count" + 1 WHERE "id" = $1::uuid AND "is_active" = true AND ("usage_limit" IS NULL OR "used_count" < "usage_limit")',
              totals.coupon.id
            );

            if (updatedCoupons !== 1) {
              throw new BadRequestException("coupon is not available");
            }
          }

          for (const item of cart.items) {
            const updatedRows = await tx.$executeRawUnsafe(
              'UPDATE "product_skus" SET "locked_stock_quantity" = "locked_stock_quantity" + $1 WHERE "id" = $2::uuid AND ("stock_quantity" - "locked_stock_quantity") >= $1',
              item.quantity,
              item.skuId
            );

            if (updatedRows !== 1) {
              throw new BadRequestException("insufficient stock");
            }
          }

          const created = await tx.order.create({
            data: {
              orderNo,
              userId,
              cartId: cart.id,
              couponId: totals.coupon?.id,
              couponCode: totals.coupon?.code,
              idempotencyKey: input.idempotencyKey.trim(),
              addressSnapshot: {
                label: address.label,
                recipientName: address.recipientName,
                phone: address.phone,
                country: address.country,
                province: address.province,
                city: address.city,
                district: address.district,
                line1: address.line1,
                postalCode: address.postalCode
              },
              subtotalAmount: totals.subtotalAmount,
              shippingFee: totals.shippingFee,
              discountAmount: totals.discountAmount,
              totalAmount: totals.totalAmount,
              expiresAt,
              items: {
                create: cart.items.map((item) => {
                  const image = item.sku.product.images.sort((a, b) => a.sortOrder - b.sortOrder)[0] ?? null;
                  const unitPrice = Number(item.sku.price);

                  return {
                    skuId: item.skuId,
                    productId: item.sku.product.id,
                    productName: item.sku.product.name,
                    productSlug: item.sku.product.slug,
                    skuCode: item.sku.skuCode,
                    skuName: item.sku.name,
                    optionSignature: item.sku.optionSignature as Record<string, string>,
                    imageUrl: image?.url,
                    quantity: item.quantity,
                    unitPrice: unitPrice.toFixed(2),
                    lineTotal: (unitPrice * item.quantity).toFixed(2)
                  };
                })
              }
            },
            include: orderInclude
          });

          await tx.cart.update({
            where: { id: cart.id },
            data: { status: CartStatus.ORDERED }
          });

          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      return serializeOrder(order);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.prisma.order.findUnique({
          where: {
            userId_idempotencyKey: {
              userId,
              idempotencyKey: input.idempotencyKey.trim()
            }
          },
          include: orderInclude
        });

        if (existing) {
          return serializeOrder(existing);
        }
      }

      throw error;
    }
  }

  async listUserOrders(userId: string) {
    await this.closeExpiredOrders();

    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: orderInclude,
      orderBy: { createdAt: "desc" }
    });

    return orders.map(serializeOrder);
  }

  async getUserOrder(userId: string, orderId: string) {
    await this.closeExpiredOrders();

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: orderInclude
    });

    if (!order) {
      throw new NotFoundException("order not found");
    }

    return serializeOrder(order);
  }

  async listAdminOrders() {
    await this.closeExpiredOrders();

    const orders = await this.prisma.order.findMany({
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return orders.map(serializeOrder);
  }

  async closeExpiredOrders() {
    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        expiresAt: { lte: new Date() }
      },
      include: orderInclude,
      take: 100
    });

    let closedCount = 0;

    for (const order of expiredOrders) {
      const closed = await this.prisma.$transaction(async (tx) => {
        const result = await tx.order.updateMany({
          where: {
            id: order.id,
            status: OrderStatus.PENDING_PAYMENT
          },
          data: {
            status: OrderStatus.CLOSED,
            closedAt: new Date()
          }
        });

        if (result.count !== 1) {
          return false;
        }

        for (const item of order.items) {
          await tx.$executeRawUnsafe(
            'UPDATE "product_skus" SET "locked_stock_quantity" = GREATEST("locked_stock_quantity" - $1, 0) WHERE "id" = $2::uuid',
            item.quantity,
            item.skuId
          );
        }

        if (order.couponId) {
          await tx.$executeRawUnsafe(
            'UPDATE "coupons" SET "used_count" = GREATEST("used_count" - 1, 0) WHERE "id" = $1::uuid',
            order.couponId
          );
        }

        return true;
      });

      if (closed) {
        closedCount += 1;
      }
    }

    return { closedCount };
  }

  private async getActiveCart(userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
      include: checkoutCartInclude
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("active cart is empty");
    }

    this.validateCartItems(cart);
    return cart;
  }

  private validateCartItems(cart: CheckoutCart) {
    for (const item of cart.items) {
      const availableStock = item.sku.stockQuantity - item.sku.lockedStockQuantity;
      const productAvailable =
        item.sku.isActive &&
        item.sku.product.status === ProductStatus.ACTIVE &&
        item.sku.product.deletedAt === null;

      if (!productAvailable) {
        throw new BadRequestException("cart contains unavailable SKU");
      }

      if (availableStock < item.quantity) {
        throw new BadRequestException("cart contains insufficient stock");
      }
    }
  }

  private async calculateTotals(cart: CheckoutCart, province?: string, couponCode?: string) {
    return this.calculateTotalsWithClient(this.prisma, cart, province, couponCode);
  }

  private async calculateTotalsWithClient(
    client: Prisma.TransactionClient | PrismaService,
    cart: CheckoutCart,
    province?: string,
    couponCode?: string
  ) {
    const subtotal = cart.items.reduce((sum, item) => sum + Number(item.sku.price) * item.quantity, 0);
    const shippingTemplate =
      (province
        ? await client.shippingTemplate.findFirst({
            where: { province, isActive: true },
            orderBy: { createdAt: "desc" }
          })
        : null) ??
      (await client.shippingTemplate.findFirst({
        where: { province: null, isActive: true },
        orderBy: { createdAt: "desc" }
      }));

    const shippingFee =
      shippingTemplate?.freeShippingThreshold &&
      subtotal >= Number(shippingTemplate.freeShippingThreshold)
        ? 0
        : Number(shippingTemplate?.baseFee ?? 0);
    const coupon = await this.findValidCoupon(client, couponCode, subtotal);
    const discountAmount = coupon ? this.calculateDiscount(coupon, subtotal) : 0;
    const totalAmount = Math.max(subtotal + shippingFee - discountAmount, 0);

    return {
      subtotalAmount: subtotal.toFixed(2),
      shippingFee: shippingFee.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      coupon: coupon
        ? {
            id: coupon.id,
            code: coupon.code,
            name: coupon.name,
            type: coupon.type,
            amount: coupon.amount.toFixed(2)
          }
        : null,
      shippingTemplate: shippingTemplate
        ? {
            id: shippingTemplate.id,
            name: shippingTemplate.name,
            province: shippingTemplate.province,
            baseFee: shippingTemplate.baseFee.toFixed(2),
            freeShippingThreshold: shippingTemplate.freeShippingThreshold?.toFixed(2) ?? null
          }
        : null
    };
  }

  private async findValidCoupon(
    client: Prisma.TransactionClient | PrismaService,
    couponCode: string | undefined,
    subtotal: number
  ) {
    const code = couponCode?.trim().toUpperCase();
    if (!code) {
      return null;
    }

    const coupon = await client.coupon.findUnique({ where: { code } });
    const now = new Date();

    if (
      !coupon ||
      !coupon.isActive ||
      Number(coupon.minSubtotal) > subtotal ||
      (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) ||
      (coupon.startsAt && coupon.startsAt > now) ||
      (coupon.endsAt && coupon.endsAt < now)
    ) {
      throw new BadRequestException("coupon is not available");
    }

    return coupon;
  }

  private calculateDiscount(
    coupon: { type: DiscountType; amount: { toFixed: (digits: number) => string } },
    subtotal: number
  ) {
    const amount = Number(coupon.amount);

    if (coupon.type === DiscountType.PERCENTAGE) {
      return Math.min(subtotal, (subtotal * amount) / 100);
    }

    return Math.min(subtotal, amount);
  }

  private serializeCheckoutCart(cart: CheckoutCart) {
    const items = cart.items.map((item) => {
      const unitPrice = Number(item.sku.price);
      const image = item.sku.product.images.sort((a, b) => a.sortOrder - b.sortOrder)[0] ?? null;

      return {
        id: item.id,
        skuId: item.skuId,
        productName: item.sku.product.name,
        productSlug: item.sku.product.slug,
        skuName: item.sku.name,
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        lineTotal: (unitPrice * item.quantity).toFixed(2),
        image: image ? { url: image.url, altText: image.altText } : null
      };
    });

    return {
      id: cart.id,
      items,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
    };
  }

  private generateOrderNo() {
    const date = new Date();
    const stamp = date.toISOString().slice(0, 10).replaceAll("-", "");
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `ORD${stamp}${random}`;
  }
}
