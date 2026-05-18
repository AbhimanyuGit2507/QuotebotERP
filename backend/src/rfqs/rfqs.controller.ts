import {
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
import { RfqsService } from './rfqs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { RfqsQueryDto } from './dtos/rfqs-query.dto';
import { CreateRfqDto } from './dtos/create-rfq.dto';
import { UpdateRfqDto } from './dtos/update-rfq.dto';
import { UpdateRfqStatusDto } from './dtos/update-rfq-status.dto';
import { CreateRfqFromEmailDto } from './dtos/create-rfq-from-email.dto';
import { SendRfqEmailDto } from './dtos/send-rfq-email.dto';

@UseGuards(JwtAuthGuard)
@Controller('rfqs')
export class RfqsController {
  constructor(private readonly rfqsService: RfqsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RfqsQueryDto,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.rfqsService.findAll(user.tenant_id, {
      search: query.search,
      status: query.status,
      channel: query.channel,
      limit: query.limit,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    });
  }

  @Get('export/csv')
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RfqsQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.rfqsService.exportCsv(user.tenant_id, {
      search: query.search,
      status: query.status,
      channel: query.channel,
      limit: query.limit,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="rfqs-export.csv"',
    );

    return res.send(csv);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.rfqsService.findOne(id, user.tenant_id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateRfqDto) {
    return this.rfqsService.create(user.tenant_id, body);
  }

  @Post('from-email')
  createFromEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateRfqFromEmailDto,
  ) {
    return this.rfqsService.createFromEmail(user.tenant_id, body);
  }

  @Post('preview-from-email')
  previewFromEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateRfqFromEmailDto,
  ): Promise<unknown> {
    return this.rfqsService.previewFromEmail(user.tenant_id, body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateRfqDto,
  ) {
    return this.rfqsService.update(id, user.tenant_id, body);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateRfqStatusDto,
  ) {
    return this.rfqsService.updateStatus(id, user.tenant_id, body.status);
  }

  @Post(':id/convert-to-quotation')
  convertToQuotation(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rfqsService.convertToQuotation(id, user.tenant_id);
  }

  @Post(':id/send-email')
  sendByEmail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SendRfqEmailDto,
  ) {
    return this.rfqsService.sendByEmail(id, user.tenant_id, body);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('forceDeleteLinkedQuotation') force?: string,
    @Query('forceDelete') forceDelete?: string,
  ) {
    const forceFlag = Boolean(force === 'true' || force === '1');
    if (forceDelete === 'true') {
      return this.rfqsService.forceDelete(id, user.tenant_id, {
        forceDeleteLinkedQuotation: forceFlag,
      });
    }
    return this.rfqsService.remove(id, user.tenant_id, {
      forceDeleteLinkedQuotation: forceFlag,
    });
  }
}
