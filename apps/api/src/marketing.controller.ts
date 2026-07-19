import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post } from "@nestjs/common";
import { ContactMessageStatus } from "@prisma/client";
import { AuthService } from "./auth.service";
import {
  type AbandonedCartReminderInput,
  type ContactMessageInput,
  type FavoriteInput,
  MarketingService,
  type NewsletterInput
} from "./marketing.service";

@Controller()
export class MarketingController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(MarketingService) private readonly marketingService: MarketingService
  ) {}

  @Get("marketing")
  getPublicMarketing() {
    return this.marketingService.getPublicMarketing();
  }

  @Post("newsletter-subscriptions")
  subscribe(@Body() body: NewsletterInput) {
    return this.marketingService.subscribe(body);
  }

  @Post("contact-messages")
  async createContactMessage(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: ContactMessageInput
  ) {
    const user = await this.authService.getUserFromAuthorization(authorization);
    return this.marketingService.createContactMessage(user?.id ?? null, body);
  }

  @Get("favorites")
  async listFavorites(@Headers("authorization") authorization: string | undefined) {
    const user = await this.authService.requireUser(authorization);
    return this.marketingService.listUserFavorites(user.id);
  }

  @Post("favorites")
  async addFavorite(@Headers("authorization") authorization: string | undefined, @Body() body: FavoriteInput) {
    const user = await this.authService.requireUser(authorization);
    return this.marketingService.addFavorite(user.id, body);
  }

  @Delete("favorites/:productId")
  async removeFavorite(@Headers("authorization") authorization: string | undefined, @Param("productId") productId: string) {
    const user = await this.authService.requireUser(authorization);
    return this.marketingService.removeFavorite(user.id, productId);
  }

  @Post("cart/reminders")
  async createAbandonedCartReminder(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-guest-session-id") guestSessionId: string | undefined,
    @Body() body: AbandonedCartReminderInput
  ) {
    const user = await this.authService.getUserFromAuthorization(authorization);
    return this.marketingService.createAbandonedCartReminder(
      user ? { userId: user.id } : { guestSessionId: guestSessionId ?? body.guestSessionId },
      body
    );
  }

  @Get("admin/marketing")
  listAdminMarketing() {
    return this.marketingService.listAdminMarketing();
  }

  @Patch("admin/contact-messages/:id/status")
  updateContactStatus(@Param("id") id: string, @Body("status") status: ContactMessageStatus) {
    return this.marketingService.updateContactStatus(id, status);
  }
}
