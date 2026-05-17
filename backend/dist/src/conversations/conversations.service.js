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
exports.ConversationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const client_1 = require("@prisma/client");
let ConversationsService = class ConversationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async close(tenantId, conversationId, reason) {
        const conversation = await this.prisma.conversation.findFirst({
            where: { id: conversationId, tenant_id: tenantId },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        return this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                status: 'closed',
                current_stage: client_1.ConversationStage.CLOSED,
                updated_at: new Date(),
            },
        });
    }
    async reopen(tenantId, conversationId) {
        const conversation = await this.prisma.conversation.findFirst({
            where: { id: conversationId, tenant_id: tenantId },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        return this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                status: 'open',
                current_stage: client_1.ConversationStage.FOLLOWUP_PENDING,
                updated_at: new Date(),
            },
        });
    }
    async list(tenantId, filters) {
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
    async getById(tenantId, conversationId) {
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
            throw new common_1.NotFoundException('Conversation not found');
        }
        return conversation;
    }
};
exports.ConversationsService = ConversationsService;
exports.ConversationsService = ConversationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConversationsService);
//# sourceMappingURL=conversations.service.js.map