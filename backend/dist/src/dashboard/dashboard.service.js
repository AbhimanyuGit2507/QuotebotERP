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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getKpis(tenantId) {
        const [rfqs, quotations, acceptedQuotes, declinedQuotes, products, clients, openInvoices, paidInvoices,] = await Promise.all([
            this.prisma.rFQ.count({ where: { tenant_id: tenantId } }),
            this.prisma.quotation.count({ where: { tenant_id: tenantId } }),
            this.prisma.quotation.count({
                where: { tenant_id: tenantId, status: 'accepted' },
            }),
            this.prisma.quotation.count({
                where: { tenant_id: tenantId, status: 'declined' },
            }),
            this.prisma.product.count({
                where: { tenant_id: tenantId, status: 'active' },
            }),
            this.prisma.client.count({ where: { tenant_id: tenantId } }),
            this.prisma.invoice.count({
                where: { tenant_id: tenantId, status: 'open' },
            }),
            this.prisma.invoice.count({
                where: { tenant_id: tenantId, status: 'paid' },
            }),
        ]);
        return {
            totalRfqs: rfqs,
            quotesSent: quotations,
            acceptedQuotes,
            declinedQuotes,
            activeProducts: products,
            clients,
            openInvoices,
            paidInvoices,
        };
    }
    async getRfqVsQuotes(tenantId) {
        const [rfqs, quotes] = await Promise.all([
            this.prisma.rFQ.findMany({
                where: { tenant_id: tenantId },
                select: { created_at: true },
            }),
            this.prisma.quotation.findMany({
                where: { tenant_id: tenantId },
                select: { created_at: true },
            }),
        ]);
        const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - index));
            return date.toISOString().split('T')[0];
        });
        return days.map((day) => ({
            date: day,
            rfqs: rfqs.filter((item) => item.created_at.toISOString().startsWith(day))
                .length,
            quotes: quotes.filter((item) => item.created_at.toISOString().startsWith(day)).length,
        }));
    }
    async getQuoteStatus(tenantId) {
        const quotations = await this.prisma.quotation.findMany({
            where: { tenant_id: tenantId },
            select: { status: true },
        });
        const counts = quotations.reduce((acc, quotation) => {
            acc[quotation.status] = (acc[quotation.status] ?? 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).map(([status, count]) => ({ status, count }));
    }
    async getRfqByChannel(tenantId) {
        const rfqs = await this.prisma.rFQ.findMany({
            where: { tenant_id: tenantId },
            select: { channel: true },
        });
        const counts = rfqs.reduce((acc, rfq) => {
            acc[rfq.channel] = (acc[rfq.channel] ?? 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).map(([channel, count]) => ({
            channel,
            count,
        }));
    }
    async getActivityFeed(tenantId) {
        return this.prisma.activity.findMany({
            where: { tenant_id: tenantId },
            include: { user: true },
            orderBy: { created_at: 'desc' },
            take: 10,
        });
    }
    async getSystemStatus(tenantId) {
        const [pendingRfqs, draftQuotes, files] = await Promise.all([
            this.prisma.rFQ.count({
                where: { tenant_id: tenantId, status: 'pending' },
            }),
            this.prisma.quotation.count({
                where: { tenant_id: tenantId, status: 'draft' },
            }),
            this.prisma.file.count({ where: { tenant_id: tenantId } }),
        ]);
        return {
            database: 'connected',
            pendingRfqs,
            draftQuotes,
            files,
            auth: 'active',
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map