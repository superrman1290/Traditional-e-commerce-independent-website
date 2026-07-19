import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AfterSaleStatus, AfterSaleType, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";

export type CreateAfterSaleInput = {
  orderId: string;
  type: AfterSaleType;
  amount?: string;
  reason: string;
  returnTrackingNumber?: string;
};

export type UpdateAfterSaleInput = {
  status: AfterSaleStatus;
  adminNote?: string;
};

const afterSaleInclude = {
  order: {
    include: {
      items: {
        orderBy: { createdAt: "asc" }
      }
    }
  },
  user: true,
  payment: true,
  refund: true
} satisfies Prisma.AfterSaleRequestInclude;

type AfterSaleRecord = Prisma.AfterSaleRequestGetPayload<{ include: typeof afterSaleInclude }>;

@Injectable()
export class AfterSalesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createRequest(userId: string, input: CreateAfterSaleInput) {
    if (!input.orderId?.trim()) {
      throw new BadRequestException("orderId is required");
    }

    if (!Object.values(AfterSaleType).includes(input.type)) {
      throw new BadRequestException("after-sale type is invalid");
    }

    const reason = input.reason?.trim();
    if (!reason) {
      throw new BadRequestException("reason is required");
    }

    const order = await this.prisma.order.findFirst({
      where: { id: input.orderId, userId },
      include: {
        payments: {
          where: { status: PaymentStatus.SUCCEEDED },
          orderBy: { paidAt: "desc" },
          take: 1
        }
      }
    });

    if (!order) {
      throw new NotFoundException("order not found");
    }

    if (
      order.status !== OrderStatus.PAID &&
      order.status !== OrderStatus.SHIPPED &&
      order.status !== OrderStatus.COMPLETED
    ) {
      throw new BadRequestException("order is not eligible for after-sales");
    }

    const payment = order.payments[0] ?? null;
    const maxAmount = Number(order.paidAmount ?? order.totalAmount);
    const amount = input.amount ? Number(input.amount) : maxAmount;
    if (!Number.isFinite(amount) || amount <= 0 || amount > maxAmount) {
      throw new BadRequestException("after-sale amount is invalid");
    }

    const request = await this.prisma.afterSaleRequest.create({
      data: {
        orderId: order.id,
        userId,
        paymentId: payment?.id,
        type: input.type,
        amount: amount.toFixed(2),
        reason,
        returnTrackingNumber: input.returnTrackingNumber?.trim() || null
      },
      include: afterSaleInclude
    });

    return this.serialize(request);
  }

  async listUserRequests(userId: string) {
    const requests = await this.prisma.afterSaleRequest.findMany({
      where: { userId },
      include: afterSaleInclude,
      orderBy: { createdAt: "desc" }
    });

    return requests.map((request) => this.serialize(request));
  }

  async listAdminRequests() {
    const requests = await this.prisma.afterSaleRequest.findMany({
      include: afterSaleInclude,
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return requests.map((request) => this.serialize(request));
  }

  async updateRequest(requestId: string, input: UpdateAfterSaleInput) {
    if (!Object.values(AfterSaleStatus).includes(input.status)) {
      throw new BadRequestException("after-sale status is invalid");
    }

    const now = new Date();
    const request = await this.prisma.afterSaleRequest.update({
      where: { id: requestId },
      data: {
        status: input.status,
        adminNote: input.adminNote?.trim() || null,
        reviewedAt:
          input.status === AfterSaleStatus.APPROVED || input.status === AfterSaleStatus.REJECTED ? now : undefined,
        completedAt: input.status === AfterSaleStatus.COMPLETED ? now : undefined
      },
      include: afterSaleInclude
    });

    return this.serialize(request);
  }

  private serialize(request: AfterSaleRecord) {
    return {
      id: request.id,
      orderId: request.orderId,
      orderNo: request.order.orderNo,
      userId: request.userId,
      userEmail: request.user.email,
      type: request.type,
      status: request.status,
      amount: request.amount.toFixed(2),
      reason: request.reason,
      returnTrackingNumber: request.returnTrackingNumber,
      adminNote: request.adminNote,
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
      completedAt: request.completedAt?.toISOString() ?? null,
      createdAt: request.createdAt.toISOString(),
      paymentId: request.paymentId,
      refundId: request.refundId,
      refundStatus: request.refund?.status ?? null,
      items: request.order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        skuName: item.skuName,
        quantity: item.quantity,
        lineTotal: item.lineTotal.toFixed(2)
      }))
    };
  }
}
