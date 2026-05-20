import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { BaileysService } from './baileys.service';
import { PrismaService } from '../../prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('whatsapp/baileys')
export class BaileysController {
  private readonly logger = new Logger(BaileysController.name);

  constructor(
    private readonly baileysService: BaileysService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('connect')
  async connect(@Req() req: Request & { user: AuthenticatedUser }) {
    const { tenant_id: tenantId } = req.user;
    if (!tenantId) throw new BadRequestException('Missing tenant context');

    const account = await this.prisma.whatsAppAccount.create({
      data: {
        tenant_id: tenantId,
        client_type: 'baileys',
        is_active: false,
      },
    });

    // Start session asynchronously
    void this.baileysService.initSession(account.id).catch((err) => {
      this.logger.error(`Baileys initSession failed: ${(err as Error).message}`);
    });

    return { accountId: account.id, status: 'connecting', message: 'QR code will be emitted via WebSocket whatsapp.qr event' };
  }

  @Get('qr/:accountId')
  async getQR(@Param('accountId') accountId: string) {
    const qr = await this.baileysService.getQR(accountId);
    if (!qr) return { qr: null, status: this.baileysService.getStatus(accountId) };
    return { qr, status: 'qr_pending' };
  }

  @Get('status/:accountId')
  getStatus(@Param('accountId') accountId: string) {
    return { status: this.baileysService.getStatus(accountId) };
  }

  @Delete('disconnect/:accountId')
  async disconnect(@Param('accountId') accountId: string) {
    await this.baileysService.disconnectSession(accountId);
    return { success: true };
  }
}
