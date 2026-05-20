import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaService } from '../prisma.service';
import { EmailController } from './email.controller';
import { EmailIntegrationsController } from './email-integrations.controller';
import { EmailService } from './email.service';
import { EmailSyncScheduler } from './email-sync.scheduler';
import { InternalEmailAccountsController } from './internal-email-accounts.controller';
import { UserEmailController } from './user-email.controller';
import { EventsModule } from '../events/events.module';
import { OutlookService } from './outlook.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email-sync',
    }),
    EventsModule,
  ],
  controllers: [
    EmailController,
    EmailIntegrationsController,
    InternalEmailAccountsController,
    UserEmailController,
  ],
  providers: [EmailService, EmailSyncScheduler, PrismaService, OutlookService],
  exports: [EmailService, OutlookService],
})
export class EmailModule {}
