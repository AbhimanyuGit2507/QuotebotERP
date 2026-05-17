import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ConversationStage } from '@prisma/client';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async close(tenantId: string, conversationId: string, reason?: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenant_id: tenantId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'closed',
        current_stage: ConversationStage.CLOSED,
        updated_at: new Date(),
      },
    });
  }

  async reopen(tenantId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenant_id: tenantId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Reopen to previous stage before closure (or default to FOLLOWUP_PENDING)
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'open',
        current_stage: ConversationStage.FOLLOWUP_PENDING,
        updated_at: new Date(),
      },
    });
  }

  async list(
    tenantId: string,
    filters?: {
      status?: string;
      stage?: ConversationStage;
      assigned_to?: string;
    },
  ) {
    return this.prisma.conversation.findMany({
      where: {
        tenant_id: tenantId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.stage && { current_stage: filters.stage }),
        ...(filters?.assigned_to && {
          assigned_operator_id: filters.assigned_to,
        }),
      },
      include: {
        client: true,
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            messages: true,
            assistance_tickets: true,
          },
        },
      },
      orderBy: { last_message_at: 'desc' },
    });
  }

  async getById(tenantId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenant_id: tenantId },
      include: {
        client: true,
        messages: {
          orderBy: { created_at: 'asc' },
        },
        rfqs: true,
        quotations: true,
        purchase_orders: true,
        invoices: {
          include: { payments: true },
        },
        assistance_tickets: {
          include: {
            assigned_to: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }
}
