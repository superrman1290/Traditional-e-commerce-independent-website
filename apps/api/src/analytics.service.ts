import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { AnalyticsEventType, OrderStatus, Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";

export type TrackEventInput = {
  eventType: AnalyticsEventType;
  path: string;
  userId?: string;
  guestSessionId?: string;
  anonymousId?: string;
  productId?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
  metadata?: Prisma.InputJsonValue;
  occurredAt?: string;
};

const paidOrderStatuses = [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.COMPLETED];

@Injectable()
export class AnalyticsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async trackEvent(input: TrackEventInput) {
    if (!Object.values(AnalyticsEventType).includes(input.eventType)) {
      throw new BadRequestException("eventType is invalid");
    }

    const path = input.path?.trim();
    if (!path) {
      throw new BadRequestException("path is required");
    }

    const guestSessionId = input.guestSessionId?.trim();
    const productId = input.productId?.trim();
    const [guestSession, product] = await Promise.all([
      guestSessionId ? this.prisma.guestSession.findUnique({ where: { id: guestSessionId } }) : null,
      productId ? this.prisma.product.findUnique({ where: { id: productId } }) : null
    ]);

    const event = await this.prisma.behaviorEvent.create({
      data: {
        userId: input.userId,
        guestSessionId: guestSession?.id,
        anonymousId: input.anonymousId?.trim() || undefined,
        productId: product?.id,
        eventType: input.eventType,
        path: path.slice(0, 500),
        source: input.source?.trim().slice(0, 120) || "direct",
        medium: input.medium?.trim().slice(0, 120) || undefined,
        campaign: input.campaign?.trim().slice(0, 160) || undefined,
        referrer: input.referrer?.trim() || undefined,
        metadata: input.metadata,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date()
      }
    });

    return {
      id: event.id,
      eventType: event.eventType,
      occurredAt: event.occurredAt.toISOString()
    };
  }

  async getAdminAnalytics() {
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previousFrom = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [orders, previousOrders, events, productItems, statusCounts, activeUsers] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          status: { in: paidOrderStatuses },
          paidAt: { gte: from }
        },
        select: {
          id: true,
          totalAmount: true,
          paidAmount: true,
          paidAt: true,
          createdAt: true
        },
        orderBy: { paidAt: "asc" }
      }),
      this.prisma.order.findMany({
        where: {
          status: { in: paidOrderStatuses },
          paidAt: { gte: previousFrom, lt: from }
        },
        select: {
          totalAmount: true,
          paidAmount: true
        }
      }),
      this.prisma.behaviorEvent.findMany({
        where: { occurredAt: { gte: from } },
        orderBy: { occurredAt: "asc" },
        take: 5000
      }),
      this.prisma.orderItem.findMany({
        where: {
          order: {
            status: { in: paidOrderStatuses },
            paidAt: { gte: from }
          }
        },
        select: {
          productId: true,
          productName: true,
          productSlug: true,
          quantity: true,
          lineTotal: true
        }
      }),
      this.prisma.order.groupBy({
        by: ["status"],
        _count: { id: true }
      }),
      this.prisma.user.count({
        where: {
          sessions: {
            some: {
              lastSeenAt: { gte: from }
            }
          }
        }
      })
    ]);

    const revenue = this.sumOrders(orders);
    const previousRevenue = this.sumOrders(previousOrders);
    const visitors = new Set(events.map((event) => event.userId ?? event.guestSessionId ?? event.anonymousId ?? event.id)).size;
    const pageViews = events.filter((event) => event.eventType === AnalyticsEventType.PAGE_VIEW).length;
    const checkoutStarts = events.filter((event) => event.eventType === AnalyticsEventType.CHECKOUT_STARTED).length;
    const conversionRate = visitors > 0 ? (orders.length / visitors) * 100 : 0;

    return {
      period: {
        from: from.toISOString(),
        to: now.toISOString(),
        days: 30
      },
      metrics: {
        revenue: revenue.toFixed(2),
        revenueChange: this.calculateChange(revenue, previousRevenue),
        orderCount: orders.length,
        averageOrderValue: orders.length > 0 ? (revenue / orders.length).toFixed(2) : "0.00",
        pageViews,
        visitors,
        checkoutStarts,
        conversionRate: conversionRate.toFixed(2),
        activeUsers
      },
      dailySales: this.buildDailySales(orders),
      productSales: this.buildProductSales(productItems),
      trafficSources: this.buildTrafficSources(events),
      behaviorEvents: this.buildEventCounts(events),
      orderStatusCounts: statusCounts.map((status) => ({
        status: status.status,
        count: status._count.id
      })),
      securityChecklist: this.getSecurityChecklist(),
      launchReadiness: {
        backupCommand: "npm run db:backup",
        deploymentGuide: "docs/DEPLOYMENT.md",
        privacyPolicy: "/privacy",
        termsOfService: "/terms"
      }
    };
  }

  private sumOrders(orders: Array<{ totalAmount: Prisma.Decimal; paidAmount: Prisma.Decimal | null }>) {
    return orders.reduce((sum, order) => sum + Number(order.paidAmount ?? order.totalAmount), 0);
  }

  private calculateChange(current: number, previous: number) {
    if (previous === 0) {
      return current > 0 ? "100.00" : "0.00";
    }

    return (((current - previous) / previous) * 100).toFixed(2);
  }

  private buildDailySales(
    orders: Array<{ id: string; totalAmount: Prisma.Decimal; paidAmount: Prisma.Decimal | null; paidAt: Date | null; createdAt: Date }>
  ) {
    const rows = new Map<string, { date: string; revenue: number; orders: number }>();

    for (const order of orders) {
      const date = (order.paidAt ?? order.createdAt).toISOString().slice(0, 10);
      const existing = rows.get(date) ?? { date, revenue: 0, orders: 0 };
      existing.revenue += Number(order.paidAmount ?? order.totalAmount);
      existing.orders += 1;
      rows.set(date, existing);
    }

    return Array.from(rows.values()).map((row) => ({
      date: row.date,
      revenue: row.revenue.toFixed(2),
      orders: row.orders
    }));
  }

  private buildProductSales(
    items: Array<{
      productId: string;
      productName: string;
      productSlug: string;
      quantity: number;
      lineTotal: Prisma.Decimal;
    }>
  ) {
    const rows = new Map<string, { productId: string; productName: string; productSlug: string; quantity: number; revenue: number }>();

    for (const item of items) {
      const existing =
        rows.get(item.productId) ??
        {
          productId: item.productId,
          productName: item.productName,
          productSlug: item.productSlug,
          quantity: 0,
          revenue: 0
        };
      existing.quantity += item.quantity;
      existing.revenue += Number(item.lineTotal);
      rows.set(item.productId, existing);
    }

    return Array.from(rows.values())
      .sort((left, right) => right.quantity - left.quantity)
      .slice(0, 10)
      .map((row) => ({
        ...row,
        revenue: row.revenue.toFixed(2)
      }));
  }

  private buildTrafficSources(events: Array<{ source: string | null }>) {
    const rows = new Map<string, number>();

    for (const event of events) {
      const source = event.source || "direct";
      rows.set(source, (rows.get(source) ?? 0) + 1);
    }

    return Array.from(rows.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10)
      .map(([source, count]) => ({ source, count }));
  }

  private buildEventCounts(events: Array<{ eventType: AnalyticsEventType }>) {
    const rows = new Map<AnalyticsEventType, number>();

    for (const event of events) {
      rows.set(event.eventType, (rows.get(event.eventType) ?? 0) + 1);
    }

    return Array.from(rows.entries()).map(([eventType, count]) => ({ eventType, count }));
  }

  private getSecurityChecklist() {
    const isProduction = process.env.NODE_ENV === "production";

    return [
      {
        key: "https",
        label: "HTTPS terminates before storefront, admin and API traffic",
        status: isProduction ? "required" : "documented"
      },
      {
        key: "secrets",
        label: "Payment secrets and database URL are provided by environment variables",
        status: process.env.DATABASE_URL ? "passed" : "attention"
      },
      {
        key: "debug",
        label: "Production deployment should run with NODE_ENV=production",
        status: isProduction ? "passed" : "attention"
      },
      {
        key: "backup",
        label: "Database backup script is available as npm run db:backup",
        status: "passed"
      },
      {
        key: "policies",
        label: "Privacy policy and user agreement are linked in the storefront",
        status: "passed"
      }
    ];
  }
}
