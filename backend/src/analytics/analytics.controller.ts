import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('sales-trends')
  @RequirePermission(PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get sales trends data' })
  @ApiResponse({ status: 200, description: 'Sales trends data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  salesTrends(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.salesTrends(user.tenant_id);
  }

  @Get('rfq-analysis')
  @RequirePermission(PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get RFQ analysis data' })
  @ApiResponse({ status: 200, description: 'RFQ analysis data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  rfqAnalysis(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.rfqAnalysis(user.tenant_id);
  }

  @Get('quote-performance')
  @RequirePermission(PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get quote performance metrics' })
  @ApiResponse({ status: 200, description: 'Quote performance data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  quotePerformance(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.quotePerformance(user.tenant_id);
  }

  @Get('product-performance')
  @RequirePermission(PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get product performance metrics' })
  @ApiResponse({ status: 200, description: 'Product performance data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  productPerformance(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.productPerformance(user.tenant_id);
  }

  @Get('client-insights')
  @RequirePermission(PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get client insights data' })
  @ApiResponse({ status: 200, description: 'Client insights data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  clientInsights(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.clientInsights(user.tenant_id);
  }

  @Get('channel-breakdown')
  @RequirePermission(PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get RFQ channel breakdown data' })
  @ApiResponse({ status: 200, description: 'Channel breakdown data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  channelBreakdown(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.channelBreakdown(user.tenant_id);
  }

  @Get('conversion-funnel')
  @RequirePermission(PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get conversion funnel data' })
  @ApiResponse({ status: 200, description: 'Conversion funnel stages' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date (ISO 8601)',
  })
  conversionFunnel(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getConversionFunnel(
      user.tenant_id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('revenue-forecast')
  @RequirePermission(PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get revenue forecasting data' })
  @ApiResponse({
    status: 200,
    description: 'Revenue forecast with monthly trend',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  revenueForecast(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getRevenueForecasting(user.tenant_id);
  }

  @Get('client-insights-enhanced')
  @RequirePermission(PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({
    summary: 'Get enhanced client insights with growth and response metrics',
  })
  @ApiResponse({ status: 200, description: 'Enhanced client insights data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of top clients to return',
  })
  clientInsightsEnhanced(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getClientInsightsEnhanced(
      user.tenant_id,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('product-performance-enhanced')
  @RequirePermission(PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get enhanced product performance metrics' })
  @ApiResponse({
    status: 200,
    description: 'Enhanced product performance data',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of top products to return',
  })
  productPerformanceEnhanced(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getProductPerformanceEnhanced(
      user.tenant_id,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('ai-metrics')
  @RequirePermission(PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get AI pipeline metrics' })
  @ApiResponse({ status: 200, description: 'AI pipeline metrics data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  aiMetrics(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getAIPipelineMetrics(user.tenant_id);
  }

  @Get(':report/csv')
  @RequirePermission(PERMISSIONS.REPORT_EXPORT)
  @ApiOperation({ summary: 'Export an analytics report as CSV' })
  @ApiParam({
    name: 'report',
    description: 'Report type (e.g., sales-trends, rfq-analysis)',
  })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
