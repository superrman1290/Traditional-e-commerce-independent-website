import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CartStatus, Prisma, ProductStatus } from "@prisma/client";
import { serializeCart } from "./cart-serializers";
import { PrismaService } from "./prisma.service";

const cartInclude = {
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

type CartOwner = {
  userId?: string;
  guestSessionId?: string;
};

export type AddCartItemInput = {
  skuId: string;
  quantity?: number;
};

export type UpdateCartItemInput = {
  quantity: number;
};

@Injectable()
export class CartService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createGuestSession() {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const guestSession = await this.prisma.guestSession.create({
      data: { expiresAt }
    });

    return {
      guestSessionId: guestSession.id,
      expiresAt: guestSession.expiresAt.toISOString()
    };
  }

  async getCart(owner: CartOwner) {
    const cart = await this.getOrCreateCart(owner);
    return serializeCart(cart);
  }

  async addItem(owner: CartOwner, input: AddCartItemInput) {
    const quantity = input.quantity ?? 1;
    this.validateQuantity(quantity);

    const cart = await this.getOrCreateCart(owner);
    const sku = await this.getPurchasableSku(input.skuId);
    const existingItem = cart.items.find((item) => item.skuId === input.skuId);
    const nextQuantity = (existingItem?.quantity ?? 0) + quantity;
    this.ensureStock(sku, nextQuantity);

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: nextQuantity }
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          skuId: sku.id,
          quantity,
          unitPriceSnapshot: sku.price
        }
      });
    }

    return this.getCart(owner);
  }

  async updateItem(owner: CartOwner, itemId: string, input: UpdateCartItemInput) {
    this.validateQuantity(input.quantity);

    const cart = await this.getOrCreateCart(owner);
    const item = cart.items.find((cartItem) => cartItem.id === itemId);
    if (!item) {
      throw new NotFoundException("cart item not found");
    }

    const sku = await this.getPurchasableSku(item.skuId);
    this.ensureStock(sku, input.quantity);

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: input.quantity }
    });

    return this.getCart(owner);
  }

  async removeItem(owner: CartOwner, itemId: string) {
    const cart = await this.getOrCreateCart(owner);
    const item = cart.items.find((cartItem) => cartItem.id === itemId);
    if (!item) {
      throw new NotFoundException("cart item not found");
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(owner);
  }

  async mergeGuestCartIntoUser(guestSessionId: string | undefined, userId: string) {
    if (!guestSessionId) {
      return this.getCart({ userId });
    }

    const guestCart = await this.prisma.cart.findFirst({
      where: { guestSessionId, status: CartStatus.ACTIVE },
      include: cartInclude
    });

    if (!guestCart) {
      return this.getCart({ userId });
    }

    const userCart = await this.getOrCreateCart({ userId });

    for (const guestItem of guestCart.items) {
      const userItem = userCart.items.find((item) => item.skuId === guestItem.skuId);

      if (userItem) {
        await this.prisma.cartItem.update({
          where: { id: userItem.id },
          data: { quantity: userItem.quantity + guestItem.quantity }
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            skuId: guestItem.skuId,
            quantity: guestItem.quantity,
            unitPriceSnapshot: guestItem.unitPriceSnapshot
          }
        });
      }
    }

    await this.prisma.cart.update({
      where: { id: guestCart.id },
      data: { status: CartStatus.MERGED }
    });

    return this.getCart({ userId });
  }

  private async getOrCreateCart(owner: CartOwner) {
    if (owner.userId) {
      const existing = await this.prisma.cart.findFirst({
        where: { userId: owner.userId, status: CartStatus.ACTIVE },
        include: cartInclude
      });

      if (existing) {
        return existing;
      }

      return this.prisma.cart.create({
        data: { userId: owner.userId },
        include: cartInclude
      });
    }

    if (owner.guestSessionId) {
      const guestSession = await this.prisma.guestSession.findUnique({
        where: { id: owner.guestSessionId }
      });

      if (!guestSession || guestSession.expiresAt <= new Date()) {
        throw new BadRequestException("valid guest session is required");
      }

      const existing = await this.prisma.cart.findFirst({
        where: { guestSessionId: owner.guestSessionId, status: CartStatus.ACTIVE },
        include: cartInclude
      });

      if (existing) {
        return existing;
      }

      return this.prisma.cart.create({
        data: { guestSessionId: owner.guestSessionId },
        include: cartInclude
      });
    }

    throw new BadRequestException("login or guest session is required");
  }

  private async getPurchasableSku(skuId: string) {
    const sku = await this.prisma.productSku.findUnique({
      where: { id: skuId },
      include: { product: true }
    });

    if (!sku || !sku.isActive || sku.product.status !== ProductStatus.ACTIVE || sku.product.deletedAt !== null) {
      throw new BadRequestException("SKU is not available");
    }

    return sku;
  }

  private validateQuantity(quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException("quantity must be a positive integer");
    }
  }

  private ensureStock(sku: { stockQuantity: number; lockedStockQuantity: number }, quantity: number) {
    const availableStock = sku.stockQuantity - sku.lockedStockQuantity;
    if (availableStock < quantity) {
      throw new BadRequestException("insufficient stock");
    }
  }
}

