import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  HttpCode,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { MetaWhatsAppService } from './meta-whatsapp.service';
import { PrismaService } from '../../prisma.service';

@Controller('whatsapp/meta')
export class MetaWhatsAppController {
  private readonly logger = new Logger(MetaWhatsAppController.name);

  constructor(
    private readonly metaService: MetaWhatsAppService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('auth')
  getAuthUrl() {
    return { url: this.metaService.getAuthUrl() };
  }

  @UseGuards(JwtAuthGuard)
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('phone_number_id') phoneNumberId: string,
    @Query('waba_id') wabaId: string,
    @Req() req: Request & { user: AuthenticatedUser },
    @Res() res: Response,
  ) {
    try {
      const { tenant_id: tenantId } = req.user;
      if (!tenantId) throw new BadRequestException('Missing tenant');

      const tokens = await this.metaService.exchangeCode(code);

      await this.prisma.whatsAppAccount.create({
        data: {
          tenant_id: tenantId,
          client_type: 'meta',
          meta_phone_number_id: phoneNumberId,
          meta_waba_id: wabaId,
          meta_access_token: tokens.access_token,
          is_active: true,
        },
      });

      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/system-config?tab=whatsapp&connected=meta`,
      );
    } catch (err) {
      this.logger.error(`Meta callback error: ${(err as Error).message}`);
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/system-config?tab=whatsapp&error=meta`,
      );
    }
  }

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const result = this.metaService.verifyWebhook(mode, token, challenge);
    if (result) {
      res.status(200).send(result);
    } else {
      res.sendStatus(403);
    }
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Req() req: Request) {
    try {
      await this.metaService.processWebhookPayload(req.body);
    } catch (err) {
      this.logger.warn(`Meta webhook error: ${(err as Error).message}`);
    }
    return { status: 'ok' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('disconnect/:accountId')
  async disconnect(
    @Param('accountId') accountId: string,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant');
    await this.prisma.whatsAppAccount.deleteMany({
      where: { id: accountId, tenant_id: tenantId },
    });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('accounts')
  async getAccounts(@Req() req: Request & { user: AuthenticatedUser }) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) throw new BadRequestException('Missing tenant');
    return this.prisma.whatsAppAccount.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true,
        client_type: true,
        phone_number: true,
        display_name: true,
        is_active: true,
        meta_phone_number_id: true,
        last_connected_at: true,
        created_at: true,
      },
    });
  }
}
