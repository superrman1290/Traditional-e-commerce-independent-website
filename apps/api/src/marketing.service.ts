import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CartReminderStatus, CartStatus, ContactMessageStatus, ProductStatus } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { serializeProduct } from "./product-serializers";

export type NewsletterInput = {
  email: string;
  source?: string;
};

export type ContactMessageInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export type FavoriteInput = {
  productId: string;
};

export type AbandonedCartReminderInput = {
  guestSessionId?: string;
  email?: string;
};

@Injectable()
export class MarketingService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getPublicMarketing() {
    const now = new Date();
    const [coupons, faqs] = await Promise.all([
      this.prisma.coupon.findMany({
        where: {
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
        },
        orderBy: [{ minSubtotal: "asc" }, { createdAt: "desc" }],
        take: 12
      }),
      this.prisma.faqEntry.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      })
    ]);

    return {
      coupons: coupons.map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        type: coupon.type,
        amount: coupon.amount.toFixed(2),
        minSubtotal: coupon.minSubtotal.toFixed(2),
        usageLimit: coupon.usageLimit,
        usedCount: coupon.usedCount,
        startsAt: coupon.startsAt?.toISOString() ?? null,
        endsAt: coupon.endsAt?.toISOString() ?? null,
        campaignType: coupon.endsAt ? "LIMITED_DISCOUNT" : "FULL_REDUCTION"
      })),
      faqs: faqs.map((faq) => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer
      }))
    };
  }

  async subscribe(input: NewsletterInput) {
    const email = this.normalizeEmail(input.email);

    const subscription = await this.prisma.newsletterSubscription.upsert({
      where: { email },
      update: {
        isActive: true,
        source: input.source?.trim() || "storefront"
      },
      create: {
        email,
        source: input.source?.trim() || "storefront"
      }
    });

    return {
      id: subscription.id,
      email: subscription.email,
      isActive: subscription.isActive,
      createdAt: subscription.createdAt.toISOString()
    };
  }

  async createContactMessage(userId: string | null, input: ContactMessageInput) {
    const name = input.name?.trim();
    const email = this.normalizeEmail(input.email);
    const subject = input.subject?.trim();
    const message = input.message?.trim();

    if (!name || !subject || !message) {
      throw new BadRequestException("name, subject and message are required");
    }

    const contact = await this.prisma.contactMessage.create({
      data: {
        userId,
        name,
        email,
        subject,
        message
      }
    });

    return {
      id: contact.id,
      status: contact.status,
      createdAt: contact.createdAt.toISOString()
    };
  }

  async listUserFavorites(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
            images: true,
            options: {
              include: { values: true }
            },
            skus: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return favorites.map((favorite) => ({
      id: favorite.id,
      createdAt: favorite.createdAt.toISOString(),
      product: serializeProduct(favorite.product)
    }));
  }

  async addFavorite(userId: string, input: FavoriteInput) {
    if (!input.productId?.trim()) {
      throw new BadRequestException("productId is required");
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id: input.productId,
        status: ProductStatus.ACTIVE,
        deletedAt: null
      }
    });

    if (!product) {
      throw new NotFoundException("product not found");
    }

    const favorite = await this.prisma.favorite.upsert({
      where: {
        userId_productId: {
          userId,
          productId: product.id
        }
      },
      update: {},
      create: {
        userId,
        productId: product.id
      }
    });

    return {
      id: favorite.id,
      productId: favorite.productId,
      createdAt: favorite.createdAt.toISOString()
    };
  }

  async removeFavorite(userId: string, productId: string) {
    await this.prisma.favorite.deleteMany({
      where: { userId, productId }
    });

    return { ok: true };
  }

  async createAbandonedCartReminder(
    owner: { userId?: string; guestSessionId?: string },
    input: AbandonedCartReminderInput
  ) {
    if (!owner.userId && !owner.guestSessionId) {
      throw new BadRequestException("login or guest session is required");
    }

    const cart = await this.prisma.cart.findFirst({
      where: {
        status: CartStatus.ACTIVE,
        userId: owner.userId,
        guestSessionId: owner.guestSessionId,
        items: {
          some: {}
        }
      },
      include: {
        user: true,
        items: true
      }
    });

    if (!cart) {
      throw new BadRequestException("active cart with items is required");
    }

    const email = input.email?.trim() || cart.user?.email || null;
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const existing = await this.prisma.abandonedCartReminder.findFirst({
      where: {
        cartId: cart.id,
        status: CartReminderStatus.PENDING
      },
      orderBy: { createdAt: "desc" }
    });

    if (existing) {
      return this.serializeReminder(existing);
    }

    const reminder = await this.prisma.abandonedCartReminder.create({
      data: {
        cartId: cart.id,
        email,
        scheduledAt,
        message: `Cart has ${cart.items.length} item(s).`
      }
    });

    return this.serializeReminder(reminder);
  }

  async listAdminMarketing() {
    const [contacts, subscriptions, reminders, faqs] = await Promise.all([
      this.prisma.contactMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      this.prisma.newsletterSubscription.findMany({
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      this.prisma.abandonedCartReminder.findMany({
        include: {
          cart: {
            include: {
              user: true,
              items: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      this.prisma.faqEntry.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 50
      })
    ]);

    return {
      contacts: contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        message: contact.message,
        status: contact.status,
        createdAt: contact.createdAt.toISOString()
      })),
      subscriptions: subscriptions.map((subscription) => ({
        id: subscription.id,
        email: subscription.email,
        source: subscription.source,
        isActive: subscription.isActive,
        createdAt: subscription.createdAt.toISOString()
      })),
      reminders: reminders.map((reminder) => ({
        ...this.serializeReminder(reminder),
        itemCount: reminder.cart.items.length,
        userEmail: reminder.cart.user?.email ?? null
      })),
      faqs: faqs.map((faq) => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        isActive: faq.isActive,
        sortOrder: faq.sortOrder
      }))
    };
  }

  async updateContactStatus(contactId: string, status: ContactMessageStatus) {
    if (!Object.values(ContactMessageStatus).includes(status)) {
      throw new BadRequestException("contact status is invalid");
    }

    const contact = await this.prisma.contactMessage.update({
      where: { id: contactId },
      data: { status }
    });

    return {
      id: contact.id,
      status: contact.status
    };
  }

  private normalizeEmail(email?: string) {
    const normalized = email?.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new BadRequestException("valid email is required");
    }

    return normalized;
  }

  private serializeReminder(reminder: {
    id: string;
    cartId: string;
    email: string | null;
    status: CartReminderStatus;
    message: string | null;
    scheduledAt: Date;
    sentAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: reminder.id,
      cartId: reminder.cartId,
      email: reminder.email,
      status: reminder.status,
      message: reminder.message,
      scheduledAt: reminder.scheduledAt.toISOString(),
      sentAt: reminder.sentAt?.toISOString() ?? null,
      createdAt: reminder.createdAt.toISOString()
    };
  }
}
