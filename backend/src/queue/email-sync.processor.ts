import {
  Process,
  Processor,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EmailService } from '../email/email.service';
import { EventsService } from '../events/events.service';

export interface EmailSyncJobData {
  tenantId: string;
  emailAccountId: string;
  mode: 'incremental' | 'full';
}

@Processor('email-sync')
export class EmailSyncProcessor {
  private readonly logger = new Logger(EmailSyncProcessor.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly eventsService: EventsService,
  ) {}

  @Process('sync-account')
  async handleSyncAccount(job: Job<EmailSyncJobData>): Promise<void> {
    const { tenantId, emailAccountId, mode } = job.data;
    this.logger.log(
      `Processing sync job for tenant ${tenantId}, account ${emailAccountId}, mode: ${mode}`,
    );

    if (mode === 'incremental') {
      await this.emailService.syncGmailIncremental(emailAccountId);
    } else {
      this.emailService.triggerImmediateGmailSync(tenantId, {
        syncMode: 'catchup',
      });
    }
  }

  @OnQueueActive()
  onActive(job: Job<EmailSyncJobData>) {
    const { tenantId } = job.data;
    this.eventsService.emitSyncProgress(tenantId, {
      status: 'running',
      jobId: job.id,
      mode: job.data.mode,
    });
  }

  @OnQueueCompleted()
  onCompleted(job: Job<EmailSyncJobData>) {
    const { tenantId } = job.data;
    this.logger.log(`Sync job completed for tenant ${tenantId}`);
    this.eventsService.emitSyncProgress(tenantId, {
      status: 'completed',
      jobId: job.id,
    });
  }

  @OnQueueFailed()
  onFailed(job: Job<EmailSyncJobData>, error: Error) {
    const { tenantId } = job.data;
    this.logger.error(
      `Sync job failed for tenant ${tenantId}: ${error.message}`,
    );
    this.eventsService.emitSyncProgress(tenantId, {
      status: 'failed',
      jobId: job.id,
      error: error.message,
    });
  }
}
