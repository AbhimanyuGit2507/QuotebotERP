import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  // Support full HTML email payloads from Gmail sync.
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  const allowedOrigins = (
    process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Enable CORS
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean | string) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin ?? true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Internal-Key',
      'X-Tenant-ID',
      'X-Requested-With',
    ],
  });

  // Set global API prefix
  app.setGlobalPrefix(process.env.API_PREFIX || 'api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const formattedErrors = errors.reduce((acc, err) => {
          if (err.constraints) {
            acc[err.property] = Object.values(err.constraints).join(', ');
          }
          return acc;
        }, {});
        return new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: formattedErrors,
        });
      },
    }),
  );

  const port = process.env.PORT || process.env.API_PORT || 3001;
  await app.listen(port);

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`✅ Quotebot Backend API running on port ${port}`);
  console.log(`📍 API Prefix: /${process.env.API_PREFIX || 'api'}`);
  console.log(`🔗 Base URL: http://localhost:${port}/api`);
  console.log('═══════════════════════════════════════════════════\n');
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
