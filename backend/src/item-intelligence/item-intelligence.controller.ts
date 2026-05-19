import { Body, Controller, Post, Headers, HttpCode, Get, Query } from '@nestjs/common';
import { ItemIntelligenceService } from './item-intelligence.service';
import { PrismaService } from '../prisma.service';

@Controller('item-intelligence')
export class ItemIntelligenceController {
  constructor(private readonly svc: ItemIntelligenceService) {}

  @Post('feedback')
  @HttpCode(200)
  async feedback(@Body() body: any, @Headers('x-tenant-id') tenantId: string) {
    // forward to adapter sidecar for persistence/processing
    await this.svc.storeFeedback(tenantId || body?.tenant_id || 'default', body);
    return { status: 'ok' };
  }

  @Get('runs')
  async listRuns(@Query('tenant_id') tenantId: string, @Query('limit') limit = '50') {
    const lim = Math.min(200, Number(limit) || 50);
    const runs = await (this as any).svc['prisma'].itemMatchRun.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: lim,
    });
    return runs;
  }

  @Get('aliases')
  async listAliases(@Query('tenant_id') tenantId: string) {
    const aliases = await (this as any).svc['prisma'].itemAlias.findMany({ where: { tenant_id: tenantId }, orderBy: { updated_at: 'desc' } });
    return aliases;
  }
}
