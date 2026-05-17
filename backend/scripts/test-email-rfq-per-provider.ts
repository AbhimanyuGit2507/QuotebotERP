/* eslint-disable no-console */
import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { EmailService } from '../src/email/email.service';
import { EmailRfqService } from '../src/email-rfq/email-rfq.service';

dotenv.config();

type Provider = 'groq' | 'cerebras' | 'gemini';

function tag() {
  return `provider-test-${Date.now()}`;
}

function providerLabel(provider: Provider) {
  return provider.toUpperCase();
}

async function main() {
  const runTag = tag();
  const providers: Provider[] = ['groq', 'cerebras', 'gemini'];

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

    const emailAccount = await prisma.emailAccount.create({
      data: {
        tenant_id: tenant.id,
        user_id: user.id,
        provider: 'gmail',
        email_address: `rfq-test-${runTag}@quotebot.local`,
        credentials: {
          access_token: 'dummy-token',
          refresh_token: 'dummy-refresh',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        is_active: true,
      },
    });

    for (const provider of providers) {
      process.env.RFQ_LLM_FALLBACK_ORDER = provider;

      const subject = `RFQ inquiry ${providerLabel(provider)} ${runTag}`;
      const body = [
        'Hi team,',
        'Please send a quotation for the following items.',
        'We need pricing and availability.',
        'Thanks!',
      ].join('\n');

      const externalId = `${runTag}-${provider}-ext`;

      await emailService.processInboundEmail(tenant.id, {
        email_account_id: emailAccount.id,
        external_id: externalId,
        thread_id: `${runTag}-${provider}-thread`,
        provider: 'gmail',
        sender_email: `buyer-${provider}@example.com`,
        sender_name: `Buyer ${providerLabel(provider)}`,
        subject,
        body,
        received_at: new Date().toISOString(),
        raw_payload: {
          body_text: body,
          body_html: '',
          source: 'test-email-rfq-per-provider-script',
          provider,
        },
      });

      const result = await emailRfqService.processPendingMessages({
        tenantId: tenant.id,
        limit: 50,
      });

      const processed = await prisma.message.findFirst({
        where: {
          tenant_id: tenant.id,
          external_id: externalId,
        },
        select: {
          processing_status: true,
          raw_payload: true,
        },
      });

      const payload =
        processed?.raw_payload &&
        typeof processed.raw_payload === 'object' &&
        !Array.isArray(processed.raw_payload)
          ? (processed.raw_payload as Record<string, unknown>)
          : {};

      console.log(`\n[${providerLabel(provider)}]`);
      console.log(`fallback_order=${process.env.RFQ_LLM_FALLBACK_ORDER}`);
      console.log(`status=${processed?.processing_status || 'unknown'}`);
      console.log(`parsing_source=${String(payload.parsing_source || '')}`);
      console.log(`pipeline_stage=${String(payload.pipeline_stage || '')}`);
      console.log(`parsing_error=${String(payload.parsing_error || '')}`);
      console.log(`summary=${JSON.stringify(result)}`);
    }

    console.log('\nDone. Messages are retained for inspection.');
  } finally {
    await app.close();
  }
}

void main();
