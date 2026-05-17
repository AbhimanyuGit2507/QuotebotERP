import 'dotenv/config';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter });
};

type InvoiceDelegate = PrismaClient['invoice'];
type PaymentDelegate = PrismaClient['payment'];
type AccountingIntegrationDelegate = PrismaClient['accountingIntegration'];
type AccountingExportDelegate = PrismaClient['accountingExport'];
type IntegrationMappingDelegate = PrismaClient['integrationMapping'];
type AssistanceTicketDelegate = PrismaClient['assistanceTicket'];
type AssistancePurchaseOrderDelegate = PrismaClient['assistancePurchaseOrder'];
type EmailTemplateDelegate = PrismaClient['emailTemplate'];

declare const globalThis: {
  prismaGlobal: PrismaClient;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prismaClient: PrismaClient = prisma;

  get user() {
    return this.prismaClient.user;
  }

  get tenant() {
    return this.prismaClient.tenant;
  }

  get role() {
    return this.prismaClient.role;
  }

  get product() {
    return this.prismaClient.product;
  }

  get productCategory() {
    return this.prismaClient.productCategory;
  }

  get client() {
    return this.prismaClient.client;
  }

  get rFQ() {
    return this.prismaClient.rFQ;
  }

  get rFQItem() {
    return this.prismaClient.rFQItem;
  }

  get quotation() {
    return this.prismaClient.quotation;
  }

  get quotationItem() {
    return this.prismaClient.quotationItem;
  }

  get quotationVersion() {
    return this.prismaClient.quotationVersion;
  }

  get activity() {
    return this.prismaClient.activity;
  }

  get auditLog() {
    return this.prismaClient.auditLog;
  }

  get parseRun() {
    return this.prismaClient.parseRun;
  }

  get file() {
    return this.prismaClient.file;
  }

  get conversation() {
    return this.prismaClient.conversation;
  }

  get message() {
    return this.prismaClient.message;
  }

  get analyticsCache() {
    return this.prismaClient.analyticsCache;
  }

  get settingsCompany() {
    return this.prismaClient.settingsCompany;
  }

  get settingsNotifications() {
    return this.prismaClient.settingsNotifications;
  }

  get settingsTemplate() {
    return this.prismaClient.settingsTemplate;
  }

  get automationRule() {
    return this.prismaClient.automationRule;
  }

  get emailAccount() {
    return this.prismaClient.emailAccount;
  }

  get outboundEmail() {
    return this.prismaClient.outboundEmail;
  }

  get invoice(): InvoiceDelegate {
    return this.prismaClient.invoice;
  }

  get payment(): PaymentDelegate {
    return this.prismaClient.payment;
  }

  get accountingIntegration(): AccountingIntegrationDelegate {
    return this.prismaClient.accountingIntegration;
  }

  get accountingExport(): AccountingExportDelegate {
    return this.prismaClient.accountingExport;
  }

  get integrationMapping(): IntegrationMappingDelegate {
    return this.prismaClient.integrationMapping;
  }

  get assistanceTicket(): AssistanceTicketDelegate {
    return this.prismaClient.assistanceTicket;
  }

  get assistancePurchaseOrder(): AssistancePurchaseOrderDelegate {
    return this.prismaClient.assistancePurchaseOrder;
  }

  get emailTemplate(): EmailTemplateDelegate {
    return this.prismaClient.emailTemplate;
  }

  get db(): PrismaClient {
    return this.prismaClient;
  }

  async $transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prismaClient.$transaction(fn);
  }

  async onModuleInit() {
    await this.prismaClient.$connect();
    console.log('✅ Prisma connected to database');
  }

  async onModuleDestroy() {
    try {
      await this.prismaClient.$disconnect();
      console.log('✅ Prisma disconnected from database');
    } catch (err) {
      console.warn('Prisma disconnect error:', err);
    }

    // Ensure the underlying pg Pool is closed to avoid open handles
    try {
      // pool.end() resolves when all clients are disconnected; guard against errors
      // in environments where the pool may already be ended.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (pool && typeof pool.end === 'function') {
        await pool.end();
        console.log('✅ Postgres pool ended');
      }
    } catch (err) {
      console.warn('Postgres pool end error:', err);
    }
  }
}
