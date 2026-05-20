import 'dotenv/config';
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
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

type TaxProfileDelegate = PrismaClient['taxProfile'];
type InvoiceDelegate = PrismaClient['invoice'];
type PaymentDelegate = PrismaClient['payment'];
type AccountingIntegrationDelegate = PrismaClient['accountingIntegration'];
type AccountingExportDelegate = PrismaClient['accountingExport'];
type IntegrationMappingDelegate = PrismaClient['integrationMapping'];
type AssistanceTicketDelegate = PrismaClient['assistanceTicket'];
type AssistancePurchaseOrderDelegate = PrismaClient['assistancePurchaseOrder'];
type EmailTemplateDelegate = PrismaClient['emailTemplate'];
type ChartOfAccountDelegate = PrismaClient['chartOfAccount'];
type JournalEntryDelegate = PrismaClient['journalEntry'];
type SupplierDelegate = PrismaClient['supplier'];
type PurchaseOrderOutboundDelegate = PrismaClient['purchaseOrderOutbound'];
type PurchaseOrderOutboundItemDelegate = PrismaClient['purchaseOrderOutboundItem'];
type GoodsReceiptNoteDelegate = PrismaClient['goodsReceiptNote'];
type GoodsReceiptNoteItemDelegate = PrismaClient['goodsReceiptNoteItem'];
type StockMovementDelegate = PrismaClient['stockMovement'];
type ExchangeRateDelegate = PrismaClient['exchangeRate'];
type ProcessingSettingsDelegate = PrismaClient['processingSettings'];
type ItemMatchRunDelegate = PrismaClient['itemMatchRun'];
type ItemMatchCandidateDelegate = PrismaClient['itemMatchCandidate'];
type ItemAliasDelegate = PrismaClient['itemAlias'];
type ItemMatchFeedbackDelegate = PrismaClient['itemMatchFeedback'];
type ItemMatchConfigDelegate = PrismaClient['itemMatchConfig'];
type ItemAliasProposalDelegate = PrismaClient['itemAliasProposal'];
type BillDelegate = PrismaClient['bill'];
type SettingDelegate = PrismaClient['setting'];

declare const globalThis: {
  prismaGlobal: PrismaClient;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private prismaClient: PrismaClient = prisma;

  private getClient(): PrismaClient {
    if (!this.prismaClient) {
      this.prismaClient = prismaClientSingleton();
    }

    return this.prismaClient;
  }

  get user() {
    return this.getClient().user;
  }

  get tenant() {
    return this.getClient().tenant;
  }

  get role() {
    return this.getClient().role;
  }

  get product() {
    return this.getClient().product;
  }

  get productCategory() {
    return this.getClient().productCategory;
  }

  get client() {
    return this.getClient().client;
  }

  get rFQ() {
    return this.getClient().rFQ;
  }

  get rFQItem() {
    return this.getClient().rFQItem;
  }

  get quotation() {
    return this.getClient().quotation;
  }

  get quotationItem() {
    return this.getClient().quotationItem;
  }

  get quotationVersion() {
    return this.getClient().quotationVersion;
  }

  get activity() {
    return this.getClient().activity;
  }

  get auditLog() {
    return this.getClient().auditLog;
  }

  get parseRun() {
    return this.getClient().parseRun;
  }

  get file() {
    return this.getClient().file;
  }

  get conversation() {
    return this.getClient().conversation;
  }

  get message() {
    return this.getClient().message;
  }

  get analyticsCache() {
    return this.getClient().analyticsCache;
  }

  get settingsCompany() {
    return this.getClient().settingsCompany;
  }

  get settingsNotifications() {
    return this.getClient().settingsNotifications;
  }

  get processingSettings() {
    return this.getClient().processingSettings as ProcessingSettingsDelegate;
  }

  get itemMatchRun() {
    return this.getClient().itemMatchRun as ItemMatchRunDelegate;
  }

  get itemMatchCandidate() {
    return this.getClient().itemMatchCandidate as ItemMatchCandidateDelegate;
  }

  get itemAlias() {
    return this.getClient().itemAlias as ItemAliasDelegate;
  }

  get itemMatchFeedback() {
    return this.getClient().itemMatchFeedback as ItemMatchFeedbackDelegate;
  }

  get itemMatchConfig() {
    return this.getClient().itemMatchConfig as ItemMatchConfigDelegate;
  }

  get itemAliasProposal() {
    return this.getClient().itemAliasProposal as ItemAliasProposalDelegate;
  }

  get bill() {
    return this.getClient().bill as BillDelegate;
  }

  get settingsTemplate() {
    return this.getClient().settingsTemplate;
  }

  get setting() {
    return this.getClient().setting as SettingDelegate;
  }

  get automationRule() {
    return this.getClient().automationRule;
  }

  get emailAccount() {
    return this.getClient().emailAccount;
  }

  get outboundEmail() {
    return this.getClient().outboundEmail;
  }

  get taxProfile(): TaxProfileDelegate {
    return this.getClient().taxProfile;
  }

  get invoice(): InvoiceDelegate {
    return this.getClient().invoice;
  }

  get payment(): PaymentDelegate {
    return this.getClient().payment;
  }

  get accountingIntegration(): AccountingIntegrationDelegate {
    return this.getClient().accountingIntegration;
  }

  get accountingExport(): AccountingExportDelegate {
    return this.getClient().accountingExport;
  }

  get integrationMapping(): IntegrationMappingDelegate {
    return this.getClient().integrationMapping;
  }

  get assistanceTicket(): AssistanceTicketDelegate {
    return this.getClient().assistanceTicket;
  }

  get assistancePurchaseOrder(): AssistancePurchaseOrderDelegate {
    return this.getClient().assistancePurchaseOrder;
  }

  get emailTemplate(): EmailTemplateDelegate {
    return this.getClient().emailTemplate;
  }

  get chartOfAccount(): ChartOfAccountDelegate {
    return this.getClient().chartOfAccount;
  }

  get journalEntry(): JournalEntryDelegate {
    return this.getClient().journalEntry;
  }

  get supplier(): SupplierDelegate {
    return this.getClient().supplier;
  }

  get purchaseOrderOutbound(): PurchaseOrderOutboundDelegate {
    return this.getClient().purchaseOrderOutbound;
  }

  get purchaseOrderOutboundItem(): PurchaseOrderOutboundItemDelegate {
    return this.getClient().purchaseOrderOutboundItem;
  }

  get goodsReceiptNote(): GoodsReceiptNoteDelegate {
    return this.getClient().goodsReceiptNote;
  }

  get goodsReceiptNoteItem(): GoodsReceiptNoteItemDelegate {
    return this.getClient().goodsReceiptNoteItem;
  }

  get stockMovement(): StockMovementDelegate {
    return this.getClient().stockMovement;
  }

  get exchangeRate(): ExchangeRateDelegate {
    return this.getClient().exchangeRate;
  }

  get db(): PrismaClient {
    return this.getClient();
  }

  async $transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.getClient().$transaction(fn);
  }

  async onModuleInit() {
    await this.getClient().$connect();
    this.logger.log('✅ Prisma connected to database');
  }

  async onModuleDestroy() {
    try {
      await this.getClient().$disconnect();
      this.logger.log('✅ Prisma disconnected from database');
    } catch (err) {
      this.logger.warn(
        `Prisma disconnect error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Ensure the underlying pg Pool is closed to avoid open handles
    try {
      // pool.end() resolves when all clients are disconnected; guard against errors
      // in environments where the pool may already be ended.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (pool && typeof pool.end === 'function') {
        await pool.end();
        this.logger.log('✅ Postgres pool ended');
      }
    } catch (err) {
      this.logger.warn(
        `Postgres pool end error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
