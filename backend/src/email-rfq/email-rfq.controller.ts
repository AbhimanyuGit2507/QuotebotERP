import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { InternalKeyAuthGuard } from '../common/guards/internal-key-auth.guard';
import { EmailRfqService } from './email-rfq.service';

@Controller('internal/email-rfq')
@UseGuards(InternalKeyAuthGuard)
export class EmailRfqController {
  constructor(private readonly emailRfqService: EmailRfqService) {}

  @Post('process-pending')
  processPending(@Req() req: Request, @Body() body: { limit?: number }) {
    const tenantId = req['tenantId'] as string | undefined;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID not found in request');
    }

    return this.emailRfqService.processPendingMessages({
      tenantId,
      limit: body?.limit,
    });
  }
}
