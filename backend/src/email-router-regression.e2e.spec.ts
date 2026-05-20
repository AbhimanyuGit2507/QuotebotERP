/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './prisma.service';
import { EmailRfqService } from './email-rfq/email-rfq.service';
import { ThreadResolverService } from './email-rfq/thread-resolver.service';
import { PoMatcherService } from './email-rfq/po-matcher.service';
import { RfqsService } from './rfqs/rfqs.service';
import { QuotationsService } from './quotations/quotations.service';
import { EmailService } from './email/email.service';
import { EmailTemplatesService } from './email-templates/email-templates.service';
import { EmailClassifierService } from './email-classifier/email-classifier.service';
import { BillsService } from './bills/bills.service';
import { MessageClassification } from '@prisma/client';

describe('Email router regression e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let emailRfqService: EmailRfqService;
  let threadResolverService: ThreadResolverService;
  let poMatcherService: PoMatcherService;
  let rfqsService: RfqsService;
  let quotationsService: QuotationsService;
  let emailService: EmailService;
  let emailTemplatesService: EmailTemplatesService;
  let emailClassifierService: EmailClassifierService;
  let billsService: BillsService;
  const previousPipelineEnabled = process.env.BACKEND_RFQ_PIPELINE_ENABLED;

  beforeAll(async () => {
    process.env.BACKEND_RFQ_PIPELINE_ENABLED = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    emailRfqService = app.get(EmailRfqService);
    threadResolverService = app.get(ThreadResolverService);
    poMatcherService = app.get(PoMatcherService);
    rfqsService = app.get(RfqsService);
    quotationsService = app.get(QuotationsService);
    emailService = app.get(EmailService);
    emailTemplatesService = app.get(EmailTemplatesService);
    emailClassifierService = app.get(EmailClassifierService);
    billsService = app.get(BillsService);

    (emailRfqService as any).prisma = prisma;
    (emailRfqService as any).rfqsService = rfqsService;
    (emailRfqService as any).quotationsService = quotationsService;
    (emailRfqService as any).threadResolver = threadResolverService;
    (emailRfqService as any).poMatcher = poMatcherService;
    (emailRfqService as any).emailService = emailService;
    (emailRfqService as any).emailTemplatesService = emailTemplatesService;
    (emailRfqService as any).emailClassifier = emailClassifierService;
    (emailRfqService as any).billsService = billsService;
  });

  afterAll(async () => {
    if (previousPipelineEnabled === undefined) {
      delete process.env.BACKEND_RFQ_PIPELINE_ENABLED;
    } else {
      process.env.BACKEND_RFQ_PIPELINE_ENABLED = previousPipelineEnabled;
    }

    await app.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('routes RFQ, PO, and BILL messages end-to-end and persists canonical routes', async () => {
    const tag = `router-e2e-${Date.now()}`;

    const tenant = await prisma.tenant.create({
      data: {
        company_name: `Router Test ${tag}`,
      },
    });

    try {
      const client = await prisma.client.create({
        data: {
          tenant_id: tenant.id,
          name: 'Router Test Client',
          email: `buyer-${tag}@example.com`,
          type: 'B2B',
        },
      });

      const category = await prisma.productCategory.create({
        data: {
          tenant_id: tenant.id,
          name: `Router Category ${tag}`,
        },
      });

      const rfqProductA = await prisma.product.create({
        data: {
          tenant_id: tenant.id,
          sku: `${tag}-sku-1`,
          name: `Router RFQ Item A ${tag}`,
          category_id: category.id,
          unit: 'pcs',
          price: 100,
          cost: 70,
          stock: 0,
          reorder_level: 0,
          status: 'active',
        },
      });

      const rfqProductB = await prisma.product.create({
        data: {
          tenant_id: tenant.id,
          sku: `${tag}-sku-2`,
          name: `Router RFQ Item B ${tag}`,
          category_id: category.id,
          unit: 'pcs',
          price: 200,
          cost: 120,
          stock: 0,
          reorder_level: 0,
          status: 'active',
        },
      });

      const rfqConversation = await prisma.conversation.create({
        data: {
          tenant_id: tenant.id,
          client_id: client.id,
          subject: `RFQ request ${tag}`,
          channel: 'email',
          customer_email: client.email,
          customer_name: client.name,
        },
      });

      const poConversation = await prisma.conversation.create({
        data: {
          tenant_id: tenant.id,
          client_id: client.id,
          subject: `Purchase order ${tag}`,
          channel: 'email',
          customer_email: client.email,
          customer_name: client.name,
        },
      });

      const billConversation = await prisma.conversation.create({
        data: {
          tenant_id: tenant.id,
          client_id: client.id,
          subject: `Invoice INV/${tag}`,
          channel: 'email',
          customer_email: client.email,
          customer_name: client.name,
        },
      });

      const rfqMessage = await prisma.message.create({
        data: {
          conversation_id: rfqConversation.id,
          tenant_id: tenant.id,
          sender_name: 'RFQ Buyer',
          sender_email: client.email,
          body: [
            'Please send a quotation for the following items:',
            `${rfqProductA.name} - 4 pcs`,
            `${rfqProductB.name} - 2 pcs`,
          ].join('\n'),
          channel: 'email',
          direction: 'inbound',
          processing_status: 'pending',
          external_id: `${tag}-rfq`,
          provider: 'gmail',
          raw_payload: {
            body_text: [
              'Please send a quotation for the following items:',
              `${rfqProductA.name} - 4 pcs`,
              `${rfqProductB.name} - 2 pcs`,
            ].join('\n'),
            source: 'email-router-regression',
          },
        },
      });

      const poMessage = await prisma.message.create({
        data: {
          conversation_id: poConversation.id,
          tenant_id: tenant.id,
          sender_name: 'PO Buyer',
          sender_email: client.email,
          body: 'Please find attached purchase order PO-9001 for your records.',
          channel: 'email',
          direction: 'inbound',
          processing_status: 'pending',
          external_id: `${tag}-po`,
          provider: 'gmail',
          raw_payload: {
            body_text:
              'Please find attached purchase order PO-9001 for your records.',
            source: 'email-router-regression',
          },
        },
      });

      const billMessage = await prisma.message.create({
        data: {
          conversation_id: billConversation.id,
          tenant_id: tenant.id,
          sender_name: 'Billing Desk',
          sender_email: 'billing@vendor.com',
          body: 'Invoice INV/2026-1234 total amount due 1234.56 due date 2026-06-01',
          channel: 'email',
          direction: 'inbound',
          processing_status: 'pending',
          external_id: `${tag}-bill`,
          provider: 'gmail',
          raw_payload: {
            body_text:
              'Invoice INV/2026-1234 total amount due 1234.56 due date 2026-06-01',
            source: 'email-router-regression',
          },
        },
      });

      jest
        .spyOn(threadResolverService, 'resolveConversation')
        .mockImplementation((message: { conversation_id?: string }) => ({
          conversationId: message.conversation_id,
          matchedBy: 'test',
          reason: 'stubbed',
        }));

      jest
        .spyOn(emailRfqService as any, 'classifyPrimaryIntent')
        .mockImplementation((subject: string, body: string) => {
          const text = `${subject}\n${body}`.toLowerCase();
          if (text.includes('invoice') || text.includes('billing')) {
            return {
              route: 'bill',
              classification: MessageClassification.UNKNOWN,
              confidence: 0.93,
              reason: 'invoice detected',
              billDetection: {
                invoiceNumber: 'INV/2026-1234',
                amount: 1234.56,
                currency: 'USD',
                confidence: 0.93,
              },
            };
          }

          if (text.includes('purchase order') || text.includes('po-9001')) {
            return {
              route: 'po',
              classification: MessageClassification.PO,
              confidence: 0.96,
              reason: 'purchase order detected',
            };
          }

          return {
            route: 'rfq',
            classification: MessageClassification.RFQ,
            confidence: 0.92,
            reason: 'rfq detected',
          };
        });

      jest
        .spyOn(emailRfqService as any, 'classifyRfqByRegex')
        .mockImplementation((subject: string, body: string) => {
          const text = `${subject}\n${body}`.toLowerCase();
          if (text.includes('quotation')) {
            return {
              verdict: 'rfq',
              reason: 'mocked rfq intent',
              confidence: 'high',
            };
          }

          return {
            verdict: 'uncertain',
            reason: 'mocked uncertain',
            confidence: 'low',
          };
        });

      jest
        .spyOn(emailRfqService as any, 'callLlmExtraction')
        .mockResolvedValue({
          is_rfq: true,
          confidence: 'high',
          reason: 'mocked extraction',
          items: [
            { product_name: rfqProductA.name, quantity: 4, unit: 'pcs' },
            { product_name: rfqProductB.name, quantity: 2, unit: 'pcs' },
          ],
        });

      jest.spyOn(poMatcherService, 'scorePurchaseOrder').mockResolvedValue({
        percent: 97,
        components: {
          thread_match: 1,
          quote_number_match: 1,
          customer_match: 1,
        },
      });

      jest.spyOn(rfqsService, 'previewFromEmail').mockResolvedValue({
        matched_items: [
          { product_name: rfqProductA.name, quantity: 4, unit: 'pcs' },
          { product_name: rfqProductB.name, quantity: 2, unit: 'pcs' },
        ],
        unmatched_items: [],
        summary: 'mocked preview match',
      } as any);

      jest
        .spyOn(rfqsService, 'createFromEmail')
        .mockImplementation(async (tenantId: string, params: any) => {
          const created = await prisma.rFQ.create({
            data: {
              tenant_id: tenantId,
              number: `RFQ-${tag}`,
              client_id: client.id,
              channel: 'email',
              conversation_id: rfqConversation.id,
              confidence_score: 92,
              status: 'pending',
              display_name: `RFQ-${tag}`,
              search_tokens: [tag, 'rfq'] as any,
            },
          });

          await prisma.message.update({
            where: { id: params.message_id },
            data: {
              raw_payload: {
                ...(params.raw_payload || {}),
                rfq_id: created.id,
                parsed_items: params.items || [],
              },
            },
          });

          return created;
        });

      jest
        .spyOn(billsService, 'createBillIfThreshold')
        .mockImplementation(async (params: any) => {
          const billId = `bill-${tag}`;

          await prisma.message.update({
            where: { id: params.messageId },
            data: {
              raw_payload: {
                ...(params.extract || {}),
                bill_id: billId,
              },
            },
          });

          return { id: billId } as unknown as never;
        });

      const summary = await emailRfqService.processPendingMessages({
        tenantId: tenant.id,
        limit: 20,
      });

      expect(summary.started).toBe(true);

      const persistedRfq = await (prisma as any).rFQ.findFirst({
        where: {
          tenant_id: tenant.id,
          conversation_id: rfqConversation.id,
        },
      });

      const persistedPo = await prisma.assistancePurchaseOrder.findFirst({
        where: {
          tenant_id: tenant.id,
          conversation_id: poConversation.id,
        },
      });

      const rfqProcessed = await prisma.message.findUnique({
        where: { id: rfqMessage.id },
      });
      const poProcessed = await prisma.message.findUnique({
        where: { id: poMessage.id },
      });
      const billProcessed = await prisma.message.findUnique({
        where: { id: billMessage.id },
      });

      expect(persistedRfq).not.toBeNull();
      expect(persistedPo).not.toBeNull();

      expect((rfqProcessed?.raw_payload as any)?.canonical_route).toBe('rfq');
      expect((poProcessed?.raw_payload as any)?.canonical_route).toBe('po');
      expect((billProcessed?.raw_payload as any)?.canonical_route).toBe('bill');

      expect(rfqProcessed?.classification).toBe(MessageClassification.RFQ);
      expect(poProcessed?.classification).toBe(MessageClassification.PO);
      expect(billProcessed?.classification).toBe(MessageClassification.UNKNOWN);

      expect((persistedPo as any).confidence).toBeGreaterThanOrEqual(70);
      expect((rfqProcessed?.raw_payload as any)?.rfq_id).toBeTruthy();
      expect((billProcessed?.raw_payload as any)?.canonical_route).toBe('bill');
      expect(billProcessed?.processing_status).toBe('parsed');
      expect((rfqProcessed?.raw_payload as any)?.parsed_items?.length).toBe(2);
    } finally {
      await prisma.tenant.delete({ where: { id: tenant.id } });
    }
  }, 45000);
});
