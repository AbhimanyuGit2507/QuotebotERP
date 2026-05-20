import { Body, Controller, Post, Headers, HttpCode, Get, Query, Param, Put } from '@nestjs/common';
import { ItemIntelligenceService } from './item-intelligence.service';
import { AliasProposalService } from './alias-proposal.service';
import { PrismaService } from '../prisma.service';

@Controller('item-intelligence')
export class ItemIntelligenceController {
  constructor(
    private readonly svc: ItemIntelligenceService,
    private readonly proposalSvc: AliasProposalService,
    private readonly prisma: PrismaService,
  ) {}

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
    const runs = await this.prisma.itemMatchRun.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: lim,
    });
    return runs;
  }

  @Get('aliases')
  async listAliases(@Query('tenant_id') tenantId: string) {
    const aliases = await this.prisma.itemAlias.findMany({
      where: { tenant_id: tenantId },
      orderBy: { updated_at: 'desc' },
    });
    return aliases;
  }

  @Get('config')
  async getConfig(@Query('tenant_id') tenantId: string) {
    const config = await this.prisma.itemMatchConfig.findUnique({
      where: { tenant_id: tenantId },
    });
    return config || {};
  }

  @Put('config')
  @HttpCode(200)
  async updateConfig(@Query('tenant_id') tenantId: string, @Body() body: any) {
    const existing = await this.prisma.itemMatchConfig.findUnique({
      where: { tenant_id: tenantId },
    });

    if (existing) {
      return this.prisma.itemMatchConfig.update({
        where: { tenant_id: tenantId },
        data: {
          semantic_reranker_enabled: body.semantic_reranker_enabled,
          semantic_weight: body.semantic_weight,
          suggestion_threshold: body.suggestion_threshold,
          auto_accept_threshold: body.auto_accept_threshold,
        },
      });
    } else {
      return this.prisma.itemMatchConfig.create({
        data: {
          id: require('crypto').randomUUID(),
          tenant_id: tenantId,
          semantic_reranker_enabled: body.semantic_reranker_enabled || false,
          semantic_weight: body.semantic_weight || 0.5,
          suggestion_threshold: body.suggestion_threshold || 0.8,
          auto_accept_threshold: body.auto_accept_threshold || 0.92,
        },
      });
    }
  }

  @Get('alias-proposals')
  async listProposals(@Query('tenant_id') tenantId: string, @Query('pending_only') pendingOnly = 'true') {
    if (pendingOnly === 'true' || pendingOnly === '1') {
      return this.proposalSvc.listPendingProposals(tenantId);
    }
    return this.proposalSvc.listAllProposals(tenantId);
  }

  @Post('alias-proposals/:id/accept')
  @HttpCode(200)
  async acceptProposal(
    @Param('id') proposalId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: any,
  ) {
    const tid = tenantId || body?.tenant_id || 'default';
    await this.proposalSvc.acceptProposal(tid, proposalId);
    return { status: 'accepted' };
  }

  @Post('alias-proposals/:id/reject')
  @HttpCode(200)
  async rejectProposal(
    @Param('id') proposalId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: any,
  ) {
    const tid = tenantId || body?.tenant_id || 'default';
    await this.proposalSvc.rejectProposal(tid, proposalId);
    return { status: 'rejected' };
  }
}
