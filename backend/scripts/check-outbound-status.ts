/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const prisma = app.get(PrismaService);
    const rows = await prisma.outboundEmail.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        attempts: true,
        provider: true,
        last_error: true,
        to: true,
        subject: true,
        created_at: true,
        sent_at: true,
        updated_at: true,
      },
    });

    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
