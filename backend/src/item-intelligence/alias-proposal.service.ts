import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { randomUUID } from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AliasProposalService {
  private readonly logger = new Logger(AliasProposalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scan ItemMatchFeedback for the given tenant and propose aliases.
   * Runs on a cron schedule (every 10 minutes).
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async scanAndProposeFeedback() {
    try {
      // Get all tenants
      const tenants = await this.prisma.tenant.findMany({
        select: { id: true },
      });

      for (const tenant of tenants) {
        await this.proposeFeedbackAliases(tenant.id);
      }
    } catch (e) {
      this.logger.error('Cron job error in scanAndProposeFeedback: ' + (e as Error).message);
    }
  }

  /**
   * Analyze feedback for a tenant and create alias proposals for patterns.
   */
  async proposeFeedbackAliases(tenantId: string): Promise<void> {
    try {
      const tenantConfig = await this.prisma.itemMatchConfig.findUnique({
        where: { tenant_id: tenantId },
      });

      if (!tenantConfig) {
        return;
      }

      const minThreshold = Number(tenantConfig.suggestion_threshold) || 0.8;

      // Find feedback runs where user rejected a candidate but matched to another product
      const recentRuns = await this.prisma.itemMatchRun.findMany({
        where: {
          tenant_id: tenantId,
          created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // last 7 days
        },
        include: {
          candidates: true,
          feedback: true,
        },
      });

      for (const run of recentRuns) {
        // if this run has feedback, check if user selected a product
        const feedbackRecord = run.feedback[0];
        if (!feedbackRecord || !feedbackRecord.selected_product_id) continue;

        // get the best candidate for this run
        const bestCandidate = run.candidates.sort((a, b) => Number(b.score) - Number(a.score))[0];
        if (!bestCandidate) continue;

        // if user selected a different product than the top candidate,
        // and confidence is above threshold, propose an alias
        if (
          bestCandidate.product_id !== feedbackRecord.selected_product_id &&
          Number(bestCandidate.score) >= minThreshold
        ) {
          await this.proposeAlias(
            tenantId,
            run.input_text,
            feedbackRecord.selected_product_id,
            Number(bestCandidate.score),
          );
        }
      }
    } catch (e) {
      this.logger.error(`Error proposing aliases for tenant ${tenantId}: ${(e as Error).message}`);
    }
  }

  /**
   * Create or update an alias proposal.
   */
  async proposeAlias(
    tenantId: string,
    inputText: string,
    canonicalProductId: string,
    confidence: number,
  ): Promise<void> {
    try {
      const existing = await this.prisma.itemAliasProposal.findUnique({
        where: {
          tenant_id_input_text_canonical_product_id: {
            tenant_id: tenantId,
            input_text: inputText,
            canonical_product_id: canonicalProductId,
          },
        },
      });

      if (existing && existing.status === 'pending') {
        // increment feedback count
        await this.prisma.itemAliasProposal.update({
          where: { id: existing.id },
          data: {
            feedback_count: { increment: 1 },
            confidence: confidence > Number(existing.confidence) ? confidence : existing.confidence,
            updated_at: new Date(),
          },
        });
      } else if (!existing) {
        // create new proposal
        await this.prisma.itemAliasProposal.create({
          data: {
            id: randomUUID(),
            tenant_id: tenantId,
            input_text: inputText,
            canonical_product_id: canonicalProductId,
            confidence,
            feedback_count: 1,
            status: 'pending',
          },
        });
      }
    } catch (e) {
      this.logger.warn(`Failed to propose alias: ${(e as Error).message}`);
    }
  }

  /**
   * Accept an alias proposal and create the alias.
   */
  async acceptProposal(tenantId: string, proposalId: string): Promise<void> {
    try {
      const proposal = await this.prisma.itemAliasProposal.findUnique({
        where: { id: proposalId },
      });

      if (!proposal || proposal.tenant_id !== tenantId) {
        throw new Error('Proposal not found');
      }

      // Create the alias
      await this.prisma.itemAlias.create({
        data: {
          id: randomUUID(),
          tenant_id: tenantId,
          alias_text: proposal.input_text,
          canonical_product_id: proposal.canonical_product_id,
          source: 'auto_proposal',
          weight: 1,
        },
      });

      // Mark proposal as accepted
      await this.prisma.itemAliasProposal.update({
        where: { id: proposalId },
        data: { status: 'accepted' },
      });

      this.logger.log(`Accepted alias proposal ${proposalId}`);
    } catch (e) {
      this.logger.error(`Error accepting proposal: ${(e as Error).message}`);
      throw e;
    }
  }

  /**
   * Reject an alias proposal.
   */
  async rejectProposal(tenantId: string, proposalId: string): Promise<void> {
    try {
      const proposal = await this.prisma.itemAliasProposal.findUnique({
        where: { id: proposalId },
      });

      if (!proposal || proposal.tenant_id !== tenantId) {
        throw new Error('Proposal not found');
      }

      // Mark proposal as rejected
      await this.prisma.itemAliasProposal.update({
        where: { id: proposalId },
        data: { status: 'rejected' },
      });

      this.logger.log(`Rejected alias proposal ${proposalId}`);
    } catch (e) {
      this.logger.error(`Error rejecting proposal: ${(e as Error).message}`);
      throw e;
    }
  }

  /**
   * List pending proposals for a tenant.
   */
  async listPendingProposals(tenantId: string) {
    return this.prisma.itemAliasProposal.findMany({
      where: {
        tenant_id: tenantId,
        status: 'pending',
      },
      orderBy: [{ feedback_count: 'desc' }, { created_at: 'asc' }],
    });
  }

  /**
   * List all proposals for a tenant (accepted, rejected, pending).
   */
  async listAllProposals(tenantId: string) {
    return this.prisma.itemAliasProposal.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }
}
