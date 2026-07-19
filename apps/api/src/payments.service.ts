import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import {
  InventoryChangeType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma
} from "@prisma/client";
import {
  createPaymentAdapter,
  type PaymentCallbackPayload,
  signPaymentCallback
} from "./payment-adapters";
import { serializePayment } from "./payment-serializers";
import { PrismaService } from "./prisma.service";
import { OrdersService } from "./orders.service";

const paymentInclude = {
  callbacks: {
    orderBy: { createdAt: "desc" }
  },
  refunds: {
    orderBy: { createdAt: "desc" }
  }
} satisfies Prisma.PaymentInclude;

const orderForPaymentInclude = {
  items: {
    orderBy: { createdAt: "asc" }
  },
  payments: {
    include: paymentInclude,
    orderBy: { createdAt: "desc" }
  }
} satisfies Prisma.OrderInclude;

type PaymentProviderInput = keyof typeof PaymentProvider;

export type CreatePaymentInput = {
  orderId: string;
  provider?: PaymentProviderInput;
  idempotencyKey: string;
};

export type PaymentCallbackInput = PaymentCallbackPayload & {
  signature?: string;
};

export type SimulatePaymentInput = {
  paymentId: string;
  outcome: "success" | "failed";
  amount?: string;
};

export type CreateRefundInput = {
  amount?: string;
  reason?: string;
};

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrdersService) private readonly ordersService: OrdersService
  ) {}

  async createPayment(userId: string, input: CreatePaymentInput) {
    await this.ordersService.closeExpiredOrders();

    if (!input.orderId?.trim()) {
      throw new BadRequestException("orderId is required");
    }

    if (!input.idempotencyKey?.trim()) {
      throw new BadRequestException("idempotencyKey is required");
    }

    const provider = this.parseProvider(input.provider ?? PaymentProvider.TEST);
    this.ensureProviderConfigured(provider);

    const order = await this.prisma.order.findFirst({
      where: { id: input.orderId, userId },
      include: orderForPaymentInclude
    });

    if (!order) {
      throw new NotFoundException("order not found");
    }

    if (order.status === OrderStatus.PAID) {
      const succeeded = order.payments.find((payment) => payment.status === PaymentStatus.SUCCEEDED);
      if (succeeded) {
        return serializePayment(succeeded);
      }
      throw new BadRequestException("order is already paid");
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException("order is not payable");
    }

    if (order.expiresAt <= new Date()) {
      await this.ordersService.closeExpiredOrders();
      throw new BadRequestException("order is expired");
    }

    const idempotencyKey = input.idempotencyKey.trim();
    const existing = order.payments.find((payment) => payment.idempotencyKey === idempotencyKey);
    if (existing) {
      return serializePayment(existing);
    }

    const adapter = createPaymentAdapter(provider);
    const intent = adapter.createPayment({
      orderId: order.id,
      orderNo: order.orderNo,
      amount: order.totalAmount.toFixed(2),
      currency: "CNY",
      expiresAt: order.expiresAt
    });

    try {
      const payment = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          provider,
          amount: order.totalAmount,
          currency: "CNY",
          idempotencyKey,
          providerPaymentId: intent.providerPaymentId,
          checkoutUrl: intent.checkoutUrl,
          rawRequest: intent.rawRequest as Prisma.InputJsonObject,
          expiresAt: intent.expiresAt
        },
        include: paymentInclude
      });

      return serializePayment(payment);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existingPayment = await this.prisma.payment.findFirst({
          where: { orderId: order.id, idempotencyKey },
          include: paymentInclude
        });

        if (existingPayment) {
          return serializePayment(existingPayment);
        }
      }

      throw error;
    }
  }

  async listOrderPayments(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: { id: true }
    });

    if (!order) {
      throw new NotFoundException("order not found");
    }

    const payments = await this.prisma.payment.findMany({
      where: { orderId },
      include: paymentInclude,
      orderBy: { createdAt: "desc" }
    });

    return payments.map(serializePayment);
  }

  async getUserPayment(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, order: { userId } },
      include: paymentInclude
    });

    if (!payment) {
      throw new NotFoundException("payment not found");
    }

    return serializePayment(payment);
  }

  async listAdminPayments() {
    const payments = await this.prisma.payment.findMany({
      include: paymentInclude,
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return payments.map(serializePayment);
  }

  async handleCallback(providerInput: PaymentProviderInput, input: PaymentCallbackInput, headerSignature?: string) {
    const provider = this.parseProvider(providerInput);
    const payload = this.normalizeCallbackPayload(input);
    const payment = await this.prisma.payment.findUnique({
      where: { providerPaymentId: payload.providerPaymentId },
      include: {
        ...paymentInclude,
        order: {
          include: {
            items: {
              orderBy: { createdAt: "asc" }
            }
          }
        }
      }
    });
    const signature = headerSignature ?? input.signature;
    const isVerified = createPaymentAdapter(provider).verifyCallback(payload, signature);

    try {
      const callback = await this.prisma.paymentCallback.create({
        data: {
          paymentId: payment?.id,
          provider,
          providerEventId: payload.providerEventId,
          providerPaymentId: payload.providerPaymentId,
          rawPayload: payload,
          signature,
          isVerified,
          processingResult: isVerified ? "accepted" : "invalid_signature"
        }
      });

      if (!isVerified) {
        throw new UnauthorizedException("invalid payment callback signature");
      }

      if (!payment) {
        await this.markCallback(callback.id, "payment_not_found");
        throw new NotFoundException("payment not found");
      }

      if (payload.status === PaymentStatus.FAILED) {
        return this.markPaymentFailed(payment.id, callback.id, payload.failureReason ?? "provider reported failure");
      }

      return this.captureSuccessfulPayment(payment.id, callback.id, payload);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existingCallback = await this.prisma.paymentCallback.findUnique({
          where: {
            provider_providerEventId: {
              provider,
              providerEventId: payload.providerEventId
            }
          },
          include: {
            payment: {
              include: paymentInclude
            }
          }
        });

        if (existingCallback?.payment) {
          if (!existingCallback.isVerified) {
            throw new UnauthorizedException("invalid payment callback signature");
          }

          return serializePayment(existingCallback.payment);
        }
      }

      throw error;
    }
  }

  async simulateTestCallback(userId: string, input: SimulatePaymentInput) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: input.paymentId, provider: PaymentProvider.TEST, order: { userId } }
    });

    if (!payment) {
      throw new NotFoundException("test payment not found");
    }

    const payload: PaymentCallbackPayload = {
      providerPaymentId: payment.providerPaymentId,
      providerEventId: `test_evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: input.outcome === "success" ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED,
      amount: input.amount ? Number(input.amount).toFixed(2) : payment.amount.toFixed(2),
      currency: payment.currency,
      failureReason: input.outcome === "failed" ? "simulated payment failure" : undefined
    };

    return this.handleCallback(PaymentProvider.TEST, {
      ...payload,
      signature: signPaymentCallback(process.env.TEST_PAYMENT_WEBHOOK_SECRET ?? "dev-test-payment-secret", payload)
    });
  }

  async createRefund(paymentId: string, input: CreateRefundInput) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: paymentInclude
    });

    if (!payment) {
      throw new NotFoundException("payment not found");
    }

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException("only succeeded payments can be refunded");
    }

    const amount = input.amount ? Number(input.amount) : Number(payment.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(payment.amount)) {
      throw new BadRequestException("refund amount is invalid");
    }

    const adapter = createPaymentAdapter(payment.provider);
    const result = adapter.createRefund({
      paymentId: payment.id,
      amount: amount.toFixed(2),
      currency: payment.currency,
      reason: input.reason?.trim()
    });

    const refund = await this.prisma.refund.create({
      data: {
        paymentId: payment.id,
        amount: amount.toFixed(2),
        currency: payment.currency,
        status: result.status,
        reason: input.reason?.trim(),
        providerRefundId: result.providerRefundId,
        rawResponse: result.rawResponse as Prisma.InputJsonObject
      }
    });

    return {
      id: refund.id,
      paymentId: refund.paymentId,
      amount: refund.amount.toFixed(2),
      currency: refund.currency,
      status: refund.status,
      providerRefundId: refund.providerRefundId,
      createdAt: refund.createdAt.toISOString()
    };
  }

  private async markPaymentFailed(paymentId: string, callbackId: string, reason: string) {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: reason
      }
    });
    await this.markCallback(callbackId, "payment_failed");
    return this.getPayment(paymentId);
  }

  private async captureSuccessfulPayment(
    paymentId: string,
    callbackId: string,
    payload: PaymentCallbackPayload
  ) {
    await this.prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
          include: {
            order: {
              include: {
                items: {
                  orderBy: { createdAt: "asc" }
                }
              }
            }
          }
        });

        if (!payment) {
          throw new NotFoundException("payment not found");
        }

        if (payment.status === PaymentStatus.SUCCEEDED || payment.order.status === OrderStatus.PAID) {
          await tx.paymentCallback.update({
            where: { id: callbackId },
            data: {
              processedAt: new Date(),
              processingResult: "duplicate_success_ignored"
            }
          });
          return;
        }

        if (payment.order.status !== OrderStatus.PENDING_PAYMENT) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              failureReason: "order is not payable"
            }
          });
          await tx.paymentCallback.update({
            where: { id: callbackId },
            data: {
              processedAt: new Date(),
              processingResult: "order_not_payable"
            }
          });
          return;
        }

        if (Number(payload.amount).toFixed(2) !== payment.amount.toFixed(2) || payload.currency !== payment.currency) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              failureReason: "amount or currency mismatch"
            }
          });
          await tx.paymentCallback.update({
            where: { id: callbackId },
            data: {
              processedAt: new Date(),
              processingResult: "amount_mismatch"
            }
          });
          return;
        }

        if (payment.order.expiresAt <= new Date()) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              failureReason: "order is expired"
            }
          });
          await tx.paymentCallback.update({
            where: { id: callbackId },
            data: {
              processedAt: new Date(),
              processingResult: "order_expired"
            }
          });
          return;
        }

        for (const item of payment.order.items) {
          const sku = await tx.productSku.findUnique({
            where: { id: item.skuId }
          });

          if (!sku || sku.lockedStockQuantity < item.quantity || sku.stockQuantity < item.quantity) {
            throw new BadRequestException("locked stock is not available");
          }

          await tx.productSku.update({
            where: { id: item.skuId },
            data: {
              stockQuantity: { decrement: item.quantity },
              lockedStockQuantity: { decrement: item.quantity }
            }
          });

          await tx.inventoryRecord.create({
            data: {
              skuId: item.skuId,
              type: InventoryChangeType.STOCK_OUT,
              quantity: -item.quantity,
              beforeStock: sku.stockQuantity,
              afterStock: sku.stockQuantity - item.quantity,
              note: `Payment captured for order ${payment.order.orderNo}`
            }
          });
        }

        const paidAt = new Date();
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCEEDED,
            paidAt
          }
        });
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.PAID,
            paidAmount: payment.amount,
            paidCurrency: payment.currency,
            paidAt
          }
        });
        await tx.paymentCallback.update({
          where: { id: callbackId },
          data: {
            processedAt: paidAt,
            processingResult: "payment_succeeded"
          }
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return this.getPayment(paymentId);
  }

  private async getPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: paymentInclude
    });

    if (!payment) {
      throw new NotFoundException("payment not found");
    }

    return serializePayment(payment);
  }

  private async markCallback(callbackId: string, processingResult: string) {
    await this.prisma.paymentCallback.update({
      where: { id: callbackId },
      data: {
        processedAt: new Date(),
        processingResult
      }
    });
  }

  private parseProvider(provider: PaymentProviderInput) {
    if (!Object.values(PaymentProvider).includes(provider as PaymentProvider)) {
      throw new BadRequestException("payment provider is invalid");
    }

    return provider as PaymentProvider;
  }

  private ensureProviderConfigured(provider: PaymentProvider) {
    if (provider === PaymentProvider.STRIPE && !process.env.STRIPE_SECRET_KEY) {
      throw new BadRequestException("stripe payment provider is not configured");
    }
  }

  private normalizeCallbackPayload(input: PaymentCallbackInput): PaymentCallbackPayload {
    if (!input.providerPaymentId?.trim() || !input.providerEventId?.trim()) {
      throw new BadRequestException("providerPaymentId and providerEventId are required");
    }

    if (![PaymentStatus.SUCCEEDED, PaymentStatus.FAILED].includes(input.status)) {
      throw new BadRequestException("callback status is invalid");
    }

    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException("callback amount is invalid");
    }

    return {
      providerPaymentId: input.providerPaymentId.trim(),
      providerEventId: input.providerEventId.trim(),
      status: input.status,
      amount: amount.toFixed(2),
      currency: input.currency?.trim().toUpperCase() || "CNY",
      failureReason: input.failureReason?.trim()
    };
  }
}
