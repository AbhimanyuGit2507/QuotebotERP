import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailController } from './email.controller';
import { EmailIntegrationsController } from './email-integrations.controller';
import { EmailService } from './email.service';
import { InternalEmailAccountsController } from './internal-email-accounts.controller';
import { UserEmailController } from './user-email.controller';

@Module({
  controllers: [
    EmailController,
    EmailIntegrationsController,
    InternalEmailAccountsController,
    // User-facing email send controller
    // Allows authenticated users to send email immediately via connected Gmail account
    UserEmailController,
  ],
  providers: [EmailService, PrismaService],
  exports: [EmailService],
})
export class EmailModule {}
