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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TaxService } from './tax.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateTaxProfileDto } from './dtos/create-tax-profile.dto';
import { CalculateTaxDto } from './dtos/calculate-tax.dto';

@ApiTags('Tax')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax-profiles')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get()
  @ApiOperation({ summary: 'List all tax profiles' })
  @ApiResponse({ status: 200, description: 'List of tax profiles' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.taxService.findAll(user.tenant_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single tax profile by ID' })
  @ApiParam({ name: 'id', description: 'Tax profile ID' })
  @ApiResponse({ status: 200, description: 'Tax profile details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.taxService.findOne(id, user.tenant_id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tax profile' })
  @ApiResponse({ status: 201, description: 'Tax profile created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaxProfileDto,
  ) {
    return this.taxService.create(user.tenant_id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing tax profile' })
  @ApiParam({ name: 'id', description: 'Tax profile ID' })
  @ApiResponse({ status: 200, description: 'Tax profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaxProfileDto,
  ) {
    return this.taxService.update(id, user.tenant_id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tax profile' })
  @ApiParam({ name: 'id', description: 'Tax profile ID' })
  @ApiResponse({ status: 200, description: 'Tax profile deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.taxService.remove(id, user.tenant_id);
  }

  @Post('seed-defaults')
  @ApiOperation({ summary: 'Seed default tax profiles for the tenant' })
  @ApiResponse({ status: 201, description: 'Default tax profiles seeded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  seedDefaults(@CurrentUser() user: AuthenticatedUser) {
    return this.taxService.seedDefaults(user.tenant_id);
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate tax for a given amount and profile' })
  @ApiResponse({ status: 200, description: 'Tax calculation result' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
