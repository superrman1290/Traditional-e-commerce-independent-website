import { Body, Controller, Get, Headers, Inject, Param, Post, Query } from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  type CheckoutSummaryInput,
  type CreateOrderInput,
  type CreateShipmentInput,
  OrdersService
} from "./orders.service";

@Controller()
export class OrdersController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(OrdersService) private readonly ordersService: OrdersService
  ) {}

  @Get("checkout/summary")
  async getCheckoutSummary(
    @Headers("authorization") authorization: string | undefined,
    @Query("addressId") addressId?: string,
    @Query("couponCode") couponCode?: string
  ) {
    const user = await this.authService.requireUser(authorization);
    return this.ordersService.getCheckoutSummary(user.id, { addressId, couponCode } satisfies CheckoutSummaryInput);
  }

  @Post("orders")
  async createOrder(@Headers("authorization") authorization: string | undefined, @Body() body: CreateOrderInput) {
    const user = await this.authService.requireUser(authorization);
    return this.ordersService.createOrder(user.id, body);
  }

  @Get("orders")
  async listOrders(@Headers("authorization") authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    return this.ordersService.listUserOrders(user.id);
  }

  @Get("orders/:id")
  async getOrder(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const user = await this.authService.requireUser(authorization);
    return this.ordersService.getUserOrder(user.id, id);
  }

  @Post("orders/:id/confirm-receipt")
  async confirmReceipt(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const user = await this.authService.requireUser(authorization);
    return this.ordersService.confirmReceipt(user.id, id);
  }

  @Post("orders/expire")
  closeExpiredOrders() {
    return this.ordersService.closeExpiredOrders();
  }

  @Get("admin/orders")
  listAdminOrders() {
    return this.ordersService.listAdminOrders();
  }

  @Post("admin/orders/:id/shipment")
  createShipment(@Param("id") id: string, @Body() body: CreateShipmentInput) {
    return this.ordersService.createShipment(id, body);
  }

  @Post("admin/orders/expire")
  closeExpiredAdminOrders() {
    return this.ordersService.closeExpiredOrders();
  }
}
