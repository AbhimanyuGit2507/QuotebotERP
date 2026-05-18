/* eslint-disable no-console */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const formatShortDate = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

const buildDisplayAndTokens = (prefix, dateValue, clientName, itemNames) => {
  const date = formatShortDate(dateValue || new Date());
  const clientShort = (clientName || '')
    .split(/\s+/)
    .slice(0, 3)
    .join(' ')
    .slice(0, 30) || 'Unknown Client';
  const items = (itemNames || [])
    .slice(0, 5)
    .map((name) => String(name || '').trim())
    .filter(Boolean);
  const display = `${prefix} - ${date} - ${clientShort}${items.length ? ' - ' + items.join(', ') : ''}`;
  const tokens = [date, clientShort, ...items].filter(Boolean);
  return { display, tokens };
};

async function backfillQuotations() {
  const quotations = await prisma.quotation.findMany({
    where: { deleted_at: null },
    include: { client: true, items: true },
  });

  let updated = 0;
  for (const quotation of quotations) {
    const itemNames = quotation.items.map((item) => item.product_name || '');
    const { display, tokens } = buildDisplayAndTokens(
      'QT',
      quotation.date || quotation.created_at,
      quotation.client?.name,
      itemNames,
    );

    await prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        display_name: display,
        search_tokens: tokens,
      },
    });
    updated += 1;
  }

  console.log(`Quotations updated: ${updated}`);
}

async function backfillRfqs() {
  const rfqs = await prisma.rFQ.findMany({
    where: { deleted_at: null },
    include: { client: true, items: true },
  });

  let updated = 0;
  for (const rfq of rfqs) {
    const itemNames = rfq.items.map((item) => item.product_name || '');
    const { display, tokens } = buildDisplayAndTokens(
      'RFQ',
      rfq.created_at,
      rfq.client?.name,
      itemNames,
    );

    await prisma.rFQ.update({
      where: { id: rfq.id },
      data: {
        display_name: display,
        search_tokens: tokens,
      },
    });
    updated += 1;
  }

  console.log(`RFQs updated: ${updated}`);
}

async function backfillOrders() {
  const orders = await prisma.assistancePurchaseOrder.findMany({
    include: {
      conversation: {
        include: {
          client: true,
        },
      },
      quotation: {
        include: {
          items: true,
        },
      },
    },
  });

  let updated = 0;
  for (const order of orders) {
    const itemNames = (order.quotation?.items || []).map((item) => item.product_name || '');
    const clientName = order.conversation?.client?.name || '';
    const { display, tokens } = buildDisplayAndTokens(
      'ORD',
      order.created_at,
      clientName,
      itemNames,
    );

    await prisma.assistancePurchaseOrder.update({
      where: { id: order.id },
      data: {
        display_name: display,
        search_tokens: tokens,
      },
    });
    updated += 1;
  }

  console.log(`Orders updated: ${updated}`);
}

async function backfillInvoices() {
  const invoices = await prisma.invoice.findMany({
    where: { deleted_at: null },
    include: { quotation: { include: { client: true, items: true } } },
  });

  let updated = 0;
  for (const invoice of invoices) {
    const clientName = invoice.quotation?.client?.name || '';
    const itemNames = (invoice.quotation?.items || []).map((item) => item.product_name || '');
    const { display, tokens } = buildDisplayAndTokens(
      'INV',
      invoice.date || invoice.created_at,
      clientName,
      itemNames,
    );

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        display_name: display,
        search_tokens: tokens,
      },
    });
    updated += 1;
  }

  console.log(`Invoices updated: ${updated}`);
}

async function main() {
  console.log('Backfilling display_name/search_tokens...');
  await backfillQuotations();
  await backfillRfqs();
  await backfillInvoices();
  await backfillOrders();
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
