import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('sales-trends')
  salesTrends(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.salesTrends(user.tenant_id);
  }

  @Get('rfq-analysis')
  rfqAnalysis(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.rfqAnalysis(user.tenant_id);
  }

  @Get('quote-performance')
  quotePerformance(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.quotePerformance(user.tenant_id);
  }

  @Get('product-performance')
  productPerformance(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.productPerformance(user.tenant_id);
  }

  @Get('client-insights')
  clientInsights(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.clientInsights(user.tenant_id);
  }

  @Get('channel-breakdown')
  channelBreakdown(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.channelBreakdown(user.tenant_id);
  }

  @Get(':report/csv')
  async exportCsv(
    @Param('report') report: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const csv = await this.analyticsService.exportCsv(user.tenant_id, report);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="analytics-${report}.csv"`,
    );

    return res.send(csv);
  }
}
