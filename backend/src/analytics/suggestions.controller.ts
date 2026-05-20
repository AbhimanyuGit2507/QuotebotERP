import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SuggestionsService } from './suggestions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('Suggestions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Get('pricing')
  @RequirePermission(PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get pricing suggestions for a product' })
  @ApiResponse({ status: 200, description: 'Pricing suggestions' })
  @ApiQuery({ name: 'productId', required: true, description: 'Product ID' })
  @ApiQuery({
    name: 'clientId',
    required: false,
    description: 'Client ID for client-specific pricing',
  })
  getPricingSuggestions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('productId') productId: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.suggestionsService.getPricingSuggestions(
      user.tenant_id,
      productId,
      clientId,
    );
  }

  @Get('follow-ups')
  @RequirePermission(PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({
    summary:
      'Get follow-up recommendations (stale quotes, overdue invoices, inactive clients)',
  })
  @ApiResponse({ status: 200, description: 'Follow-up recommendations' })
  getFollowUpRecommendations(@CurrentUser() user: AuthenticatedUser) {
    return this.suggestionsService.getFollowUpRecommendations(user.tenant_id);
  }

  @Get('demand')
  @RequirePermission(PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get demand forecast for a product' })
  @ApiResponse({ status: 200, description: 'Demand forecast data' })
  @ApiQuery({ name: 'productId', required: true, description: 'Product ID' })
  getDemandForecast(
    @CurrentUser() user: AuthenticatedUser,
    @Query('productId') productId: string,
  ) {
    return this.suggestionsService.getDemandForecast(user.tenant_id, productId);
  }
}
