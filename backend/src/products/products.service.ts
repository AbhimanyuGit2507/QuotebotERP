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

/** Allowed sortable columns for products list */
const PRODUCT_SORTABLE_FIELDS = new Set([
  'created_at',
  'name',
  'sku',
  'price',
  'cost',
  'stock',
  'status',
  'updated_at',
]);

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    params: PaginationParams & { category?: string; status?: string },
  ): Promise<PaginatedResult<any>> {
    const { skip, take, page, pageSize } = parsePaginationParams(params);
    const { search, category, status } = params;

    const where: any = {
      tenant_id: tenantId,
      deleted_at: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(category ? { category_id: category } : {}),
      ...(status ? { status } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: {
          [params.sortBy && PRODUCT_SORTABLE_FIELDS.has(params.sortBy) ? params.sortBy : 'created_at']:
            params.sortOrder || 'desc',
        },
        skip,
        take,
      }),
      this.prisma.product.count({ where }),
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

  async getCategories(tenantId: string) {
    return this.prisma.productCategory.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async create(
    tenantId: string,
    body: {
      sku: string;
      name: string;
      category_id: string;
      unit: string;
      price: number;
      cost: number;
      stock?: number;
      reorder_level?: number;
      hsn?: string;
      gst_percent?: number;
      description?: string;
      status?: string;
      image_url?: string;
    },
  ) {
    return this.prisma.product.create({
      data: {
        tenant_id: tenantId,
        sku: body.sku,
        name: body.name,
        category_id: body.category_id,
        unit: body.unit,
        price: Number(body.price),
        cost: Number(body.cost),
        stock: body.stock ?? 0,
        reorder_level: body.reorder_level ?? 10,
        hsn: body.hsn,
        gst_percent: body.gst_percent ?? 18,
        description: body.description,
        status: body.status ?? 'active',
        image_url: body.image_url,
      },
      include: { category: true },
    });
  }

  async update(
    id: string,
    tenantId: string,
    body: Partial<{
      sku: string;
      name: string;
      category_id: string;
      unit: string;
      price: number;
      cost: number;
      stock: number;
      reorder_level: number;
      hsn: string;
      gst_percent: number;
      description: string;
      status: string;
      image_url: string;
    }>,
  ) {
    await this.findOne(id, tenantId);

    return this.prisma.product.update({
      where: { id },
      data: {
        ...body,
        ...(body.price !== undefined ? { price: Number(body.price) } : {}),
        ...(body.cost !== undefined ? { cost: Number(body.cost) } : {}),
        ...(body.gst_percent !== undefined
          ? { gst_percent: Number(body.gst_percent) }
          : {}),
      },
      include: { category: true },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    await this.prisma.product.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { message: 'Product deleted successfully' };
  }

  async forceDelete(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Cannot delete product because related RFQs or quotations exist',
        );
      }
      throw error;
    }

    return { message: 'Product permanently deleted' };
  }

  async uploadImage(id: string, tenantId: string, imageUrl: string) {
    return this.update(id, tenantId, { image_url: imageUrl });
  }

  async exportCsv(
    tenantId: string,
    query: { search?: string; category?: string; status?: string },
  ) {
    const result = await this.findAll(tenantId, { ...query, pageSize: 10000 });

    return recordsToCsv(
      result.data.map((product: any) => ({
        sku: product.sku,
        name: product.name,
        category: product.category.name,
        unit: product.unit,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        reorder_level: product.reorder_level,
        gst_percent: product.gst_percent,
        status: product.status,
      })),
    );
  }
}
