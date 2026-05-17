import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AssistanceTicketStatus } from '@prisma/client';

@Injectable()
export class AssistanceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    tenantId: string,
    filters?: {
      status?: string;
      type?: string;
      assigned_to?: string;
    },
  ) {
    return this.prisma.assistanceTicket.findMany({
      where: {
        tenant_id: tenantId,
        ...(filters?.status && {
          status: filters.status as AssistanceTicketStatus,
        }),
        ...(filters?.type && { type: filters.type as any }),
        ...(filters?.assigned_to && {
          assigned_to_id: filters.assigned_to,
        }),
      },
      include: {
        conversation: {
          include: {
            client: true,
          },
        },
        message: true,
        assigned_to: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getById(tenantId: string, ticketId: string) {
    const ticket = await this.prisma.assistanceTicket.findFirst({
      where: { id: ticketId, tenant_id: tenantId },
      include: {
        conversation: {
          include: {
            client: true,
            messages: {
              orderBy: { created_at: 'asc' },
            },
            quotations: true,
          },
        },
        message: true,
        assigned_to: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Assistance ticket not found');
    }

    return ticket;
  }

  async assign(tenantId: string, ticketId: string, userId: string) {
    const ticket = await this.prisma.assistanceTicket.findFirst({
      where: { id: ticketId, tenant_id: tenantId },
    });

    if (!ticket) {
      throw new NotFoundException('Assistance ticket not found');
    }

    return this.prisma.assistanceTicket.update({
      where: { id: ticketId },
      data: {
        assigned_to_id: userId,
        status: AssistanceTicketStatus.IN_PROGRESS,
      },
    });
  }

  async resolve(tenantId: string, ticketId: string, userId: string) {
    const ticket = await this.prisma.assistanceTicket.findFirst({
      where: { id: ticketId, tenant_id: tenantId },
    });

    if (!ticket) {
      throw new NotFoundException('Assistance ticket not found');
    }

    return this.prisma.assistanceTicket.update({
      where: { id: ticketId },
      data: {
        status: AssistanceTicketStatus.RESOLVED,
        updated_at: new Date(),
      },
    });
  }
}
