/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import request from 'supertest';
import { PrismaService } from '../src/prisma.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

describe('Bills classifier & PO safety', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const mockGuard = {
    canActivate: (context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { tenant_id: '', id: 'test-user', email: 'test@example.com' };
      return true;
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not create assistancePurchaseOrder for GitHub notification (false positive)', async () => {
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await prisma.tenant.create({ data: { company_name: 'test-tenant' } });
    }

    const client = await prisma.client.create({
      data: { tenant_id: tenant.id, name: 'GH User', email: 'notifications@github.com', type: 'B2B' },
    });

    const conversation = await prisma.conversation.create({
      data: { tenant_id: tenant.id, client_id: client.id, subject: 'ORD - Tim Abbott', channel: 'email' },
    });

    const message = await prisma.message.create({
      data: {
        conversation_id: conversation.id,
        tenant_id: tenant.id,
        sender_name: 'Tim Abbott',
        sender_email: 'notifications@github.com',
        body: 'CI run succeeded... purchase order mentioned in text but not an actual PO',
        channel: 'email',
      },
    });

    // ensure mock guard returns tenant
    mockGuard.canActivate = (context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { tenant_id: tenant.id, id: 'test-user', email: 'test@example.com' };
      return true;
    };

    // Trigger processing
    const svc = app.get('EmailRfqService');
    await svc.processPendingMessages({ tenantId: tenant.id, limit: 10 });

    const pos = await prisma.assistancePurchaseOrder.findMany({ where: { tenant_id: tenant.id, conversation_id: conversation.id } });
    expect(pos.length).toBe(0);
  }, 30000);

  it('detects and persists a bill for an invoice-like email', async () => {
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await prisma.tenant.create({ data: { company_name: 'test-tenant-2' } });
    }

    const client = await prisma.client.create({
      data: { tenant_id: tenant.id, name: 'Vendor', email: 'billing@vendor.com', type: 'B2B' },
    });

    const conversation = await prisma.conversation.create({
      data: { tenant_id: tenant.id, client_id: client.id, subject: 'Invoice INV/2026-1234', channel: 'email' },
    });

    const message = await prisma.message.create({
      data: {
        conversation_id: conversation.id,
        tenant_id: tenant.id,
        sender_name: 'Vendor Billing',
        sender_email: 'billing@vendor.com',
        body: 'Invoice INV/2026-1234\nTotal amount due: $1,234.56\nDue date: 2026-06-01',
        channel: 'email',
      },
    });

    mockGuard.canActivate = (context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { tenant_id: tenant.id, id: 'test-user', email: 'test@example.com' };
      return true;
    };

    const svc = app.get('EmailRfqService');
    await svc.processPendingMessages({ tenantId: tenant.id, limit: 10 });

    const bill = await prisma.bill.findFirst({ where: { tenant_id: tenant.id, message_id: message.id } });
    expect(bill).not.toBeNull();
    expect(Number(bill!.confidence)).toBeGreaterThanOrEqual(0.6);
    expect(bill!.invoice_number).toBeTruthy();
  }, 30000);
});
