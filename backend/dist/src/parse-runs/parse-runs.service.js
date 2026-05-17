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
exports.ParseRunsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let ParseRunsService = class ParseRunsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId, query) {
        const take = Math.min(Math.max(Number(query.limit || 100), 1), 500);
        return this.prisma.parseRun.findMany({
            where: {
                tenant_id: tenantId,
                ...(query.stage ? { stage: query.stage } : {}),
                ...(query.status ? { status: query.status } : {}),
                ...(query.message_id
                    ? { message_id: { contains: query.message_id, mode: 'insensitive' } }
                    : {}),
                ...(query.source
                    ? { source: { contains: query.source, mode: 'insensitive' } }
                    : {}),
            },
            orderBy: { created_at: 'desc' },
            take,
        });
    }
    async cleanupOldRuns(tenantId, keepDays = 30) {
        const normalizedKeepDays = Math.min(Math.max(Number(keepDays || 30), 1), 3650);
        const cutoff = new Date(Date.now() - normalizedKeepDays * 24 * 60 * 60 * 1000);
        const result = await this.prisma.parseRun.deleteMany({
            where: {
                tenant_id: tenantId,
                created_at: { lt: cutoff },
            },
        });
        return {
            deleted_count: result.count,
            cutoff: cutoff.toISOString(),
            keep_days: normalizedKeepDays,
        };
    }
    async summary(tenantId, lookbackDays = 7) {
        const normalizedDays = Math.min(Math.max(Number(lookbackDays || 7), 1), 365);
        const since = new Date(Date.now() - normalizedDays * 24 * 60 * 60 * 1000);
        const grouped = await this.prisma.parseRun.groupBy({
            by: ['stage', 'status'],
            where: {
                tenant_id: tenantId,
                created_at: { gte: since },
            },
            _count: { _all: true },
        });
        const totals = await this.prisma.parseRun.aggregate({
            where: {
                tenant_id: tenantId,
                created_at: { gte: since },
            },
            _count: { _all: true },
            _sum: {
                matched_count: true,
                unmatched_count: true,
            },
        });
        return {
            lookback_days: normalizedDays,
            since: since.toISOString(),
            totals: {
                attempts: totals._count._all,
                matched_lines: totals._sum.matched_count || 0,
                unmatched_lines: totals._sum.unmatched_count || 0,
            },
            by_stage_status: grouped.map((row) => ({
                stage: row.stage,
                status: row.status,
                count: row._count._all,
            })),
        };
    }
};
exports.ParseRunsService = ParseRunsService;
exports.ParseRunsService = ParseRunsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ParseRunsService);
//# sourceMappingURL=parse-runs.service.js.map