import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.auditLog.findMany({
      where: { tenant_id: tenantId },
      include: { user: true },
      orderBy: { created_at: 'desc' },
    });
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
