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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma.service");
let AdminService = class AdminService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async overview(tenantId) {
        const timingWindowDays = Math.max(1, Number(process.env.RFQ_TIMING_WINDOW_DAYS || 30));
        const timingWindowStart = new Date(Date.now() - timingWindowDays * 24 * 60 * 60 * 1000);
        const [users, rfqs, quotations, clients, products, parseRuns, outboundEmails, activities, auditLogs, invoices, openInvoices, paidInvoices, partialInvoices, cancelledInvoices, timingMessages,] = await Promise.all([
            this.prisma.user.count({ where: { tenant_id: tenantId } }),
            this.prisma.rFQ.count({ where: { tenant_id: tenantId } }),
            this.prisma.quotation.count({ where: { tenant_id: tenantId } }),
            this.prisma.client.count({ where: { tenant_id: tenantId } }),
            this.prisma.product.count({ where: { tenant_id: tenantId } }),
            this.prisma.parseRun.count({ where: { tenant_id: tenantId } }),
            this.prisma.outboundEmail.count({ where: { tenant_id: tenantId } }),
            this.prisma.activity.count({ where: { tenant_id: tenantId } }),
            this.prisma.auditLog.count({ where: { tenant_id: tenantId } }),
            this.prisma.invoice.count({ where: { tenant_id: tenantId } }),
            this.prisma.invoice.count({
                where: { tenant_id: tenantId, status: 'open' },
            }),
            this.prisma.invoice.count({
                where: { tenant_id: tenantId, status: 'paid' },
            }),
            this.prisma.invoice.count({
                where: { tenant_id: tenantId, status: 'partial' },
            }),
            this.prisma.invoice.count({
                where: { tenant_id: tenantId, status: 'cancelled' },
            }),
            this.prisma.message.findMany({
                where: {
                    tenant_id: tenantId,
                    raw_payload: { not: client_1.Prisma.JsonNull },
                    created_at: { gte: timingWindowStart },
                },
                select: {
                    created_at: true,
                    raw_payload: true,
                },
            }),
        ]);
        const [pendingOutbound, sentOutbound, failedOutbound, failedRuns, recentRuns,] = await Promise.all([
            this.prisma.outboundEmail.count({
                where: { tenant_id: tenantId, status: 'pending' },
            }),
            this.prisma.outboundEmail.count({
                where: { tenant_id: tenantId, status: 'sent' },
            }),
            this.prisma.outboundEmail.count({
                where: { tenant_id: tenantId, status: 'failed' },
            }),
            this.prisma.parseRun.count({
                where: { tenant_id: tenantId, status: 'failed' },
            }),
            this.prisma.parseRun.findMany({
                where: { tenant_id: tenantId },
                orderBy: { created_at: 'desc' },
                take: 8,
                select: {
                    id: true,
                    stage: true,
                    status: true,
                    source: true,
                    matched_count: true,
                    unmatched_count: true,
                    error_message: true,
                    created_at: true,
                },
            }),
        ]);
        const timingMs = [];
        for (const row of timingMessages) {
            const payload = row.raw_payload &&
                typeof row.raw_payload === 'object' &&
                !Array.isArray(row.raw_payload)
                ? row.raw_payload
                : {};
            const quotationCreatedAt = typeof payload.quotation_created_at === 'string'
                ? Date.parse(payload.quotation_created_at)
                : NaN;
            if (!Number.isFinite(quotationCreatedAt)) {
                continue;
            }
            const startAt = row.created_at.getTime();
            const duration = Math.max(0, quotationCreatedAt - startAt);
            timingMs.push(duration);
        }
        timingMs.sort((a, b) => a - b);
        const percentile = (p) => {
            if (timingMs.length === 0)
                return null;
            const index = Math.min(timingMs.length - 1, Math.max(0, Math.floor((p / 100) * timingMs.length)));
            return timingMs[index];
        };
        const averageMs = timingMs.length > 0
            ? Math.round(timingMs.reduce((sum, value) => sum + value, 0) / timingMs.length)
            : null;
        const rfqTiming = {
            window_days: timingWindowDays,
            count: timingMs.length,
            avg_ms: averageMs,
            p50_ms: percentile(50),
            p95_ms: percentile(95),
            best_ms: timingMs.length > 0 ? timingMs[0] : null,
            worst_ms: timingMs.length > 0 ? timingMs[timingMs.length - 1] : null,
        };
        return {
            counts: {
                users,
                rfqs,
                quotations,
                clients,
                products,
                parseRuns,
                outboundEmails,
                activities,
                auditLogs,
                invoices,
                openInvoices,
                paidInvoices,
                partialInvoices,
                cancelledInvoices,
            },
            delivery: {
                pendingOutbound,
                sentOutbound,
                failedOutbound,
            },
            parsing: {
                failedRuns,
                recentRuns,
            },
            rfqTiming,
        };
    }
    async users(tenantId) {
        const rows = await this.prisma.user.findMany({
            where: { tenant_id: tenantId },
            include: { role: true },
            orderBy: { created_at: 'desc' },
        });
        return rows.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role.name,
            status: user.status,
            created_at: user.created_at,
            updated_at: user.updated_at,
        }));
    }
    async logs(tenantId) {
        const [activities, auditLogs, parseRuns, outboundEmails] = await Promise.all([
            this.prisma.activity.findMany({
                where: { tenant_id: tenantId },
                include: { user: true },
                orderBy: { created_at: 'desc' },
                take: 20,
            }),
            this.prisma.auditLog.findMany({
                where: { tenant_id: tenantId },
                include: { user: true },
                orderBy: { created_at: 'desc' },
                take: 20,
            }),
            this.prisma.parseRun.findMany({
                where: { tenant_id: tenantId },
                orderBy: { created_at: 'desc' },
                take: 20,
            }),
            this.prisma.outboundEmail.findMany({
                where: { tenant_id: tenantId },
                orderBy: { created_at: 'desc' },
                take: 20,
            }),
        ]);
        return {
            activities,
            auditLogs,
            parseRuns,
            outboundEmails,
        };
    }
    async llms(tenantId) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const [queriesToday, failedToday] = await Promise.all([
            this.prisma.parseRun.count({
                where: {
                    tenant_id: tenantId,
                    created_at: { gte: startOfDay },
                },
            }),
            this.prisma.parseRun.count({
                where: {
                    tenant_id: tenantId,
                    created_at: { gte: startOfDay },
                    status: 'failed',
                },
            }),
        ]);
        const providers = [
            {
                provider: 'groq',
                model: process.env.GROQ_MODEL || process.env.GROQ_CLASSIFIER_MODEL || null,
                key: 'GROQ_API_KEY',
                baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
            },
            {
                provider: 'cerebras',
                model: process.env.CEREBRAS_MODEL ||
                    process.env.CEREBRAS_CLASSIFIER_MODEL ||
                    null,
                key: 'CEREBRAS_API_KEY',
                baseUrl: process.env.CEREBRAS_BASE_URL || 'https://api.cerebras.ai/v1',
            },
            {
                provider: 'gemini',
                model: process.env.GEMINI_MODEL ||
                    process.env.GEMINI_CLASSIFIER_MODEL ||
                    null,
                key: 'GEMINI_API_KEY',
                baseUrl: process.env.GEMINI_BASE_URL ||
                    'https://generativelanguage.googleapis.com/v1beta',
            },
            {
                provider: 'together',
                model: process.env.TOGETHER_MODEL ||
                    process.env.TOGETHER_CLASSIFIER_MODEL ||
                    null,
                key: 'TOGETHER_API_KEY',
                baseUrl: process.env.TOGETHER_BASE_URL || 'https://api.together.xyz/v1',
            },
            {
                provider: 'deepseek',
                model: process.env.DEEPSEEK_MODEL ||
                    process.env.DEEPSEEK_CLASSIFIER_MODEL ||
                    null,
                key: 'DEEPSEEK_API_KEY',
                baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
            },
            {
                provider: 'openrouter',
                model: process.env.OPENROUTER_MODEL ||
                    process.env.OPENROUTER_CLASSIFIER_MODEL ||
                    null,
                key: 'OPENROUTER_API_KEY',
                baseUrl: process.env.OPENROUTER_BASE_URL ||
                    'https://openrouter.ai/api/v1/chat/completions',
            },
        ];
        return providers.map((provider) => {
            const configured = Boolean(process.env[provider.key]);
            return {
                provider: provider.provider,
                model: provider.model,
                configured,
                status: configured ? 'configured' : 'missing_key',
                queries_today: configured ? queriesToday : null,
                failed_today: configured ? failedToday : null,
                remaining_quota: null,
                exhausted: null,
                base_url: configured ? provider.baseUrl : null,
            };
        });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map