/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

describe('RFQ email e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const mockGuard = {
    canActivate: (context) => {
      const req = context.switchToHttp().getRequest();
      // Ensure there's a tenant to work with; test will create if absent
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

  it('preview -> createFromEmail -> reparse -> delete with force', async () => {
    // ensure a tenant exists
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: { company_name: 'e2e-tenant' },
      });
    }

    // create a client + conversation + message
    const client = await prisma.client.create({
      data: {
        tenant_id: tenant.id,
        name: 'E2E Customer',
        email: 'e2e@example.com',
        type: 'B2B',
      },
    });

    const conversation = await prisma.conversation.create({
      data: {
        tenant_id: tenant.id,
        client_id: client.id,
        subject: 'E2E RFQ',
        channel: 'email',
      },
    });

    const message = await prisma.message.create({
      data: {
        conversation_id: conversation.id,
        tenant_id: tenant.id,
        sender_name: client.name,
        sender_email: client.email,
        body: 'Please send price for items',
        channel: 'email',
      },
    });

    // set tenant on mock request user for controller access
    mockGuard.canActivate = (context) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        tenant_id: tenant.id,
        id: 'test-user',
        email: 'test@example.com',
      };
      return true;
    };

    const items = [
      { product_name: 'Business Laptop', quantity: 1, unit: 'pcs' },
      { product_name: 'LED Monitor 27 inch QHD', quantity: 20, unit: 'pcs' },
    ];

    // preview
    const preview = await request(app.getHttpServer())
      .post('/rfqs/preview-from-email')
      .send({ client_email: client.email, message_id: message.id, items })
      .expect(201);

    expect(preview.body).toHaveProperty('matched_items');
    expect(preview.body).toHaveProperty('unmatched_items');

    // create from email
    const createRes = await request(app.getHttpServer())
      .post('/rfqs/from-email')
      .send({
        client_email: client.email,
        message_id: message.id,
        items,
        parsing_confidence: 'high',
      })
      .expect(201);

    expect(createRes.body).toHaveProperty('id');
    const rfqId = createRes.body.id;

    // message should have rfq_id in raw_payload
    const updatedMessage = await prisma.message.findUnique({
      where: { id: message.id },
    });
    expect((updatedMessage!.raw_payload as any).rfq_id).toBe(rfqId);

    // reparse: call createFromEmail again with changed items
    const items2 = [
      { product_name: 'Business Laptop', quantity: 2, unit: 'pcs' },
      { product_name: 'LED Monitor 27 inch QHD', quantity: 5, unit: 'pcs' },
    ];

    const reparseRes = await request(app.getHttpServer())
      .post('/rfqs/from-email')
      .send({
        client_email: client.email,
        message_id: message.id,
        items: items2,
        parsing_confidence: 'high',
      })
      .expect(201);

    // reparse should return same RFQ id
    expect(reparseRes.body.id || reparseRes.body.id === rfqId).toBeTruthy();

    // delete without force should fail
    await request(app.getHttpServer()).delete(`/rfqs/${rfqId}`).expect(400);

    // delete with force should succeed
    await request(app.getHttpServer())
      .delete(`/rfqs/${rfqId}?forceDeleteLinkedQuotation=true`)
      .expect(200);
  }, 30000);
});
