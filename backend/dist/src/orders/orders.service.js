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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const client_1 = require("@prisma/client");
let OrdersService = class OrdersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId, status) {
        return this.prisma.assistancePurchaseOrder.findMany({
            where: {
                tenant_id: tenantId,
                ...(status && { status }),
            },
            include: {
                conversation: {
                    include: {
                        client: true,
                    },
                },
                quotation: {
                    include: {
                        items: true,
                    },
                },
                invoice: {
                    include: {
                        payments: true,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });
    }
    async findOne(tenantId, orderId) {
        const order = await this.prisma.assistancePurchaseOrder.findFirst({
            where: {
                id: orderId,
                tenant_id: tenantId,
            },
            include: {
                conversation: {
                    include: {
                        client: true,
                        messages: {
                            orderBy: {
                                created_at: 'desc',
                            },
                            take: 10,
                        },
                    },
                },
                quotation: {
                    include: {
                        items: true,
                    },
                },
                invoice: {
                    include: {
                        payments: true,
                    },
                },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        return order;
    }
    async updateStatus(tenantId, orderId, status) {
        const order = await this.prisma.assistancePurchaseOrder.findFirst({
            where: {
                id: orderId,
                tenant_id: tenantId,
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        return this.prisma.assistancePurchaseOrder.update({
            where: { id: orderId },
            data: {
                status,
                updated_at: new Date(),
            },
        });
    }
    async generateInvoice(tenantId, orderId) {
        const order = await this.findOne(tenantId, orderId);
        if (!order.quotation) {
            throw new common_1.NotFoundException('No quotation linked to this order. Cannot generate invoice.');
        }
        if (order.invoice_id) {
            throw new Error('Invoice already generated for this order');
        }
        const invoiceCount = await this.prisma.invoice.count({
            where: { tenant_id: tenantId },
        });
        const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`;
        const invoice = await this.prisma.invoice.create({
            data: {
                tenant_id: tenantId,
                quotation_id: order.quotation_id,
                number: invoiceNumber,
                date: new Date().toISOString().split('T')[0],
                currency: 'INR',
                subtotal: order.quotation.subtotal,
                tax: order.quotation.tax || 0,
                total: order.quotation.total,
                status: 'open',
            },
        });
        await this.prisma.assistancePurchaseOrder.update({
            where: { id: orderId },
            data: {
                invoice_id: invoice.id,
                status: client_1.PurchaseOrderStatus.INVOICE_GENERATED,
                updated_at: new Date(),
            },
        });
        return invoice;
    }
    async markInvoiceSent(tenantId, orderId) {
        const order = await this.findOne(tenantId, orderId);
        if (!order.invoice_id) {
            throw new Error('No invoice generated for this order');
        }
        return this.prisma.assistancePurchaseOrder.update({
            where: { id: orderId },
            data: {
                status: client_1.PurchaseOrderStatus.INVOICE_SENT,
                updated_at: new Date(),
            },
        });
    }
    async confirmPayment(tenantId, orderId, paymentDetails) {
        const order = await this.findOne(tenantId, orderId);
        if (!order.invoice_id) {
            throw new Error('No invoice for this order');
        }
        const payment = await this.prisma.payment.create({
            data: {
                tenant_id: tenantId,
                invoice_id: order.invoice_id,
                amount: Number(paymentDetails.amount),
                method: paymentDetails.method,
                external_id: paymentDetails.external_id,
                processed_at: new Date(),
            },
        });
        const invoice = order.invoice;
        if (!invoice) {
            throw new Error('Invoice not found for this order');
        }
        const paid = Number(invoice.paid_amount || 0) + Number(payment.amount);
        const invoiceStatus = paid >= Number(invoice.total) ? 'paid' : 'partial';
        await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                paid_amount: paid,
                status: invoiceStatus,
            },
        });
        const orderStatus = invoiceStatus === 'paid'
            ? client_1.PurchaseOrderStatus.PAID
            : client_1.PurchaseOrderStatus.PAYMENT_PENDING;
        await this.prisma.assistancePurchaseOrder.update({
            where: { id: orderId },
            data: {
                status: orderStatus,
                updated_at: new Date(),
            },
        });
        if (invoiceStatus === 'paid' && order.conversation_id) {
            await this.prisma.conversation.update({
                where: { id: order.conversation_id },
                data: {
                    current_stage: 'PAID',
                    updated_at: new Date(),
                },
            });
        }
        return payment;
    }
    async markCompleted(tenantId, orderId) {
        const order = await this.findOne(tenantId, orderId);
        if (order.status !== client_1.PurchaseOrderStatus.PAID) {
            throw new Error('Order must be paid before marking as completed');
        }
        return this.prisma.assistancePurchaseOrder.update({
            where: { id: orderId },
            data: {
                status: client_1.PurchaseOrderStatus.COMPLETED,
                updated_at: new Date(),
            },
        });
    }
    async cancel(tenantId, orderId, reason) {
        return this.prisma.assistancePurchaseOrder.update({
            where: { id: orderId },
            data: {
                status: client_1.PurchaseOrderStatus.CANCELLED,
                updated_at: new Date(),
            },
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map