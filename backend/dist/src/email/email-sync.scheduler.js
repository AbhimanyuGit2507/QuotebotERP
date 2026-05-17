"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailSyncScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailSyncScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const email_service_1 = require("./email.service");
const prisma_service_1 = require("../prisma.service");
let EmailSyncScheduler = EmailSyncScheduler_1 = class EmailSyncScheduler {
    emailService;
    prisma;
    logger = new common_1.Logger(EmailSyncScheduler_1.name);
    AUTO_SYNC_ENABLED = process.env.AUTO_EMAIL_SYNC_ENABLED !== 'false';
    constructor(emailService, prisma) {
        this.emailService = emailService;
        this.prisma = prisma;
        if (this.AUTO_SYNC_ENABLED) {
            this.logger.log('✓ Automatic email sync enabled (every 10 seconds)');
        }
        else {
            this.logger.warn('✗ Automatic email sync disabled via AUTO_EMAIL_SYNC_ENABLED=false');
        }
    }
    async handleEmailSync() {
        if (!this.AUTO_SYNC_ENABLED) {
            return;
        }
        try {
            const tenants = await this.prisma.emailAccount.findMany({
                where: {
                    is_active: true,
                },
                select: {
                    tenant_id: true,
                },
                distinct: ['tenant_id'],
            });
            if (tenants.length === 0) {
                return;
            }
            for (const { tenant_id } of tenants) {
                try {
                    const currentStatus = this.emailService.getGmailSyncStatus(tenant_id);
                    if (currentStatus.status === 'running') {
                        this.logger.debug(`Skipping sync for tenant ${tenant_id} - already running`);
                        continue;
                    }
                    const result = this.emailService.triggerImmediateGmailSync(tenant_id);
                    if (result.started) {
                        this.logger.log(`📧 Email sync started for tenant: ${tenant_id}`);
                    }
                }
                catch (error) {
                    this.logger.error(`Failed to sync emails for tenant ${tenant_id}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
        catch (error) {
            this.logger.error(`Email sync scheduler error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};
exports.EmailSyncScheduler = EmailSyncScheduler;
__decorate([
    (0, schedule_1.Cron)('*/10 * * * * *', {
        name: 'auto-email-sync',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailSyncScheduler.prototype, "handleEmailSync", null);
exports.EmailSyncScheduler = EmailSyncScheduler = EmailSyncScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [email_service_1.EmailService,
        prisma_service_1.PrismaService])
], EmailSyncScheduler);
//# sourceMappingURL=email-sync.scheduler.js.map