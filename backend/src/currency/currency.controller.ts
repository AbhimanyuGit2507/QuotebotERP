import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('Currency')
@UseGuards(JwtAuthGuard)
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('supported')
  getSupportedCurrencies() {
    return this.currencyService.getSupportedCurrencies();
  }

  @Get('rates')
  getRates(@CurrentUser() user: AuthenticatedUser) {
    return this.currencyService.getExchangeRates(user.tenant_id);
  }

  @Post('rates')
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
