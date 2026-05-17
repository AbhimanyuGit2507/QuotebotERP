/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { EmailService } from '../src/email/email.service';
import { EmailRfqService } from '../src/email-rfq/email-rfq.service';

type SeedMessage = {
  subject: string;
  body: string;
  sender: string;
  senderName: string;
};

function tag() {
  return `pipeline-test-${Date.now()}`;
}

async function main() {
  const runTag = tag();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const prisma = app.get(PrismaService);
    const emailService = app.get(EmailService);
    const emailRfqService = app.get(EmailRfqService);

    const tenant = await prisma.tenant.findFirst({
      orderBy: { created_at: 'desc' },
    });

    if (!tenant) {
      throw new Error('No tenant found. Run backend seed first.');
    }

    const user = await prisma.user.findFirst({
      where: { tenant_id: tenant.id },
      orderBy: { created_at: 'asc' },
    });

    if (!user) {
      throw new Error(`No user found for tenant ${tenant.id}.`);
    }

    const emailAddress = `qa-${runTag}@quotebot.local`;
    const emailAccount = await prisma.emailAccount.create({
      data: {
        tenant_id: tenant.id,
        user_id: user.id,
        provider: 'gmail',
        email_address: emailAddress,
        credentials: {
          access_token: 'dummy-token',
          refresh_token: 'dummy-refresh',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        is_active: true,
      },
    });

    const products = await prisma.product.findMany({
      where: { tenant_id: tenant.id, status: 'active' },
      orderBy: { created_at: 'asc' },
      take: 2,
      select: { id: true, name: true, unit: true },
    });

    if (products.length < 2) {
      throw new Error('Need at least 2 active products to run parsing test.');
    }

    const nonRfqEmail: SeedMessage = {
      subject: `Newsletter Update ${runTag}`,
      sender: `newsletter-${runTag}@example.com`,
      senderName: 'Monthly Newsletter',
      body: 'Hello team, this is our monthly newsletter. To unsubscribe click here.',
    };

    const rfqEmail: SeedMessage = {
      subject: `RFQ Request ${runTag}`,
      sender: `buyer-${runTag}@example.com`,
      senderName: 'Test Buyer',
      body: [
        'Please quote urgently for the following items:',
        `${products[0].name} - 3 ${products[0].unit || 'pcs'}`,
        `${products[1].name} - 5 ${products[1].unit || 'pcs'}`,
      ].join('\n'),
    };

    const seedSet = [nonRfqEmail, rfqEmail];

    for (let i = 0; i < seedSet.length; i += 1) {
      const email = seedSet[i];
      await emailService.processInboundEmail(tenant.id, {
        email_account_id: emailAccount.id,
        external_id: `${runTag}-ext-${i + 1}`,
        thread_id: `${runTag}-thread-${i + 1}`,
        provider: 'gmail',
        sender_email: email.sender,
        sender_name: email.senderName,
        subject: email.subject,
        body: email.body,
        received_at: new Date(Date.now() - (seedSet.length - i) * 1000).toISOString(),
        raw_payload: {
          body_text: email.body,
          body_html: '',
          source: 'test-email-rfq-pipeline-script',
          tag: runTag,
        },
      });
    }

    const pendingBefore = await prisma.message.count({
      where: {
        tenant_id: tenant.id,
        processing_status: 'pending',
        external_id: { startsWith: `${runTag}-ext-` },
      },
    });

    const result = await emailRfqService.processPendingMessages({
      tenantId: tenant.id,
      limit: 50,
    });

    const processedMessages = await prisma.message.findMany({
      where: {
        tenant_id: tenant.id,
        external_id: { startsWith: `${runTag}-ext-` },
      },
      include: {
        conversation: true,
      },
      orderBy: { created_at: 'asc' },
    });

    const parsedNonRfq = processedMessages.find((m) =>
      m.external_id?.endsWith('1'),
    );
    const parsedRfq = processedMessages.find((m) => m.external_id?.endsWith('2'));

    const rfqCount = await prisma.rFQ.count({
      where: {
        tenant_id: tenant.id,
        created_at: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });

    console.log('\n=== Email->RFQ Pipeline Test Result ===');
    console.log(`Run Tag: ${runTag}`);
    console.log(`Tenant: ${tenant.id}`);
    console.log(`Email Account: ${emailAccount.id}`);
    console.log(`Pending before process: ${pendingBefore}`);
    console.log(`Pipeline summary: ${JSON.stringify(result)}`);
    console.log(`Recent RFQ count (last 10m): ${rfqCount}`);

    if (parsedNonRfq) {
      const payload = (parsedNonRfq.raw_payload || {}) as Record<string, unknown>;
      console.log('\nNon-RFQ message verification:');
      console.log(`- processing_status: ${parsedNonRfq.processing_status}`);
      console.log(`- parsing_source: ${String(payload.parsing_source || '')}`);
      console.log(`- pipeline_stage: ${String(payload.pipeline_stage || '')}`);
      console.log(`- parsing_error: ${String(payload.parsing_error || '')}`);
    }

    if (parsedRfq) {
      const payload = (parsedRfq.raw_payload || {}) as Record<string, unknown>;
      const parsedItems = Array.isArray(payload.parsed_items)
        ? payload.parsed_items.length
        : 0;
      console.log('\nRFQ-like message verification:');
      console.log(`- processing_status: ${parsedRfq.processing_status}`);
      console.log(`- parsing_source: ${String(payload.parsing_source || '')}`);
      console.log(`- pipeline_stage: ${String(payload.pipeline_stage || '')}`);
      console.log(`- parsed_items_count: ${parsedItems}`);
      console.log(`- auto_rfq_created: ${String(payload.auto_rfq_created || false)}`);
      console.log(`- rfq_id: ${String(payload.rfq_id || '')}`);
      console.log(`- quotation_id: ${String(payload.quotation_id || '')}`);
    }

    console.log('\nDone. Seeded emails are retained in DB for inspection.');
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('\nPipeline test failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
