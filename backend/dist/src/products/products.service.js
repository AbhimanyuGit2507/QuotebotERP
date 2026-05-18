"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma.service");
const export_util_1 = require("../common/utils/export.util");
const pagination_util_1 = require("../common/utils/pagination.util");
let ProductsService = class ProductsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId, params) {
        const { skip, take, page, pageSize } = (0, pagination_util_1.parsePaginationParams)(params);
        const { search, category, status } = params;
        const where = {
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
                orderBy: { [params.sortBy || 'created_at']: params.sortOrder || 'desc' },
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
    async getCategories(tenantId) {
        return this.prisma.productCategory.findMany({
            where: { tenant_id: tenantId },
            orderBy: { name: 'asc' },
        });
    }
    async findOne(id, tenantId) {
        const product = await this.prisma.product.findFirst({
            where: { id, tenant_id: tenantId, deleted_at: null },
            include: { category: true },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return product;
    }
    async create(tenantId, body) {
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
    async update(id, tenantId, body) {
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
    async remove(id, tenantId) {
        await this.findOne(id, tenantId);
        await this.prisma.product.update({
            where: { id },
            data: { deleted_at: new Date() },
        });
        return { message: 'Product deleted successfully' };
    }
    async forceDelete(id, tenantId) {
        await this.findOne(id, tenantId);
        try {
            await this.prisma.product.delete({ where: { id } });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2003') {
                throw new common_1.BadRequestException('Cannot delete product because related RFQs or quotations exist');
            }
            throw error;
        }
        return { message: 'Product permanently deleted' };
    }
    async uploadImage(id, tenantId, imageUrl) {
        return this.update(id, tenantId, { image_url: imageUrl });
    }
    async exportCsv(tenantId, query) {
        const result = await this.findAll(tenantId, { ...query, pageSize: 10000 });
        return (0, export_util_1.recordsToCsv)(result.data.map((product) => ({
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
        })));
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map