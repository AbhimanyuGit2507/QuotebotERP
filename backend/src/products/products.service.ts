import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { recordsToCsv } from '../common/utils/export.util';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    query: { search?: string; category?: string; status?: string },
  ) {
    const { search, category, status } = query;

    return this.prisma.product.findMany({
      where: {
        tenant_id: tenantId,
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
      },
      include: {
        category: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getCategories(tenantId: string) {
    return this.prisma.productCategory.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenant_id: tenantId },
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

    return { message: 'Product deleted successfully' };
  }

  async uploadImage(id: string, tenantId: string, imageUrl: string) {
    return this.update(id, tenantId, { image_url: imageUrl });
  }

  async exportCsv(
    tenantId: string,
    query: { search?: string; category?: string; status?: string },
  ) {
    const products = await this.findAll(tenantId, query);

    return recordsToCsv(
      products.map((product) => ({
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
