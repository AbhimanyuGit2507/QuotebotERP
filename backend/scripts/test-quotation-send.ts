/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { QuotationsService } from '../src/quotations/quotations.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const prisma = app.get(PrismaService);
    const quotationsService = app.get(QuotationsService);

    const tenant = await prisma.tenant.findFirst({
      orderBy: { created_at: 'desc' },
    });

    if (!tenant) {
      throw new Error('No tenant found. Run backend seed first.');
    }

    const emailAccount = await prisma.emailAccount.findFirst({
      where: { tenant_id: tenant.id, is_active: true },
      select: { id: true },
    });

    if (!emailAccount) {
      console.log('No active email account connected for this tenant.');
      console.log('Quotation send logic requires an active email account.');
      return;
    }

    let quotation = await prisma.quotation.findFirst({
      where: { tenant_id: tenant.id },
      include: { client: true, items: true },
      orderBy: { created_at: 'desc' },
    });

    if (!quotation) {
      const client = await prisma.client.findFirst({
        where: { tenant_id: tenant.id },
        orderBy: { created_at: 'asc' },
      });
      const product = await prisma.product.findFirst({
        where: { tenant_id: tenant.id, status: 'active' },
        orderBy: { created_at: 'asc' },
      });

      if (!client || !product) {
        throw new Error('Need at least one client and active product to create a quotation.');
      }

      quotation = await quotationsService.create(tenant.id, {
        client_id: client.id,
        date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'draft',
        items: [
          {
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            unit: product.unit,
            unit_price: product.price,
            tax_percent: product.gst_percent || 18,
          },
        ],
      });
    }

    const result = await quotationsService.sendByEmail(quotation.id, tenant.id, {
      email_account_id: emailAccount.id,
    });

    console.log('Quotation send result:');
    console.log(result);
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error('Quotation send test failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
