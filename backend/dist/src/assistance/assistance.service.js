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
exports.AssistanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const client_1 = require("@prisma/client");
let AssistanceService = class AssistanceService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(tenantId, filters) {
        return this.prisma.assistanceTicket.findMany({
            where: {
                tenant_id: tenantId,
                ...(filters?.status && {
                    status: filters.status,
                }),
                ...(filters?.type && { type: filters.type }),
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
    async getById(tenantId, ticketId) {
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
            throw new common_1.NotFoundException('Assistance ticket not found');
        }
        return ticket;
    }
    async assign(tenantId, ticketId, userId) {
        const ticket = await this.prisma.assistanceTicket.findFirst({
            where: { id: ticketId, tenant_id: tenantId },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Assistance ticket not found');
        }
        return this.prisma.assistanceTicket.update({
            where: { id: ticketId },
            data: {
                assigned_to_id: userId,
                status: client_1.AssistanceTicketStatus.IN_PROGRESS,
            },
        });
    }
    async resolve(tenantId, ticketId, userId) {
        const ticket = await this.prisma.assistanceTicket.findFirst({
            where: { id: ticketId, tenant_id: tenantId },
        });
        if (!ticket) {
            throw new common_1.NotFoundException('Assistance ticket not found');
        }
        return this.prisma.assistanceTicket.update({
            where: { id: ticketId },
            data: {
                status: client_1.AssistanceTicketStatus.RESOLVED,
                updated_at: new Date(),
            },
        });
    }
};
exports.AssistanceService = AssistanceService;
exports.AssistanceService = AssistanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AssistanceService);
//# sourceMappingURL=assistance.service.js.map