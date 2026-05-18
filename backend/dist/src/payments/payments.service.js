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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const pagination_util_1 = require("../common/utils/pagination.util");
let PaymentsService = class PaymentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recordPayment(tenantId, dto) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: dto.invoice_id, tenant_id: tenantId, deleted_at: null },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        return this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
                data: {
                    tenant_id: tenantId,
                    invoice_id: dto.invoice_id,
                    amount: dto.amount,
                    payment_method: dto.payment_method,
                    reference_number: dto.reference_number,
                    notes: dto.notes,
                },
            });
            const newPaidAmount = Number(invoice.paid_amount || 0) + dto.amount;
            const total = Number(invoice.total || 0);
            let paymentStatus;
            if (newPaidAmount >= total) {
                paymentStatus = 'paid';
            }
            else if (newPaidAmount > 0) {
                paymentStatus = 'partial';
            }
            else {
                paymentStatus = 'unpaid';
            }
            await tx.invoice.update({
                where: { id: dto.invoice_id },
                data: {
                    paid_amount: newPaidAmount,
                    payment_status: paymentStatus,
                },
            });
            return payment;
        });
    }
    async findByInvoice(tenantId, invoiceId) {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenant_id: tenantId, deleted_at: null },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Invoice not found');
        return this.prisma.payment.findMany({
            where: {
                tenant_id: tenantId,
                invoice_id: invoiceId,
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async findAll(tenantId, params) {
        const { skip, take, page, pageSize } = (0, pagination_util_1.parsePaginationParams)(params);
        const where = {
            tenant_id: tenantId,
        };
        const [data, total] = await Promise.all([
            this.prisma.payment.findMany({
                where,
                include: { invoice: true },
                orderBy: { [params.sortBy || 'created_at']: params.sortOrder || 'desc' },
                skip,
                take,
            }),
            this.prisma.payment.count({ where }),
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
    async getReceivablesAging(tenantId) {
        const invoices = await this.prisma.invoice.findMany({
            where: {
                tenant_id: tenantId,
                payment_status: { not: 'paid' },
                deleted_at: null,
            },
        });
        const now = new Date();
        const aging = {
            current: 0,
            days_1_30: 0,
            days_31_60: 0,
            days_61_90: 0,
            days_90_plus: 0,
            total: 0,
        };
        for (const invoice of invoices) {
            const amountDue = Number(invoice.total || 0) - Number(invoice.paid_amount || 0);
            const referenceDate = invoice.due_date || invoice.date;
            const diffMs = now.getTime() - new Date(referenceDate).getTime();
            const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (daysOverdue <= 0) {
                aging.current += amountDue;
            }
            else if (daysOverdue <= 30) {
                aging.days_1_30 += amountDue;
            }
            else if (daysOverdue <= 60) {
                aging.days_31_60 += amountDue;
            }
            else if (daysOverdue <= 90) {
                aging.days_61_90 += amountDue;
            }
            else {
                aging.days_90_plus += amountDue;
            }
            aging.total += amountDue;
        }
        aging.current = Math.round(aging.current * 100) / 100;
        aging.days_1_30 = Math.round(aging.days_1_30 * 100) / 100;
        aging.days_31_60 = Math.round(aging.days_31_60 * 100) / 100;
        aging.days_61_90 = Math.round(aging.days_61_90 * 100) / 100;
        aging.days_90_plus = Math.round(aging.days_90_plus * 100) / 100;
        aging.total = Math.round(aging.total * 100) / 100;
        return aging;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map