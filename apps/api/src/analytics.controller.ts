import { Body, Controller, Get, Headers, Inject, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AnalyticsService, type TrackEventInput } from "./analytics.service";

@Controller()
export class AnalyticsController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AnalyticsService) private readonly analyticsService: AnalyticsService
  ) {}

  @Post("analytics/events")
  async trackEvent(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-guest-session-id") guestSessionId: string | undefined,
    @Body() body: TrackEventInput
  ) {
    const user = await this.authService.getUserFromAuthorization(authorization);
    return this.analyticsService.trackEvent({
      ...body,
      userId: user?.id,
      guestSessionId: guestSessionId ?? body.guestSessionId
    });
  }

  @Get("admin/analytics")
  getAdminAnalytics() {
    return this.analyticsService.getAdminAnalytics();
  }
}
