import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmailSyncProcessor } from './email-sync.processor';
import { EventsModule } from '../events/events.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    BullModule.forRoot({
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
    }),
    BullModule.registerQueue({
      name: 'email-sync',
    }),
    EventsModule,
    forwardRef(() => EmailModule),
  ],
  providers: [EmailSyncProcessor],
  exports: [BullModule],
})
export class QueueModule {}
