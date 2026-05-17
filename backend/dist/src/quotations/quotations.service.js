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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotationsService = void 0;
const common_1 = require("@nestjs/common");
const pdfkit_1 = __importDefault(require("pdfkit"));
const prisma_service_1 = require("../prisma.service");
const email_service_1 = require("../email/email.service");
const export_util_1 = require("../common/utils/export.util");
let QuotationsService = class QuotationsService {
    prisma;
    emailService;
    constructor(prisma, emailService) {
        this.prisma = prisma;
        this.emailService = emailService;
    }
    formatShortDate(d = new Date()) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(-2);
        return `${dd}/${mm}/${yy}`;
    }
    buildDisplayAndTokens(prefix, clientName, itemNames) {
        const date = this.formatShortDate();
        const clientShort = (clientName || '')
            .split(/\s+/)
            .slice(0, 3)
            .join(' ')
            .slice(0, 30);
        const items = (itemNames || [])
            .slice(0, 5)
            .map((s) => String(s || '').trim())
            .filter(Boolean);
        const display = `${prefix} - ${date} - ${clientShort}${items.length ? ' - ' + items.join(', ') : ''}`;
        const tokens = [date, clientShort, ...items];
        return { display, tokens };
    }
    async ensureClientHasRfq(tenantId, clientId) {
        const rfqCount = await this.prisma.rFQ.count({
            where: {
                tenant_id: tenantId,
                client_id: clientId,
            },
        });
        if (rfqCount === 0) {
            throw new common_1.BadRequestException('Quotation client must be linked to at least one RFQ');
        }
    }
    generateNumber() {
        const year = new Date().getFullYear();
        const ts = Date.now().toString().slice(-6);
        const rand = Math.floor(100 + Math.random() * 900);
        return `QT/${year}-${year + 1}/${ts}${rand}`;
    }
    computeTotals(items) {
        const subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
        const tax = items.reduce((sum, item) => sum +
            Number(item.quantity) *
                Number(item.unit_price) *
                (Number(item.tax_percent) / 100), 0);
        return {
            subtotal,
            tax,
            total: subtotal + tax,
        };
    }
    async createVersion(quotationId) {
        const quotation = await this.prisma.quotation.findUnique({
            where: { id: quotationId },
            include: { items: true, client: true },
        });
        if (!quotation) {
            return;
        }
        const latestVersion = await this.prisma.quotationVersion.findFirst({
            where: { quotation_id: quotationId },
            orderBy: { version_number: 'desc' },
        });
        await this.prisma.quotationVersion.create({
            data: {
                quotation_id: quotationId,
                version_number: (latestVersion?.version_number ?? 0) + 1,
                snapshot_json: JSON.stringify(quotation),
            },
        });
    }
    async findAll(tenantId, query) {
        const { search, status } = query;
        return this.prisma.quotation.findMany({
            where: {
                tenant_id: tenantId,
                ...(search
                    ? {
                        OR: [
                            { number: { contains: search, mode: 'insensitive' } },
                            { client: { name: { contains: search, mode: 'insensitive' } } },
                        ],
                    }
                    : {}),
                ...(status ? { status } : {}),
            },
            include: { client: true, items: true, rfq: true },
            orderBy: { created_at: 'desc' },
        });
    }
    async findOne(id, tenantId) {
        const quotation = await this.prisma.quotation.findFirst({
            where: { id, tenant_id: tenantId },
            include: { client: true, items: true, versions: true, rfq: true },
        });
        if (!quotation) {
            throw new common_1.NotFoundException('Quotation not found');
        }
        return quotation;
    }
    async create(tenantId, body) {
        await this.ensureClientHasRfq(tenantId, body.client_id);
        const number = this.generateNumber();
        const items = body.items ?? [];
        const totals = this.computeTotals(items);
        const client = await this.prisma.client.findFirst({
            where: { id: body.client_id, tenant_id: tenantId },
            select: { name: true },
        });
        const itemNames = items.map((i) => i.product_name || '');
        const { display, tokens } = this.buildDisplayAndTokens('QT', client?.name || '', itemNames);
        const quotation = await this.prisma.quotation.create({
            data: {
                tenant_id: tenantId,
                number,
                display_name: display,
                search_tokens: tokens,
                client_id: body.client_id,
                date: body.date ?? new Date().toISOString().split('T')[0],
                valid_until: body.valid_until ??
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split('T')[0],
                status: body.status ?? 'draft',
                terms_conditions: body.terms_conditions,
                subtotal: totals.subtotal,
                tax: totals.tax,
                total: totals.total,
                items: items.length
                    ? {
                        createMany: {
                            data: items.map((item) => ({
                                product_id: item.product_id,
                                product_name: item.product_name,
                                quantity: Number(item.quantity),
                                unit: item.unit,
                                unit_price: Number(item.unit_price),
                                tax_percent: Number(item.tax_percent),
                                total: Number(item.quantity) *
                                    Number(item.unit_price) *
                                    (1 + Number(item.tax_percent) / 100),
                                notes: item.notes ?? undefined,
                                availability: item.availability ?? undefined,
                                available_quantity: item.available_quantity ?? undefined,
                            })),
                        },
                    }
                    : undefined,
            },
            include: { client: true, items: true, rfq: true },
        });
        await this.createVersion(quotation.id);
        const updated = await this.prisma.quotation.findUnique({
            where: { id: quotation.id },
            include: { client: true, items: true, rfq: true, versions: true },
        });
        return updated || quotation;
    }
    async update(id, tenantId, body) {
        await this.findOne(id, tenantId);
        if (body.client_id) {
            await this.ensureClientHasRfq(tenantId, body.client_id);
        }
        if (body.items) {
            await this.prisma.quotationItem.deleteMany({
                where: { quotation_id: id },
            });
        }
        const totals = body.items ? this.computeTotals(body.items) : undefined;
        const quotation = await this.prisma.quotation.update({
            where: { id },
            data: {
                ...(body.client_id ? { client_id: body.client_id } : {}),
                ...(body.date ? { date: body.date } : {}),
                ...(body.valid_until ? { valid_until: body.valid_until } : {}),
                ...(body.status ? { status: body.status } : {}),
                ...(body.terms_conditions !== undefined
                    ? { terms_conditions: body.terms_conditions }
                    : {}),
                ...(totals
                    ? {
                        subtotal: totals.subtotal,
                        tax: totals.tax,
                        total: totals.total,
                    }
                    : {}),
                ...(body.items
                    ? {
                        items: {
                            createMany: {
                                data: body.items.map((item) => ({
                                    product_id: item.product_id,
                                    product_name: item.product_name,
                                    quantity: Number(item.quantity),
                                    unit: item.unit,
                                    unit_price: Number(item.unit_price),
                                    tax_percent: Number(item.tax_percent),
                                    total: Number(item.quantity) *
                                        Number(item.unit_price) *
                                        (1 + Number(item.tax_percent) / 100),
                                    notes: item.notes ?? undefined,
                                    availability: item.availability ?? undefined,
                                    available_quantity: item.available_quantity ?? undefined,
                                })),
                            },
                        },
                    }
                    : {}),
            },
            include: { client: true, items: true, versions: true, rfq: true },
        });
        await this.createVersion(id);
        const refreshed = await this.prisma.quotation.findUnique({
            where: { id },
            include: { client: true, items: true, versions: true, rfq: true },
        });
        if (refreshed) {
            const itemNames = refreshed.items.map((i) => i.product_name);
            const { display, tokens } = this.buildDisplayAndTokens('QT', refreshed.client?.name || '', itemNames);
            await this.prisma.quotation.update({
                where: { id },
                data: {
                    display_name: display,
                    search_tokens: tokens,
                },
            });
            return await this.findOne(id, tenantId);
        }
        return quotation;
    }
    async remove(id, tenantId, options) {
        const quotation = await this.findOne(id, tenantId);
        const linkedRfq = await this.prisma.rFQ.findFirst({
            where: {
                quotation_id: quotation.id,
                tenant_id: tenantId,
            },
        });
        if (linkedRfq && !options?.forceDeleteLinkedRfq) {
            throw new common_1.BadRequestException(`Quotation has a linked RFQ (${linkedRfq.id}). To delete both, call remove with { forceDeleteLinkedRfq: true }`);
        }
        if (linkedRfq && options?.forceDeleteLinkedRfq) {
            try {
                await this.prisma.rFQ.delete({ where: { id: linkedRfq.id } });
            }
            catch (err) {
                console.warn('Failed to delete linked RFQ:', err.message);
            }
        }
        await this.prisma.quotation.delete({ where: { id } });
        return { message: 'Quotation deleted successfully' };
    }
    async duplicate(id, tenantId) {
        const quotation = await this.findOne(id, tenantId);
        return this.create(tenantId, {
            client_id: quotation.client_id,
            date: new Date().toISOString().split('T')[0],
            valid_until: quotation.valid_until,
            status: 'draft',
            terms_conditions: quotation.terms_conditions ?? undefined,
            items: quotation.items.map((item) => ({
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit: item.unit,
                unit_price: item.unit_price,
                tax_percent: item.tax_percent,
            })),
        });
    }
    async sendByEmail(id, tenantId, body) {
        const quotation = await this.findOne(id, tenantId);
        const recipients = (body.to || []).filter((email) => typeof email === 'string' && email.trim().length > 0);
        if (recipients.length === 0 && quotation.client.email) {
            recipients.push(quotation.client.email);
        }
        if (recipients.length === 0) {
            throw new common_1.BadRequestException('No valid recipient email provided');
        }
        const ccRecipients = (body.cc || []).filter((email) => typeof email === 'string' && email.trim().length > 0);
        const emailAccount = body.email_account_id
            ? await this.prisma.emailAccount.findFirst({
                where: {
                    id: body.email_account_id,
                    tenant_id: tenantId,
                    is_active: true,
                },
                select: { id: true, provider: true },
            })
            : await this.prisma.emailAccount.findFirst({
                where: {
                    tenant_id: tenantId,
                    is_active: true,
                },
                orderBy: [{ created_at: 'asc' }],
                select: { id: true, provider: true },
            });
        if (!emailAccount) {
            throw new common_1.BadRequestException('No active email account connected for this tenant');
        }
        const pdfBuffer = await this.generatePdfBuffer(quotation.id, tenantId);
        const quotedTotal = Number(quotation.total || 0).toLocaleString('en-IN', {
            maximumFractionDigits: 2,
        });
        const stockWarnings = String(quotation.terms_conditions || '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.toLowerCase().includes('stock warning'));
        const customMessage = (body.message || '').trim();
        const lines = [
            `Dear ${quotation.client.name},`,
            '',
            ...(customMessage ? [customMessage, ''] : []),
            `Please find quotation ${quotation.number} and the attached invoice PDF in your Quotebot workflow.`,
            '',
            `Quotation Number: ${quotation.number}`,
            `Date: ${quotation.date}`,
            `Valid Until: ${quotation.valid_until}`,
            `Total: INR ${quotedTotal}`,
            ...(stockWarnings.length
                ? [
                    '',
                    'Stock / fulfillment notes:',
                    '',
                    ...stockWarnings.map((note) => `- ${note}`),
                ]
                : []),
            '',
            'Regards,',
            'Quotebot Sales Team',
        ];
        if (emailAccount.provider === 'gmail') {
            const sendResult = await this.emailService.sendNow(tenantId, {
                email_account_id: emailAccount.id,
                to: recipients,
                ...(ccRecipients.length > 0 ? { cc: ccRecipients } : {}),
                subject: `Quotation ${quotation.number}`,
                body: lines.join('\n'),
                attachments: [
                    {
                        filename: `invoice-${quotation.number}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf',
                    },
                ],
            });
            await this.prisma.quotation.update({
                where: { id: quotation.id },
                data: {
                    status: 'sent',
                },
            });
            return {
                success: true,
                quotation_id: quotation.id,
                quotation_number: quotation.number,
                outbound_email_id: sendResult.outbound_id,
                queued: false,
                recipients,
                cc: ccRecipients,
            };
        }
        const outbound = await this.emailService.createOutboundEmail(tenantId, {
            email_account_id: emailAccount.id,
            to: recipients,
            ...(ccRecipients.length > 0 ? { cc: ccRecipients } : {}),
            subject: `Quotation ${quotation.number}`,
            body: lines.join('\n'),
        });
        await this.prisma.quotation.update({
            where: { id: quotation.id },
            data: {
                status: 'sent',
            },
        });
        return {
            success: true,
            quotation_id: quotation.id,
            quotation_number: quotation.number,
            outbound_email_id: outbound.id,
            queued: true,
            recipients,
            cc: ccRecipients,
        };
    }
    async updateStatus(id, tenantId, status) {
        const quotation = await this.update(id, tenantId, { status });
        if (['approved', 'accepted'].includes(status)) {
            try {
                const invoice = await this.createInvoiceFromQuotation(quotation.id, tenantId);
                return { ...quotation, invoice };
            }
            catch (err) {
                console.warn('Failed to create invoice for quotation:', err.message);
                return quotation;
            }
        }
        return quotation;
    }
    generateInvoiceNumber() {
        const year = new Date().getFullYear();
        const ts = Date.now().toString().slice(-6);
        const rand = Math.floor(100 + Math.random() * 900);
        return `INV/${year}-${ts}${rand}`;
    }
    async createInvoiceFromQuotation(quotationId, tenantId) {
        const quotation = await this.findOne(quotationId, tenantId);
        if (!quotation) {
            throw new common_1.NotFoundException('Quotation not found for invoice creation');
        }
        const companySettings = await this.prisma.settingsCompany.findUnique({
            where: { tenant_id: tenantId },
        });
        const number = this.generateInvoiceNumber();
        const invoice = await this.prisma.invoice.create({
            data: {
                tenant_id: tenantId,
                quotation_id: quotation.id,
                number,
                date: new Date().toISOString().split('T')[0],
                due_date: undefined,
                currency: companySettings?.currency ?? 'INR',
                subtotal: quotation.subtotal ?? 0,
                tax: quotation.tax ?? 0,
                total: quotation.total ?? 0,
                status: 'open',
            },
        });
        return invoice;
    }
    async getPrintable(id, tenantId) {
        const quotation = await this.findOne(id, tenantId);
        return {
            message: 'Printable quotation payload generated',
            quotation,
        };
    }
    async exportCsv(tenantId, query) {
        const quotations = await this.findAll(tenantId, query);
        return (0, export_util_1.recordsToCsv)(quotations.map((quotation) => ({
            number: quotation.number,
            client: quotation.client.name,
            date: quotation.date,
            valid_until: quotation.valid_until,
            status: quotation.status,
            subtotal: quotation.subtotal,
            tax: quotation.tax,
            total: quotation.total,
            item_count: quotation.items.length,
        })));
    }
    async generatePdfBuffer(id, tenantId) {
        const quotation = await this.findOne(id, tenantId);
        const company = await this.prisma.settingsCompany.findUnique({
            where: { tenant_id: tenantId },
        });
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { company_name: true },
        });
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 40 });
            const buffers = [];
            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            doc.fontSize(20).text(`${tenant?.company_name || 'Quotebot'} Invoice`, {
                align: 'center',
            });
            doc.moveDown();
            if (company?.logo_url) {
                doc
                    .fontSize(10)
                    .fillColor('#64748b')
                    .text(`Logo / branding: ${company.logo_url}`, { align: 'center' });
                doc.fillColor('#000000');
                doc.moveDown(0.25);
            }
            doc.fontSize(12).text(`Quotation No: ${quotation.number}`);
            doc.text(`Date: ${quotation.date}`);
            doc.text(`Valid Until: ${quotation.valid_until}`);
            doc.text(`Status: ${quotation.status}`);
            doc.moveDown();
            doc.fontSize(14).text('Client Details');
            doc.fontSize(12).text(`Name: ${quotation.client.name}`);
            doc.text(`Email: ${quotation.client.email}`);
            doc.text(`Phone: ${quotation.client.phone ?? '-'}`);
            doc.text(`GST: ${quotation.client.gst ?? '-'}`);
            doc.moveDown();
            doc.fontSize(14).text('Items');
            doc.moveDown(0.5);
            quotation.items.forEach((item, index) => {
                doc
                    .fontSize(12)
                    .text(`${index + 1}. ${item.product_name} | Qty: ${item.quantity} ${item.unit} | Price: ${item.unit_price} | Tax: ${item.tax_percent}% | Total: ${item.total}`);
            });
            doc.moveDown();
            doc.fontSize(14).text('Summary');
            doc.fontSize(12).text(`Subtotal: ${quotation.subtotal.toFixed(2)}`);
            doc.text(`Tax: ${quotation.tax.toFixed(2)}`);
            doc.text(`Total: ${quotation.total.toFixed(2)}`);
            if (quotation.terms_conditions) {
                doc.moveDown();
                doc.fontSize(14).text('Terms & Conditions');
                doc.fontSize(12).text(quotation.terms_conditions);
            }
            doc.end();
        });
    }
};
exports.QuotationsService = QuotationsService;
exports.QuotationsService = QuotationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService])
], QuotationsService);
//# sourceMappingURL=quotations.service.js.map