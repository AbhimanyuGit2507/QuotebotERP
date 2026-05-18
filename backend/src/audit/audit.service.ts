import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  PaginationParams,
  PaginatedResult,
  parsePaginationParams,
} from '../common/utils/pagination.util';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params: PaginationParams = {},
  ): Promise<PaginatedResult<any>> {
    const { skip, take, page, pageSize } = parsePaginationParams(params);

    const where: any = { tenant_id: tenantId };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: true },
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findByEntity(tenantId: string, entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        tenant_id: tenantId,
        entity_type: entityType,
        entity_id: entityId,
      },
      include: { user: true },
      orderBy: { created_at: 'desc' },
    });
  }
}
