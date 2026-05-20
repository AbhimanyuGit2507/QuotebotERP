import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { EmailService } from './email.service';
import { PrismaService } from '../prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class EmailSyncScheduler {
  private readonly logger = new Logger(EmailSyncScheduler.name);
  private readonly AUTO_SYNC_ENABLED =
    process.env.AUTO_EMAIL_SYNC_ENABLED === 'true';

  constructor(
    private emailService: EmailService,
    private prisma: PrismaService,
    private eventsService: EventsService,
    @InjectQueue('email-sync') private emailSyncQueue: Queue,
  ) {
    if (this.AUTO_SYNC_ENABLED) {
      this.logger.log('✓ Automatic email sync enabled (every 5 minutes via Bull queue)');
    } else {
      this.logger.log(
        'Automatic email sync is disabled (set AUTO_EMAIL_SYNC_ENABLED=true to enable)',
      );
    }
  }

  /**
   * Runs every 5 minutes as fallback polling (real-time path is via webhooks)
   */
  @Cron('0 */5 * * * *', {
    name: 'auto-email-sync',
  })
  async handleEmailSync() {
    if (!this.AUTO_SYNC_ENABLED) {
      return;
    }

    try {
      const accounts = await this.prisma.emailAccount.findMany({
        where: { is_active: true },
        select: {
          id: true,
          tenant_id: true,
          provider: true,
        },
      });

      if (accounts.length === 0) {
        return;
      }

      for (const account of accounts) {
        try {
          const tenantId = account.tenant_id;

          // Gmail accounts
          if (account.provider === 'gmail') {
            await this.emailSyncQueue.add(
              'sync-account',
              {
                tenantId,
                emailAccountId: account.id,
                mode: 'incremental',
              },
              {
                jobId: `gmail-${tenantId}`, // dedup: one per tenant
                removeOnComplete: 100,
                removeOnFail: 50,
              },
            );
          }

          // Outlook accounts - handled via OutlookService delta sync
          if (account.provider === 'outlook') {
            await this.emailSyncQueue.add(
              'sync-account',
              {
                tenantId,
                emailAccountId: account.id,
                mode: 'incremental',
              },
              {
                jobId: `outlook-${account.id}`,
                removeOnComplete: 100,
                removeOnFail: 50,
              },
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to queue sync for account ${account.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Email sync scheduler error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
