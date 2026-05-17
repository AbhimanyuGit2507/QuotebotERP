import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { recordsToCsv } from '../common/utils/export.util';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: { search?: string; tier?: string }) {
    const { search, tier } = query;

    return this.prisma.client.findMany({
      where: {
        tenant_id: tenantId,
        OR: [{ rfqs: { some: {} } }, { quotations: { some: {} } }],
        ...(search
          ? {
              AND: [
                {
                  OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                  ],
                },
              ],
            }
          : {}),
        ...(tier ? { tier } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async create(
    tenantId: string,
    body: {
      name: string;
      type: string;
      email: string;
      phone?: string;
      website?: string;
      address?: string;
      city?: string;
      state?: string;
      gst?: string;
      pan?: string;
      tier?: string;
    },
  ) {
    return this.prisma.client.create({
      data: {
        tenant_id: tenantId,
        name: body.name,
        type: body.type,
        email: body.email,
        phone: body.phone,
        website: body.website,
        address: body.address,
        city: body.city,
        state: body.state,
        gst: body.gst,
        pan: body.pan,
        tier: body.tier ?? 'regular',
      },
    });
  }

  async update(
    id: string,
    tenantId: string,
    body: Partial<{
      name: string;
      type: string;
      email: string;
      phone: string;
      website: string;
      address: string;
      city: string;
      state: string;
      gst: string;
      pan: string;
      tier: string;
    }>,
  ) {
    await this.findOne(id, tenantId);
    return this.prisma.client.update({ where: { id }, data: body });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    try {
      await this.prisma.client.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Cannot delete client because related quotations exist',
        );
      }
      throw error;
    }
    return { message: 'Client deleted successfully' };
  }

  async transactions(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.quotation.findMany({
      where: { client_id: id, tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      include: { items: true },
      take: 10,
    });
  }

  async updateTier(id: string, tenantId: string, tier: string) {
    return this.update(id, tenantId, { tier });
  }

  async exportCsv(tenantId: string, query: { search?: string; tier?: string }) {
    const clients = await this.findAll(tenantId, query);

    return recordsToCsv(
      clients.map((client) => ({
        name: client.name,
        type: client.type,
        email: client.email,
        phone: client.phone,
        city: client.city,
        state: client.state,
        tier: client.tier,
        total_orders: client.total_orders,
        total_value: client.total_value,
      })),
    );
  }
}
