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
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma.service");
const export_util_1 = require("../common/utils/export.util");
const pagination_util_1 = require("../common/utils/pagination.util");
let ClientsService = class ClientsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId, params) {
        const { skip, take, page, pageSize } = (0, pagination_util_1.parsePaginationParams)(params);
        const { search, tier } = params;
        const where = {
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
                orderBy: { [params.sortBy || 'created_at']: params.sortOrder || 'desc' },
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
    async findOne(id, tenantId) {
        const client = await this.prisma.client.findFirst({
            where: { id, tenant_id: tenantId, deleted_at: null },
        });
        if (!client) {
            throw new common_1.NotFoundException('Client not found');
        }
        return client;
    }
    async create(tenantId, body) {
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
    async update(id, tenantId, body) {
        await this.findOne(id, tenantId);
        return this.prisma.client.update({ where: { id }, data: body });
    }
    async remove(id, tenantId) {
        await this.findOne(id, tenantId);
        await this.prisma.client.update({
            where: { id },
            data: { deleted_at: new Date() },
        });
        return { message: 'Client deleted successfully' };
    }
    async forceDelete(id, tenantId) {
        await this.findOne(id, tenantId);
        try {
            await this.prisma.client.delete({ where: { id } });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2003') {
                throw new common_1.BadRequestException('Cannot delete client because related quotations exist');
            }
            throw error;
        }
        return { message: 'Client permanently deleted' };
    }
    async transactions(id, tenantId) {
        await this.findOne(id, tenantId);
        return this.prisma.quotation.findMany({
            where: { client_id: id, tenant_id: tenantId, deleted_at: null },
            orderBy: { created_at: 'desc' },
            include: { items: true },
            take: 10,
        });
    }
    async updateTier(id, tenantId, tier) {
        return this.update(id, tenantId, { tier });
    }
    async exportCsv(tenantId, query) {
        const result = await this.findAll(tenantId, { ...query, pageSize: 10000 });
        return (0, export_util_1.recordsToCsv)(result.data.map((client) => ({
            name: client.name,
            type: client.type,
            email: client.email,
            phone: client.phone,
            city: client.city,
            state: client.state,
            tier: client.tier,
            total_orders: client.total_orders,
            total_value: client.total_value,
        })));
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClientsService);
//# sourceMappingURL=clients.service.js.map