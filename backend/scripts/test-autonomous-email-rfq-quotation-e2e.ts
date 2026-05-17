/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { EmailService } from '../src/email/email.service';
import { QuotationsService } from '../src/quotations/quotations.service';

type WaitForOptions = {
  timeoutMs: number;
  intervalMs: number;
  stepName: string;
};

type AssertionResult = {
  name: string;
  passed: boolean;
  details?: string;
};

function runTag() {
  return `auto-e2e-${Date.now()}`;
}

function normalizeText(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function waitFor<T>(
  producer: () => Promise<T | null>,
  options: WaitForOptions,
): Promise<T | null> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < options.timeoutMs) {
    const value = await producer();
    if (value) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, options.intervalMs));
  }

  console.log(
    `[timeout] ${options.stepName} did not complete in ${options.timeoutMs}ms`,
  );
  return null;
}

async function gmailFindSentMessage(
  accessToken: string,
  subject: string,
  expectedRecipient: string,
) {
  const query = encodeURIComponent(`in:sent subject:"${subject}" newer_than:2d`);
  const listResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=5`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!listResponse.ok) {
    const errorBody = await listResponse.text();
    throw new Error(
      `Gmail sent-list check failed (${listResponse.status}): ${errorBody}`,
    );
  }

  const listJson = (await listResponse.json()) as {
    messages?: Array<{ id: string }>;
  };

  const messages = listJson.messages || [];
  if (messages.length === 0) {
    return null;
  }

  for (const msg of messages) {
    const detailResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!detailResponse.ok) {
      continue;
    }

    const detail = (await detailResponse.json()) as {
      id?: string;
      payload?: {
        headers?: Array<{ name?: string; value?: string }>;
      };
    };

    const headers = detail.payload?.headers || [];
    const toHeader =
      headers.find((h) => String(h.name || '').toLowerCase() === 'to')?.value ||
      '';
    const subjectHeader =
      headers.find((h) => String(h.name || '').toLowerCase() === 'subject')
        ?.value || '';

    if (
      normalizeText(subjectHeader).includes(normalizeText(subject)) &&
      normalizeText(toHeader).includes(normalizeText(expectedRecipient))
    ) {
      return {
        gmail_message_id: detail.id || msg.id,
        to: toHeader,
        subject: subjectHeader,
      };
    }
  }

  return null;
}

async function main() {
  const tag = runTag();
  const assertions: AssertionResult[] = [];

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const prisma = app.get(PrismaService);
    const emailService = app.get(EmailService);
    const quotationsService = app.get(QuotationsService);

    const tenant = await prisma.tenant.findFirst({
      orderBy: { created_at: 'desc' },
    });
    if (!tenant) {
      throw new Error('No tenant found. Seed the database first.');
    }

    const user = await prisma.user.findFirst({
      where: { tenant_id: tenant.id },
      orderBy: { created_at: 'asc' },
    });
    if (!user) {
      throw new Error(`No user found for tenant ${tenant.id}`);
    }

    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        tenant_id: tenant.id,
        is_active: true,
        provider: 'gmail',
      },
      orderBy: { created_at: 'asc' },
    });

    if (!emailAccount) {
      throw new Error(
        'No active Gmail email account found. Connect Gmail before running this test.',
      );
    }

    const products = await prisma.product.findMany({
      where: { tenant_id: tenant.id, status: 'active' },
      orderBy: { created_at: 'asc' },
      take: 2,
      select: {
        id: true,
        name: true,
        unit: true,
        price: true,
      },
    });

    if (products.length < 2) {
      throw new Error('Need at least 2 active products for extraction verification.');
    }

    const buyerEmail = `buyer-${tag}@example.com`;
    const externalId = `${tag}-ext-1`;
    const threadId = `${tag}-thread-1`;

    const qtyA = 3;
    const qtyB = 7;
    const body = [
      'Hello team,',
      'Please share an urgent quotation for these items:',
      `${products[0].name} - ${qtyA} ${products[0].unit || 'pcs'}`,
      `${products[1].name} - ${qtyB} ${products[1].unit || 'pcs'}`,
      'Need delivery in 10 days.',
      'Regards,',
      'QA Buyer',
    ].join('\n');

    await emailService.processInboundEmail(tenant.id, {
      email_account_id: emailAccount.id,
      external_id: externalId,
      thread_id: threadId,
      provider: 'gmail',
      sender_email: buyerEmail,
      sender_name: 'QA Buyer',
      subject: `RFQ automation validation ${tag}`,
      body,
      received_at: new Date().toISOString(),
      raw_payload: {
        source: 'test-autonomous-email-rfq-quotation-e2e',
        tag,
        body_text: body,
      },
    });

    assertions.push({
      name: 'dummy email seeded in DB',
      passed: true,
      details: externalId,
    });

    const processedMessage = await waitFor(
      async () => {
        const message = await prisma.message.findFirst({
          where: { tenant_id: tenant.id, external_id: externalId },
          select: {
            id: true,
            processing_status: true,
            raw_payload: true,
          },
        });

        if (!message) return null;
        if (message.processing_status !== 'parsed') return null;

        const payload =
          message.raw_payload && typeof message.raw_payload === 'object'
            ? (message.raw_payload as Record<string, unknown>)
            : {};

        const autoRfqCreated = Boolean(payload.auto_rfq_created);
        const autoQuotationCreated = Boolean(payload.auto_quotation_created);

        if (!autoRfqCreated || !autoQuotationCreated) {
          return null;
        }

        return message;
      },
      {
        timeoutMs: 150000,
        intervalMs: 3000,
        stepName: 'autonomous message processing and RFQ/quotation creation',
      },
    );

    assertions.push({
      name: 'email auto-processed without manual trigger',
      passed: processedMessage !== null,
      details: processedMessage
        ? `message=${processedMessage.id}`
        : 'message remained pending/failed',
    });

    if (!processedMessage) {
      throw new Error('Autonomous email processing did not complete in time.');
    }

    const payload =
      processedMessage.raw_payload &&
      typeof processedMessage.raw_payload === 'object'
        ? (processedMessage.raw_payload as Record<string, unknown>)
        : {};

    const autoRfqId =
      typeof payload.rfq_id === 'string' && payload.rfq_id.trim().length > 0
        ? payload.rfq_id
        : null;

    const autoQuotationId =
      typeof payload.quotation_id === 'string' &&
      payload.quotation_id.trim().length > 0
        ? payload.quotation_id
        : null;

    const rfq = autoRfqId
      ? await prisma.rFQ.findFirst({
          where: { id: autoRfqId, tenant_id: tenant.id },
          include: { items: true, client: true },
        })
      : null;

    assertions.push({
      name: 'RFQ created from email',
      passed: rfq !== null,
      details: rfq ? `rfq=${rfq.id}` : 'rfq_id missing',
    });

    if (!rfq) {
      throw new Error('RFQ was not created from processed email.');
    }

    const expectedByProduct = new Map<string, number>([
      [normalizeText(products[0].name), qtyA],
      [normalizeText(products[1].name), qtyB],
    ]);

    const extractedPerfect = rfq.items.every((item) => {
      const expectedQty = expectedByProduct.get(normalizeText(item.product_name));
      return expectedQty !== undefined && Number(item.quantity) === expectedQty;
    });

    const extractedCoveragePerfect =
      rfq.items.length >= 2 &&
      Array.from(expectedByProduct.keys()).every((name) =>
        rfq.items.some((item) => normalizeText(item.product_name) === name),
      );

    assertions.push({
      name: 'item extraction is accurate for all expected products/quantities',
      passed: extractedPerfect && extractedCoveragePerfect,
      details: rfq.items
        .map((item) => `${item.product_name}:${item.quantity}`)
        .join(', '),
    });

    const manualQuotation = await quotationsService.create(tenant.id, {
      client_id: rfq.client_id,
      date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      status: 'draft',
      items: rfq.items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price:
          products.find((p) => p.id === item.product_id)?.price || 0,
        tax_percent: 18,
      })),
    });

    assertions.push({
      name: 'manual quotation created',
      passed: Boolean(manualQuotation?.id),
      details: manualQuotation.id,
    });

    const sendResult = await quotationsService.sendByEmail(
      manualQuotation.id,
      tenant.id,
      {
        email_account_id: emailAccount.id,
        to: [buyerEmail],
        message: `Automated production-grade send test ${tag}`,
      },
    );

    assertions.push({
      name: 'manual quotation send queued outbound email',
      passed: Boolean(sendResult?.outbound_email_id),
      details: sendResult.outbound_email_id,
    });

    const outbound = await waitFor(
      async () => {
        const row = await prisma.outboundEmail.findFirst({
          where: {
            id: sendResult.outbound_email_id,
            tenant_id: tenant.id,
          },
          select: {
            id: true,
            status: true,
            attempts: true,
            provider: true,
            last_error: true,
            sent_at: true,
          },
        });

        if (!row) return null;
        if (row.status === 'sent') return row;
        if (row.status === 'failed') return row;
        return null;
      },
      {
        timeoutMs: 210000,
        intervalMs: 5000,
        stepName: 'outbox autonomous send processing',
      },
    );

    assertions.push({
      name: 'outbox processed email automatically',
      passed: outbound !== null,
      details: outbound
        ? `status=${outbound.status}, attempts=${outbound.attempts}, error=${outbound.last_error || ''}`
        : 'outbound remained pending',
    });

    if (!outbound || outbound.status !== 'sent') {
      throw new Error(
        `Outbound email was not sent. status=${outbound?.status || 'missing'} error=${outbound?.last_error || ''}`,
      );
    }

    const refreshedToken = await emailService.refreshEmailAccountAccessToken(
      emailAccount.id,
      tenant.id,
    );

    if (!refreshedToken.access_token || typeof refreshedToken.access_token !== 'string') {
      throw new Error('Unable to refresh Gmail access token for sent-mail verification.');
    }

    const gmailMessage = await gmailFindSentMessage(
      refreshedToken.access_token,
      `Quotation ${manualQuotation.number}`,
      buyerEmail,
    );

    assertions.push({
      name: 'gmail sent logs contain quotation email',
      passed: gmailMessage !== null,
      details: gmailMessage
        ? `gmail_message_id=${gmailMessage.gmail_message_id}`
        : 'No matching message found in Gmail Sent',
    });

    const autoQuotationExists = autoQuotationId
      ? await prisma.quotation.findFirst({
          where: { id: autoQuotationId, tenant_id: tenant.id },
          select: { id: true, number: true, status: true },
        })
      : null;

    assertions.push({
      name: 'auto quotation exists from email-driven RFQ',
      passed: autoQuotationExists !== null,
      details: autoQuotationExists
        ? `${autoQuotationExists.id} (${autoQuotationExists.number})`
        : 'missing',
    });

    console.log('\n=== Autonomous Email -> RFQ -> Quotation E2E Report ===');
    console.log(`tag=${tag}`);
    for (const item of assertions) {
      console.log(
        `${item.passed ? 'PASS' : 'FAIL'} | ${item.name}${
          item.details ? ` | ${item.details}` : ''
        }`,
      );
    }

    const failed = assertions.filter((item) => !item.passed);
    if (failed.length > 0) {
      throw new Error(`Flow validation failed (${failed.length} checks failed).`);
    }

    console.log('\nProduction-readiness checks passed for autonomous flow.');
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error(
    '\nAutonomous E2E flow failed:',
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
