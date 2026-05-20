import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PERMISSIONS } from '../common/constants/permissions';

@ApiTags('Currency')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('supported')
  @RequirePermission(PERMISSIONS.CURRENCY_VIEW)
  @ApiOperation({ summary: 'Get supported currencies' })
  @ApiResponse({ status: 200, description: 'List of supported currencies' })
  getSupportedCurrencies() {
    return this.currencyService.getSupportedCurrencies();
  }

  @Get('rates')
  @RequirePermission(PERMISSIONS.CURRENCY_VIEW)
  @ApiOperation({ summary: 'Get exchange rates' })
  @ApiResponse({ status: 200, description: 'Exchange rate data' })
  getRates(@CurrentUser() user: AuthenticatedUser) {
    return this.currencyService.getExchangeRates(user.tenant_id);
  }

  @Post('rates')
  @RequirePermission(PERMISSIONS.CURRENCY_EDIT)
  @ApiOperation({ summary: 'Set a custom exchange rate' })
  @ApiResponse({ status: 201, description: 'Exchange rate set' })
  setRate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { from: string; to: string; rate: number },
  ) {
    return this.currencyService.setExchangeRate(
      user.tenant_id,
      body.from,
      body.to,
      body.rate,
    );
  }

  @Get('convert')
  @RequirePermission(PERMISSIONS.CURRENCY_VIEW)
  @ApiOperation({ summary: 'Convert an amount between currencies' })
  @ApiResponse({ status: 200, description: 'Converted amount' })
  convert(
    @CurrentUser() user: AuthenticatedUser,
    @Query('amount') amount: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.currencyService.convert(
      Number(amount),
      from,
      to,
      user.tenant_id,
    );
  }
}
