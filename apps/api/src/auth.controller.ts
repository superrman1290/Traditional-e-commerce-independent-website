import { Body, Controller, Get, Headers, Inject, Post } from "@nestjs/common";
import { AuthService, type LoginInput, type RegisterInput } from "./auth.service";
import { CartService } from "./cart.service";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(CartService) private readonly cartService: CartService
  ) {}

  @Post("register")
  async register(@Body() body: RegisterInput) {
    const result = await this.authService.register(body);
    const cart = await this.cartService.mergeGuestCartIntoUser(body.guestSessionId, result.user.id);
    return { ...result, cart };
  }

  @Post("login")
  async login(@Body() body: LoginInput) {
    const result = await this.authService.login(body);
    const cart = await this.cartService.mergeGuestCartIntoUser(body.guestSessionId, result.user.id);
    return { ...result, cart };
  }

  @Get("me")
  me(@Headers("authorization") authorization?: string) {
    return this.authService.me(authorization);
  }
}

