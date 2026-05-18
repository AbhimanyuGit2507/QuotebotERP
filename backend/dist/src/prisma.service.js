"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
require("dotenv/config");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prismaClientSingleton = () => {
    return new client_1.PrismaClient({ adapter });
};
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();
if (process.env.NODE_ENV !== 'production')
    globalThis.prismaGlobal = prisma;
let PrismaService = PrismaService_1 = class PrismaService {
    logger = new common_1.Logger(PrismaService_1.name);
    prismaClient = prisma;
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
    get invoice() {
        return this.prismaClient.invoice;
    }
    get payment() {
        return this.prismaClient.payment;
    }
    get accountingIntegration() {
        return this.prismaClient.accountingIntegration;
    }
    get accountingExport() {
        return this.prismaClient.accountingExport;
    }
    get integrationMapping() {
        return this.prismaClient.integrationMapping;
    }
    get assistanceTicket() {
        return this.prismaClient.assistanceTicket;
    }
    get assistancePurchaseOrder() {
        return this.prismaClient.assistancePurchaseOrder;
    }
    get emailTemplate() {
        return this.prismaClient.emailTemplate;
    }
    get db() {
        return this.prismaClient;
    }
    async $transaction(fn) {
        return this.prismaClient.$transaction(fn);
    }
    async onModuleInit() {
        await this.prismaClient.$connect();
        this.logger.log('✅ Prisma connected to database');
    }
    async onModuleDestroy() {
        try {
            await this.prismaClient.$disconnect();
            this.logger.log('✅ Prisma disconnected from database');
        }
        catch (err) {
            this.logger.warn(`Prisma disconnect error: ${err instanceof Error ? err.message : String(err)}`);
        }
        try {
            if (pool && typeof pool.end === 'function') {
                await pool.end();
                this.logger.log('✅ Postgres pool ended');
            }
        }
        catch (err) {
            this.logger.warn(`Postgres pool end error: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)()
], PrismaService);
//# sourceMappingURL=prisma.service.js.map