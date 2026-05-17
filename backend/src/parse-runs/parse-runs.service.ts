import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface ParseRunsQuery {
  stage?: string;
  status?: string;
  message_id?: string;
  source?: string;
  limit?: number;
}

@Injectable()
export class ParseRunsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: ParseRunsQuery) {
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

  async cleanupOldRuns(tenantId: string, keepDays = 30) {
    const normalizedKeepDays = Math.min(
      Math.max(Number(keepDays || 30), 1),
      3650,
    );
    const cutoff = new Date(
      Date.now() - normalizedKeepDays * 24 * 60 * 60 * 1000,
    );

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

  async summary(tenantId: string, lookbackDays = 7) {
    const normalizedDays = Math.min(
      Math.max(Number(lookbackDays || 7), 1),
      365,
    );
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
}
