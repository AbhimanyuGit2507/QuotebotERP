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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let SettingsService = class SettingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCompany(tenantId) {
        return this.prisma.settingsCompany.upsert({
            where: { tenant_id: tenantId },
            update: {},
            create: { tenant_id: tenantId },
        });
    }
    async updateCompany(tenantId, body) {
        const updateData = {};
        if (body.currency !== undefined)
            updateData.currency = body.currency;
        if (body.logo_url !== undefined)
            updateData.logo_url = body.logo_url ?? null;
        if (body.profile_json !== undefined)
            updateData.profile_json = body.profile_json;
        return this.prisma.settingsCompany.upsert({
            where: { tenant_id: tenantId },
            update: updateData,
            create: {
                tenant_id: tenantId,
                currency: body.currency ?? 'INR',
                logo_url: body.logo_url ?? null,
                profile_json: (body.profile_json ?? undefined),
            },
        });
    }
    async getNotifications(tenantId) {
        return this.prisma.settingsNotifications.upsert({
            where: { tenant_id: tenantId },
            update: {},
            create: { tenant_id: tenantId },
        });
    }
    async updateNotifications(tenantId, body) {
        return this.prisma.settingsNotifications.upsert({
            where: { tenant_id: tenantId },
            update: body,
            create: {
                tenant_id: tenantId,
                new_rfq: body.new_rfq ?? true,
                quote_sent: body.quote_sent ?? true,
                quote_viewed: body.quote_viewed ?? true,
                quote_accepted: body.quote_accepted ?? true,
                quote_declined: body.quote_declined ?? true,
            },
        });
    }
    async getTemplates(tenantId) {
        return this.prisma.settingsTemplate.findMany({
            where: { tenant_id: tenantId },
            orderBy: { template_key: 'asc' },
        });
    }
    async createTemplate(tenantId, body) {
        return this.prisma.settingsTemplate.upsert({
            where: {
                tenant_id_template_key: {
                    tenant_id: tenantId,
                    template_key: body.template_key,
                },
            },
            update: { content: body.content },
            create: {
                tenant_id: tenantId,
                template_key: body.template_key,
                content: body.content,
            },
        });
    }
    async updateTemplate(id, tenantId, body) {
        return this.prisma.settingsTemplate.updateMany({
            where: { id, tenant_id: tenantId },
            data: body,
        });
    }
    async deleteTemplate(id, tenantId) {
        await this.prisma.settingsTemplate.deleteMany({
            where: { id, tenant_id: tenantId },
        });
        return { message: 'Template deleted successfully' };
    }
    async getAutomationRules(tenantId) {
        return this.prisma.automationRule.findMany({
            where: { tenant_id: tenantId },
            orderBy: { created_at: 'desc' },
        });
    }
    async createAutomationRule(tenantId, body) {
        return this.prisma.automationRule.create({
            data: {
                tenant_id: tenantId,
                name: body.name,
                condition: body.condition,
                action: body.action,
                active: body.active ?? true,
            },
        });
    }
    async updateAutomationRule(id, tenantId, body) {
        return this.prisma.automationRule.updateMany({
            where: { id, tenant_id: tenantId },
            data: body,
        });
    }
    async deleteAutomationRule(id, tenantId) {
        await this.prisma.automationRule.deleteMany({
            where: { id, tenant_id: tenantId },
        });
        return { message: 'Automation rule deleted successfully' };
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map