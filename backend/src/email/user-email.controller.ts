import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { EmailService } from './email.service';

type AuthRequest = Request & {
  user?: { tenant_id?: string };
};

type SendEmailBody = {
  email_account_id: string;
  to: string[];
  cc?: string[];
  subject?: string;
  body?: string;
};

@UseGuards(JwtAuthGuard)
@Controller('email')
export class UserEmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  async sendEmail(@Req() req: AuthRequest, @Body() body: SendEmailBody) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID not found');
    }

    const { email_account_id, to, cc, subject, body: message } = body;

    if (!email_account_id || !Array.isArray(to) || to.length === 0) {
      throw new BadRequestException(
        'Missing required fields: email_account_id and to',
      );
    }

    return this.emailService.sendNow(tenantId, {
      email_account_id,
      to,
      cc,
      subject: subject || '',
      body: message || '',
    });
  }
}
