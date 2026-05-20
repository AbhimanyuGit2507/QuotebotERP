import { Body, Controller, Headers, Post } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditEventsController {
  constructor(private readonly auditService: AuditService) {}

  @Post('events')
  async createEvent(@Body() body: any, @Headers('x-tenant-id') tenantId?: string, @Headers('x-user-id') userId?: string) {
    const resolvedTenantId = tenantId || body?.tenant_id || body?.tenantId || '';

    if (!resolvedTenantId) {
      return { status: 'skipped', reason: 'missing tenant_id' };
    }

    const entityId = String(body?.quotation_id || body?.quotation_ids?.[0] || body?.entity_id || body?.entityId || 'unknown');
    const entityType = String(body?.entity_type || body?.entityType || 'quotation');

    await this.auditService.createEvent({
      tenantId: resolvedTenantId,
      userId: userId || body?.user_id || body?.performed_by || null,
      action: String(body?.action || 'frontend_event'),
      entityType,
      entityId,
      beforeJson: body?.before_json ? JSON.stringify(body.before_json) : null,
      afterJson: body?.after_json ? JSON.stringify(body.after_json) : null,
    });

    return { status: 'stored' };
  }
}