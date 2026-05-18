import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateClientDto } from './dtos/create-client.dto';
import { UpdateClientDto } from './dtos/update-client.dto';
import { UpdateClientTierDto } from './dtos/update-client-tier.dto';

@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('tier') tier?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const allowedTiers = ['new', 'regular', 'top'];

    if (tier && !allowedTiers.includes(tier)) {
      throw new BadRequestException('Invalid tier filter');
    }

    return this.clientsService.findAll(user.tenant_id, {
      search,
      tier,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    });
  }

  @Get('export/csv')
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search: string | undefined,
    @Query('tier') tier: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.clientsService.exportCsv(user.tenant_id, {
      search,
      tier,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="clients-export.csv"',
    );

    return res.send(csv);
  }

  @Get(':id/transactions')
  transactions(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.clientsService.transactions(id, user.tenant_id);
  }

  @Put(':id/tier')
  updateTier(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateClientTierDto,
  ) {
    return this.clientsService.updateTier(id, user.tenant_id, body.tier);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.clientsService.findOne(id, user.tenant_id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateClientDto,
  ) {
    return this.clientsService.create(user.tenant_id, body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateClientDto,
  ) {
    return this.clientsService.update(id, user.tenant_id, body);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('forceDelete') forceDelete: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (forceDelete === 'true') {
      return this.clientsService.forceDelete(id, user.tenant_id);
    }
    return this.clientsService.remove(id, user.tenant_id);
  }
}
