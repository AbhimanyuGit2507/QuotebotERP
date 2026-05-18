import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TaxService } from './tax.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateTaxProfileDto } from './dtos/create-tax-profile.dto';
import { CalculateTaxDto } from './dtos/calculate-tax.dto';

@ApiTags('Tax')
@UseGuards(JwtAuthGuard)
@Controller('tax-profiles')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.taxService.findAll(user.tenant_id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taxService.findOne(id, user.tenant_id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaxProfileDto,
  ) {
    return this.taxService.create(user.tenant_id, dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaxProfileDto,
  ) {
    return this.taxService.update(id, user.tenant_id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taxService.remove(id, user.tenant_id);
  }

  @Post('seed-defaults')
  seedDefaults(@CurrentUser() user: AuthenticatedUser) {
    return this.taxService.seedDefaults(user.tenant_id);
  }

  @Post('calculate')
  calculate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CalculateTaxDto,
  ) {
    return this.taxService.calculateTax(
      dto.amount,
      dto.tax_profile_id,
      user.tenant_id,
      dto.client_id,
    );
  }
}
