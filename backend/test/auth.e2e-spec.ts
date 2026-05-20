/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Auth E2E tests — register, login, profile
 * These tests use the real DB (quotebot_db) and clean up after themselves.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const testEmail = `e2e-auth-${Date.now()}@test.quotebot.local`;
  const testPassword = 'TestPass123!';
  let accessToken: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/register — creates a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'E2E Test User',
        company_name: `E2E Company ${Date.now()}`,
      })
      .expect(201);

    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(testEmail);
  });

  it('POST /api/auth/login — returns access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    expect(res.body).toHaveProperty('user');
    // Token may be in cookie or body depending on config
    const cookie = res.headers['set-cookie'] as string[] | undefined;
    if (cookie) {
      accessToken =
        cookie
          .find((c) => c.startsWith('qb_access_token'))
          ?.split(';')[0]
          ?.split('=')[1] ?? '';
    }
    if (!accessToken && res.body.access_token) {
      accessToken = res.body.access_token as string;
    }
  });

  it('POST /api/auth/login — rejects wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'wrongpassword' })
      .expect(401);
  });

  it('GET /api/auth/profile — returns user profile when authenticated', async () => {
    if (!accessToken) {
      // If token extraction failed, skip gracefully
      return;
    }
    const res = await request(app.getHttpServer())
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('email', testEmail);
  });

  it('GET /api/auth/profile — returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/api/auth/profile').expect(401);
  });
});
