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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const export_util_1 = require("../common/utils/export.util");
let AnalyticsService = class AnalyticsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async salesTrends(tenantId) {
        const quotations = await this.prisma.quotation.findMany({
            where: { tenant_id: tenantId },
            select: { date: true, total: true, status: true },
            orderBy: { created_at: 'asc' },
        });
        return quotations.map((quotation) => ({
            date: quotation.date,
            total: quotation.total,
            status: quotation.status,
        }));
    }
    async rfqAnalysis(tenantId) {
        const rfqs = await this.prisma.rFQ.findMany({
            where: { tenant_id: tenantId },
            include: { client: true, items: true },
        });
        return {
            total: rfqs.length,
            byStatus: rfqs.reduce((acc, rfq) => {
                acc[rfq.status] = (acc[rfq.status] ?? 0) + 1;
                return acc;
            }, {}),
            byChannel: rfqs.reduce((acc, rfq) => {
                acc[rfq.channel] = (acc[rfq.channel] ?? 0) + 1;
                return acc;
            }, {}),
            avgConfidence: rfqs.reduce((sum, rfq) => sum + rfq.confidence_score, 0) /
                (rfqs.length || 1),
        };
    }
    async quotePerformance(tenantId) {
        const quotations = await this.prisma.quotation.findMany({
            where: { tenant_id: tenantId },
        });
        const accepted = quotations.filter((quotation) => quotation.status === 'accepted').length;
        return {
            totalQuotes: quotations.length,
            acceptedQuotes: accepted,
            acceptanceRate: quotations.length
                ? (accepted / quotations.length) * 100
                : 0,
            totalValue: quotations.reduce((sum, quotation) => sum + Number(quotation.total), 0),
            averageValue: quotations.reduce((sum, quotation) => sum + Number(quotation.total), 0) /
                (quotations.length || 1),
        };
    }
    async productPerformance(tenantId) {
        const products = await this.prisma.product.findMany({
            where: { tenant_id: tenantId },
            include: { quotation_items: true, category: true },
        });
        return products.map((product) => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            category: product.category.name,
            quoteCount: product.quotation_items.length,
            stock: product.stock,
            price: product.price,
        }));
    }
    async clientInsights(tenantId) {
        return this.prisma.client.findMany({
            where: { tenant_id: tenantId },
            orderBy: [{ total_value: 'desc' }, { total_orders: 'desc' }],
        });
    }
    async channelBreakdown(tenantId) {
        const rfqs = await this.prisma.rFQ.findMany({
            where: { tenant_id: tenantId },
            select: { channel: true },
        });
        return rfqs.reduce((acc, rfq) => {
            acc[rfq.channel] = (acc[rfq.channel] ?? 0) + 1;
            return acc;
        }, {});
    }
    async exportCsv(tenantId, report) {
        switch (report) {
            case 'sales-trends':
                return (0, export_util_1.recordsToCsv)(await this.salesTrends(tenantId));
            case 'rfq-analysis': {
                const analysis = await this.rfqAnalysis(tenantId);
                return (0, export_util_1.recordsToCsv)([
                    {
                        total: analysis.total,
                        avgConfidence: analysis.avgConfidence,
                        byStatus: JSON.stringify(analysis.byStatus),
                        byChannel: JSON.stringify(analysis.byChannel),
                    },
                ]);
            }
            case 'quote-performance':
                return (0, export_util_1.recordsToCsv)([await this.quotePerformance(tenantId)]);
            case 'product-performance':
                return (0, export_util_1.recordsToCsv)(await this.productPerformance(tenantId));
            case 'client-insights':
                return (0, export_util_1.recordsToCsv)(await this.clientInsights(tenantId));
            case 'channel-breakdown': {
                const breakdown = await this.channelBreakdown(tenantId);
                return (0, export_util_1.recordsToCsv)(Object.entries(breakdown).map(([channel, count]) => ({
                    channel,
                    count,
                })));
            }
            default:
                return (0, export_util_1.recordsToCsv)([]);
        }
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map