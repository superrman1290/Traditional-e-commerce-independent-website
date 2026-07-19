import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CartService, type AddCartItemInput, type UpdateCartItemInput } from "./cart.service";

@Controller()
export class CartController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(CartService) private readonly cartService: CartService
  ) {}

  @Post("guest-sessions")
  createGuestSession() {
    return this.cartService.createGuestSession();
  }

  @Get("cart")
  async getCart(
    @Headers("authorization") authorization?: string,
    @Headers("x-guest-session-id") guestSessionId?: string
  ) {
    return this.cartService.getCart(await this.resolveOwner(authorization, guestSessionId));
  }

  @Post("cart/items")
  async addItem(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-guest-session-id") guestSessionId: string | undefined,
    @Body() body: AddCartItemInput
  ) {
    return this.cartService.addItem(await this.resolveOwner(authorization, guestSessionId), body);
  }

  @Patch("cart/items/:id")
  async updateItem(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-guest-session-id") guestSessionId: string | undefined,
    @Param("id") id: string,
    @Body() body: UpdateCartItemInput
  ) {
    return this.cartService.updateItem(await this.resolveOwner(authorization, guestSessionId), id, body);
  }

  @Delete("cart/items/:id")
  async removeItem(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-guest-session-id") guestSessionId: string | undefined,
    @Param("id") id: string
  ) {
    return this.cartService.removeItem(await this.resolveOwner(authorization, guestSessionId), id);
  }

  @Post("cart/merge")
  async merge(
    @Headers("authorization") authorization: string | undefined,
    @Body("guestSessionId") guestSessionId?: string
  ) {
    const user = await this.authService.requireUser(authorization);
    return this.cartService.mergeGuestCartIntoUser(guestSessionId, user.id);
  }

  private async resolveOwner(authorization?: string, guestSessionId?: string) {
    const user = await this.authService.getUserFromAuthorization(authorization);
    return user ? { userId: user.id } : { guestSessionId };
  }
}

