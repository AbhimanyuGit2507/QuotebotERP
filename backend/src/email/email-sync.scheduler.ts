import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmailService } from './email.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class EmailSyncScheduler {
  private readonly logger = new Logger(EmailSyncScheduler.name);
  // In development, automatic sync is disabled by default. Enable by setting
  // AUTO_EMAIL_SYNC_ENABLED=true in the environment.
  private readonly AUTO_SYNC_ENABLED =
    process.env.AUTO_EMAIL_SYNC_ENABLED === 'true';

  constructor(
    private emailService: EmailService,
    private prisma: PrismaService,
  ) {
    if (this.AUTO_SYNC_ENABLED) {
      this.logger.log('✓ Automatic email sync enabled (every 10 seconds)');
    } else {
      this.logger.log(
        'Automatic email sync is disabled (set AUTO_EMAIL_SYNC_ENABLED=true to enable)',
      );
    }
  }

  /**
   * Runs every 10 seconds to check for new emails
   * Cron pattern: every 10 seconds
   */
  @Cron('*/10 * * * * *', {
    name: 'auto-email-sync',
  })
  async handleEmailSync() {
    if (!this.AUTO_SYNC_ENABLED) {
      return;
    }

    try {
      // Get all active tenants with email accounts
      const tenants = await this.prisma.emailAccount.findMany({
        where: {
          is_active: true,
        },
        select: {
          tenant_id: true,
        },
        distinct: ['tenant_id'],
      });

      if (tenants.length === 0) {
        // No email accounts configured, skip sync
        return;
      }

      // Sync emails for each tenant
      for (const { tenant_id } of tenants) {
        try {
          const currentStatus = this.emailService.getGmailSyncStatus(tenant_id);

          // Skip if sync is already running for this tenant
          if (currentStatus.status === 'running') {
            this.logger.debug(
              `Skipping sync for tenant ${tenant_id} - already running`,
            );
            continue;
          }

          // Trigger sync
          const result = this.emailService.triggerImmediateGmailSync(
            tenant_id,
            {
              syncMode: 'catchup',
            },
          );

          if (result.started) {
            this.logger.log(`📧 Email sync started for tenant: ${tenant_id}`);
          }
        } catch (error) {
          this.logger.error(
            `Failed to sync emails for tenant ${tenant_id}: ${error instanceof Error ? error.message : String(error)}`,
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
