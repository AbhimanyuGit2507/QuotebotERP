import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { recordsToCsv } from '../common/utils/export.util';
import {
  PaginationParams,
  PaginatedResult,
  parsePaginationParams,
} from '../common/utils/pagination.util';

/** Allowed sortable columns for clients list */
const CLIENT_SORTABLE_FIELDS = new Set([
  'created_at',
  'name',
  'email',
  'tier',
  'total_orders',
  'total_value',
  'updated_at',
]);

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params: PaginationParams & { tier?: string },
  ): Promise<PaginatedResult<any>> {
    const { skip, take, page, pageSize } = parsePaginationParams(params);
    const { search, tier } = params;

    const where: any = {
      tenant_id: tenantId,
      deleted_at: null,
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
    };

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        orderBy: {
          [params.sortBy && CLIENT_SORTABLE_FIELDS.has(params.sortBy)
            ? params.sortBy
            : 'created_at']: params.sortOrder || 'desc',
        },
        skip,
        take,
      }),
      this.prisma.client.count({ where }),
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

  async findOne(id: string, tenantId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
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
    await this.prisma.client.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return { message: 'Client deleted successfully' };
  }

  async forceDelete(id: string, tenantId: string) {
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
    return { message: 'Client permanently deleted' };
  }

  async transactions(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.quotation.findMany({
      where: { client_id: id, tenant_id: tenantId, deleted_at: null },
      orderBy: { created_at: 'desc' },
      include: { items: true },
      take: 10,
    });
  }

  async updateTier(id: string, tenantId: string, tier: string) {
    return this.update(id, tenantId, { tier });
  }

  async exportCsv(tenantId: string, query: { search?: string; tier?: string }) {
    const result = await this.findAll(tenantId, { ...query, pageSize: 10000 });

    return recordsToCsv(
      result.data.map((client: any) => ({
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
