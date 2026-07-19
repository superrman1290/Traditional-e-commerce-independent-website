import { Body, Controller, Get, Headers, Inject, Param, Patch, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AfterSalesService, type CreateAfterSaleInput, type UpdateAfterSaleInput } from "./after-sales.service";

@Controller()
export class AfterSalesController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AfterSalesService) private readonly afterSalesService: AfterSalesService
  ) {}

  @Post("after-sales")
  async createRequest(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: CreateAfterSaleInput
  ) {
    const user = await this.authService.requireUser(authorization);
    return this.afterSalesService.createRequest(user.id, body);
  }

  @Get("after-sales")
  async listUserRequests(@Headers("authorization") authorization: string | undefined) {
    const user = await this.authService.requireUser(authorization);
    return this.afterSalesService.listUserRequests(user.id);
  }

  @Get("admin/after-sales")
  listAdminRequests() {
    return this.afterSalesService.listAdminRequests();
  }

  @Patch("admin/after-sales/:id")
  updateRequest(@Param("id") id: string, @Body() body: UpdateAfterSaleInput) {
    return this.afterSalesService.updateRequest(id, body);
  }
}
