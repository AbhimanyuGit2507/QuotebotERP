import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  getKpis(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getKpis(user.tenant_id);
  }

  @Get('charts/rfq-vs-quotes')
  getRfqVsQuotes(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getRfqVsQuotes(user.tenant_id);
  }

  @Get('charts/quote-status')
  getQuoteStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getQuoteStatus(user.tenant_id);
  }

  @Get('charts/rfq-by-channel')
  getRfqByChannel(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getRfqByChannel(user.tenant_id);
  }

  @Get('activity-feed')
  getActivityFeed(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getActivityFeed(user.tenant_id);
  }

  @Get('system-status')
  getSystemStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getSystemStatus(user.tenant_id);
  }
}
