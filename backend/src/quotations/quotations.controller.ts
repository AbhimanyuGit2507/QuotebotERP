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
import { QuotationsService } from './quotations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { QuotationsQueryDto } from './dtos/quotations-query.dto';
import { CreateQuotationDto } from './dtos/create-quotation.dto';
import { UpdateQuotationDto } from './dtos/update-quotation.dto';
import { SendQuotationEmailDto } from './dtos/send-quotation-email.dto';

@UseGuards(JwtAuthGuard)
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QuotationsQueryDto,
  ) {
    return this.quotationsService.findAll(user.tenant_id, query);
  }

  @Get('export/csv')
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QuotationsQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.quotationsService.exportCsv(user.tenant_id, query);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="quotations-export.csv"',
    );

    return res.send(csv);
  }

  @Get(':id/pdf')
  async printable(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const pdf = await this.quotationsService.generatePdfBuffer(
      id,
      user.tenant_id,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="quotation-${id}.pdf"`,
    );

    return res.send(pdf);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quotationsService.findOne(id, user.tenant_id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateQuotationDto,
  ) {
    return this.quotationsService.create(user.tenant_id, body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateQuotationDto,
  ) {
    return this.quotationsService.update(id, user.tenant_id, body);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('status') status: string,
  ) {
    const allowedStatuses = ['draft', 'sent', 'accepted', 'declined'];

    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException('Invalid quotation status');
    }

    return this.quotationsService.updateStatus(id, user.tenant_id, status);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.quotationsService.duplicate(id, user.tenant_id);
  }

  @Post(':id/send')
  sendByEmail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SendQuotationEmailDto,
  ) {
    return this.quotationsService.sendByEmail(id, user.tenant_id, body);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('forceDeleteLinkedRfq') force?: string,
  ) {
    const forceFlag = Boolean(force === 'true' || force === '1');
    return this.quotationsService.remove(id, user.tenant_id, {
      forceDeleteLinkedRfq: forceFlag,
    });
  }
}
