import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import { PaymentProvider } from "@prisma/client";
import { AuthService } from "./auth.service";
import {
  type CreatePaymentInput,
  type CreateRefundInput,
  type PaymentCallbackInput,
  PaymentsService,
  type SimulatePaymentInput
} from "./payments.service";

@Controller()
export class PaymentsController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService
  ) {}

  @Post("payments")
  async createPayment(@Headers("authorization") authorization: string | undefined, @Body() body: CreatePaymentInput) {
    const user = await this.authService.requireUser(authorization);
    return this.paymentsService.createPayment(user.id, body);
  }

  @Get("payments/:id")
  async getPayment(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const user = await this.authService.requireUser(authorization);
    return this.paymentsService.getUserPayment(user.id, id);
  }

  @Get("orders/:id/payments")
  async listOrderPayments(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const user = await this.authService.requireUser(authorization);
    return this.paymentsService.listOrderPayments(user.id, id);
  }

  @Post("payments/test/simulate")
  async simulateTestPayment(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: SimulatePaymentInput
  ) {
    const user = await this.authService.requireUser(authorization);
    return this.paymentsService.simulateTestCallback(user.id, body);
  }

  @Post("payments/test/callback")
  handleTestCallback(
    @Headers("x-payment-signature") signature: string | undefined,
    @Body() body: PaymentCallbackInput
  ) {
    return this.paymentsService.handleCallback(PaymentProvider.TEST, body, signature);
  }

  @Post("payments/stripe/callback")
  handleStripeCallback(
    @Headers("x-payment-signature") signature: string | undefined,
    @Body() body: PaymentCallbackInput
  ) {
    return this.paymentsService.handleCallback(PaymentProvider.STRIPE, body, signature);
  }

  @Get("admin/payments")
  listAdminPayments() {
    return this.paymentsService.listAdminPayments();
  }

  @Post("admin/payments/:id/refunds")
  createRefund(@Param("id") id: string, @Body() body: CreateRefundInput) {
    return this.paymentsService.createRefund(id, body);
  }
}
