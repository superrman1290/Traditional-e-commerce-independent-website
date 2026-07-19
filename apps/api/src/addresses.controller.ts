import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post } from "@nestjs/common";
import { AddressesService, type AddressInput } from "./addresses.service";
import { AuthService } from "./auth.service";

@Controller("addresses")
export class AddressesController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AddressesService) private readonly addressesService: AddressesService
  ) {}

  @Get()
  async list(@Headers("authorization") authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    return this.addressesService.list(user.id);
  }

  @Post()
  async create(@Headers("authorization") authorization: string | undefined, @Body() body: AddressInput) {
    const user = await this.authService.requireUser(authorization);
    return this.addressesService.create(user.id, body);
  }

  @Patch(":id")
  async update(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: Partial<AddressInput>
  ) {
    const user = await this.authService.requireUser(authorization);
    return this.addressesService.update(user.id, id, body);
  }

  @Delete(":id")
  async remove(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const user = await this.authService.requireUser(authorization);
    return this.addressesService.remove(user.id, id);
  }
}

