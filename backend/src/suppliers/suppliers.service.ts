import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  PaginationParams,
  PaginatedResult,
  parsePaginationParams,
} from '../common/utils/pagination.util';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<any>> {
    const { skip, take, page, pageSize } = parsePaginationParams(params);
    const { search } = params;

    const where: any = {
      tenant_id: tenantId,
      deleted_at: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { contact_person: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
      this.prisma.supplier.count({ where }),
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
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async create(
    tenantId: string,
    body: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      gstin?: string;
      pan?: string;
      contact_person?: string;
      payment_terms?: string;
      notes?: string;
    },
  ) {
    return this.prisma.supplier.create({
      data: {
        tenant_id: tenantId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        state: body.state,
        gstin: body.gstin,
        pan: body.pan,
        contact_person: body.contact_person,
        payment_terms: body.payment_terms,
        notes: body.notes,
      },
    });
  }

  async update(
    id: string,
    tenantId: string,
    body: Partial<{
      name: string;
      email: string;
      phone: string;
      address: string;
      city: string;
      state: string;
      gstin: string;
      pan: string;
      contact_person: string;
      payment_terms: string;
      notes: string;
      is_active: boolean;
    }>,
  ) {
    await this.findOne(id, tenantId);
    return this.prisma.supplier.update({ where: { id }, data: body });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    await this.prisma.supplier.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    return { message: 'Supplier deleted successfully' };
  }
}
