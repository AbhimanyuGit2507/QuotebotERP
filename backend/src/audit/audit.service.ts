import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  PaginationParams,
  PaginatedResult,
  parsePaginationParams,
} from '../common/utils/pagination.util';

export interface AuditFilterParams extends PaginationParams {
  entityType?: string;
  action?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateAuditEventInput {
  tenantId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson?: string | null;
  afterJson?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(input: CreateAuditEventInput) {
    return this.prisma.auditLog.create({
      data: {
        tenant_id: input.tenantId,
        user_id: input.userId || null,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId,
        before_json: input.beforeJson || null,
        after_json: input.afterJson || null,
      },
    });
  }

  async findAll(
    tenantId: string,
    params: AuditFilterParams = {},
  ): Promise<PaginatedResult<any>> {
    const { skip, take, page, pageSize } = parsePaginationParams(params);

    const where: any = { tenant_id: tenantId };

    if (params.entityType) {
      where.entity_type = params.entityType;
    }
    if (params.action) {
      where.action = params.action;
    }
    if (params.userId) {
      where.user_id = params.userId;
    }
    if (params.dateFrom || params.dateTo) {
      where.created_at = {};
      if (params.dateFrom) {
        where.created_at.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        where.created_at.lte = new Date(params.dateTo);
      }
    }

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
