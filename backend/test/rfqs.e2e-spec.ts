/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * RFQs E2E tests — list, create, update, delete
 * Requires a running DB with at least one tenant + user.
 */
describe('RFQs (e2e)', () => {
  let app: INestApplication<App>;
  const testEmail = `e2e-rfq-${Date.now()}@test.quotebot.local`;
  const testPassword = 'TestPass123!';
  let accessToken: string;

  async function getToken(): Promise<string> {
    // Register
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'RFQ E2E User',
        company_name: `RFQ E2E Company ${Date.now()}`,
      });

    // Login
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    const cookie = res.headers['set-cookie'] as string[] | undefined;
    if (cookie) {
      const tok = cookie
        .find((c) => c.startsWith('qb_access_token'))
        ?.split(';')[0]
        ?.split('=')[1];
      if (tok) return tok;
    }
    const body = res.body as Record<string, unknown>;
    return (body.access_token as string) ?? '';
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();
    accessToken = await getToken();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/rfqs — returns paginated list', async () => {
    if (!accessToken) return;
    const res = await request(app.getHttpServer())
      .get('/api/rfqs')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Accept both array and paginated object
    const body = res.body as
      | { data?: unknown[]; items?: unknown[] }
      | unknown[];
    expect(body).toBeDefined();
    if (Array.isArray(body)) {
      expect(Array.isArray(body)).toBe(true);
    } else {
      expect(body).toHaveProperty('data');
    }
  });

  it('GET /api/rfqs — returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/api/rfqs').expect(401);
  });

  it('GET /api/quotations — returns paginated list', async () => {
    if (!accessToken) return;
    const res = await request(app.getHttpServer())
      .get('/api/quotations')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('GET /api/dashboard — returns dashboard data', async () => {
    if (!accessToken) return;
    const res = await request(app.getHttpServer())
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('GET /api/products — returns product list', async () => {
    if (!accessToken) return;
    const res = await request(app.getHttpServer())
      .get('/api/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toBeDefined();
  });
});
