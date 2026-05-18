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
const client_1 = require("@prisma/client");
const pdfkit_1 = __importDefault(require("pdfkit"));
const prisma_service_1 = require("../prisma.service");
const email_service_1 = require("../email/email.service");
const email_templates_service_1 = require("../email-templates/email-templates.service");
const export_util_1 = require("../common/utils/export.util");
const pagination_util_1 = require("../common/utils/pagination.util");
let QuotationsService = class QuotationsService {
    prisma;
    emailService;
    emailTemplatesService;
    constructor(prisma, emailService, emailTemplatesService) {
        this.prisma = prisma;
        this.emailService = emailService;
        this.emailTemplatesService = emailTemplatesService;
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
                deleted_at: null,
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
    async findAll(tenantId, params) {
        const { skip, take, page, pageSize } = (0, pagination_util_1.parsePaginationParams)(params);
        const { search, status } = params;
        const where = {
            tenant_id: tenantId,
            deleted_at: null,
            ...(search
                ? {
                    OR: [
                        { number: { contains: search, mode: 'insensitive' } },
                        { display_name: { contains: search, mode: 'insensitive' } },
                        { client: { name: { contains: search, mode: 'insensitive' } } },
                    ],
                }
                : {}),
            ...(status ? { status } : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.quotation.findMany({
                where,
                include: { client: true, items: true, rfq: true },
                orderBy: { [params.sortBy || 'created_at']: params.sortOrder || 'desc' },
                skip,
                take,
            }),
            this.prisma.quotation.count({ where }),
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
        const quotation = await this.prisma.quotation.findFirst({
            where: { id, tenant_id: tenantId, deleted_at: null },
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
                date: body.date ? new Date(body.date) : new Date(),
                valid_until: body.valid_until
                    ? new Date(body.valid_until)
                    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
                ...(body.date ? { date: new Date(body.date) } : {}),
                ...(body.valid_until ? { valid_until: new Date(body.valid_until) } : {}),
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
                await this.prisma.rFQ.update({ where: { id: linkedRfq.id }, data: { deleted_at: new Date() } });
            }
            catch (err) {
                console.warn('Failed to soft-delete linked RFQ:', err.message);
            }
        }
        await this.prisma.quotation.update({ where: { id }, data: { deleted_at: new Date() } });
        return { message: 'Quotation deleted successfully' };
    }
    async duplicate(id, tenantId) {
        const quotation = await this.findOne(id, tenantId);
        return this.create(tenantId, {
            client_id: quotation.client_id,
            date: new Date().toISOString().split('T')[0],
            valid_until: quotation.valid_until
                ? quotation.valid_until.toISOString().split('T')[0]
                : undefined,
            status: 'draft',
            terms_conditions: quotation.terms_conditions ?? undefined,
            items: quotation.items.map((item) => ({
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: Number(item.quantity),
                unit: item.unit,
                unit_price: Number(item.unit_price),
                tax_percent: Number(item.tax_percent),
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
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { company_name: true },
        });
        const template = await this.emailTemplatesService.findByType(tenantId, client_1.EmailTemplateType.QUOTATION_EMAIL);
        const itemDetails = quotation.items
            .map((item, index) => {
            const availabilityStatus = item.availability || 'in_stock';
            const availableQty = Number(item.available_quantity || 0);
            const requestedQty = Number(item.quantity);
            let statusText = '';
            if (availabilityStatus === 'out_of_stock') {
                statusText = ' [OUT OF STOCK]';
            }
            else if (availabilityStatus === 'low_stock') {
                statusText = ` [LIMITED AVAILABILITY: ${availableQty} available]`;
            }
            else if (availabilityStatus === 'not_available') {
                statusText = ' [NOT AVAILABLE]';
            }
            else if (availableQty < requestedQty && availableQty > 0) {
                statusText = ` [PARTIAL AVAILABILITY: ${availableQty}/${requestedQty} available]`;
            }
            return `${index + 1}. ${item.product_name} - Qty: ${Number(item.quantity)} ${item.unit} @ INR ${Number(item.unit_price)}/unit = INR ${Number(item.total)}${statusText}`;
        })
            .join('\n');
        const availabilityWarnings = quotation.items
            .filter(item => {
            const status = item.availability || 'in_stock';
            return status !== 'in_stock' && status !== 'available' && status !== 'not_specified';
        })
            .map((item, index) => {
            const status = item.availability || 'in_stock';
            const availableQty = Number(item.available_quantity || 0);
            const requestedQty = Number(item.quantity);
            let message = '';
            if (status === 'out_of_stock') {
                message = `❌ OUT OF STOCK: ${item.product_name} (Requested: ${requestedQty} ${item.unit})`;
            }
            else if (status === 'not_available') {
                message = `❌ NOT AVAILABLE: ${item.product_name} (Requested: ${requestedQty} ${item.unit})`;
            }
            else if (status === 'low_stock') {
                message = `⚠️  LIMITED AVAILABILITY: ${item.product_name} (Only ${availableQty} ${item.unit} available, requested ${requestedQty})`;
            }
            else if (status === 'insufficient_stock') {
                message = `⚠️  INSUFFICIENT STOCK: ${item.product_name} (Available: ${availableQty}/${requestedQty} ${item.unit})`;
            }
            else {
                message = `ℹ️  STATUS: ${item.product_name} - ${status}`;
            }
            return `${index + 1}. ${message}`;
        })
            .join('\n');
        const stockWarnings = String(quotation.terms_conditions || '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.toLowerCase().includes('stock warning'))
            .map((warning) => `- ${warning}`)
            .join('\n');
        const quotedSubtotal = Number(quotation.subtotal || 0).toLocaleString('en-IN', {
            maximumFractionDigits: 2,
        });
        const quotedTax = Number(quotation.tax || 0).toLocaleString('en-IN', {
            maximumFractionDigits: 2,
        });
        const quotationDateStr = quotation.date instanceof Date
            ? quotation.date.toISOString().split('T')[0]
            : String(quotation.date);
        const validUntilStr = quotation.valid_until instanceof Date
            ? quotation.valid_until.toISOString().split('T')[0]
            : String(quotation.valid_until || '');
        const variables = {
            client_name: quotation.client.name,
            company_name: tenant?.company_name || 'Quotebot',
            quotation_number: quotation.number,
            quotation_date: quotationDateStr,
            valid_until: validUntilStr,
            currency: 'INR',
            subtotal_amount: quotedSubtotal,
            tax_amount: quotedTax,
            total_amount: quotedTotal,
            item_details: itemDetails,
            availability_warnings: availabilityWarnings || '',
            stock_warnings: stockWarnings || '',
            custom_message: (body.message || '').trim(),
        };
        const emailSubject = this.emailTemplatesService.substituteVariables(template.subject_template, variables);
        const emailBody = this.emailTemplatesService.substituteVariables(template.body_template, variables);
        if (emailAccount.provider === 'gmail') {
            const sendResult = await this.emailService.sendNow(tenantId, {
                email_account_id: emailAccount.id,
                to: recipients,
                ...(ccRecipients.length > 0 ? { cc: ccRecipients } : {}),
                subject: emailSubject,
                body: emailBody,
                attachments: [
                    {
                        filename: `quotation-${quotation.number}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf',
                    },
                ],
            });
            await this.prisma.quotation.update({
                where: { id: quotation.id },
                data: {
                    status: 'sent',
                    sent_email_subject: emailSubject,
                    sent_email_body: emailBody,
                    sent_at: new Date(),
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
            subject: emailSubject,
            body: emailBody,
        });
        await this.prisma.quotation.update({
            where: { id: quotation.id },
            data: {
                status: 'sent',
                sent_email_subject: emailSubject,
                sent_email_body: emailBody,
                sent_at: new Date(),
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
                date: new Date(),
                due_date: undefined,
                currency: companySettings?.currency ?? 'INR',
                subtotal: Number(quotation.subtotal) || 0,
                tax: Number(quotation.tax) || 0,
                total: Number(quotation.total) || 0,
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
    async exportCsv(tenantId, params) {
        const result = await this.findAll(tenantId, { ...params, pageSize: 10000 });
        return (0, export_util_1.recordsToCsv)(result.data.map((quotation) => ({
            number: quotation.number,
            client: quotation.client.name,
            date: quotation.date instanceof Date
                ? quotation.date.toISOString().split('T')[0]
                : quotation.date,
            valid_until: quotation.valid_until instanceof Date
                ? quotation.valid_until.toISOString().split('T')[0]
                : quotation.valid_until,
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
        const dateStr = quotation.date instanceof Date
            ? quotation.date.toISOString().split('T')[0]
            : String(quotation.date);
        const validUntilStr = quotation.valid_until instanceof Date
            ? quotation.valid_until.toISOString().split('T')[0]
            : String(quotation.valid_until || '');
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({
                margin: 50,
                size: 'A4',
                bufferPages: true,
            });
            const buffers = [];
            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            const primaryColor = '#2563eb';
            const darkGray = '#1e293b';
            const lightGray = '#64748b';
            const borderColor = '#e2e8f0';
            doc
                .fontSize(24)
                .fillColor(primaryColor)
                .font('Helvetica-Bold')
                .text(tenant?.company_name || 'Quotebot', { align: 'left' });
            doc
                .fontSize(10)
                .fillColor(lightGray)
                .font('Helvetica')
                .text('Quotation', { align: 'left' });
            doc
                .moveTo(50, doc.y + 10)
                .lineTo(545, doc.y + 10)
                .strokeColor(borderColor)
                .lineWidth(1)
                .stroke();
            doc.moveDown(1.5);
            const startY = doc.y;
            doc.fontSize(10).fillColor(darkGray);
            doc.font('Helvetica-Bold').text('Bill To:', 50, startY);
            doc.moveDown(0.3);
            doc.font('Helvetica-Bold').fontSize(11).text(quotation.client.name);
            doc.font('Helvetica').fontSize(9);
            doc.text(quotation.client.email);
            if (quotation.client.phone) {
                doc.text(`Phone: ${quotation.client.phone}`);
            }
            if (quotation.client.gst) {
                doc.text(`GSTIN: ${quotation.client.gst}`);
            }
            const rightX = 350;
            doc.font('Helvetica-Bold').fontSize(10).text('Quotation Number:', rightX, startY);
            doc.font('Helvetica').text(quotation.number, rightX + 110, startY);
            doc.font('Helvetica-Bold').text('Date:', rightX, doc.y + 5);
            doc.font('Helvetica').text(dateStr, rightX + 110, doc.y - 12);
            doc.font('Helvetica-Bold').text('Valid Until:', rightX, doc.y + 5);
            doc.font('Helvetica').text(validUntilStr, rightX + 110, doc.y - 12);
            doc.font('Helvetica-Bold').text('Status:', rightX, doc.y + 5);
            doc.font('Helvetica').fillColor(quotation.status === 'draft' ? '#eab308' :
                quotation.status === 'sent' ? '#3b82f6' :
                    quotation.status === 'accepted' ? '#22c55e' : '#64748b').text(quotation.status.toUpperCase(), rightX + 110, doc.y - 12);
            doc.moveDown(3);
            doc.fillColor(darkGray);
            const tableTop = doc.y;
            const tableLeft = 50;
            const tableWidth = 495;
            doc
                .rect(tableLeft, tableTop, tableWidth, 25)
                .fillColor(primaryColor)
                .fill();
            doc
                .fontSize(9)
                .fillColor('white')
                .font('Helvetica-Bold')
                .text('Item', tableLeft + 5, tableTop + 8, { width: 200 })
                .text('Qty', tableLeft + 210, tableTop + 8, { width: 50, align: 'center' })
                .text('Unit Price', tableLeft + 270, tableTop + 8, { width: 70, align: 'right' })
                .text('Tax %', tableLeft + 350, tableTop + 8, { width: 50, align: 'right' })
                .text('Total', tableLeft + 410, tableTop + 8, { width: 80, align: 'right' });
            let rowTop = tableTop + 30;
            doc.fillColor(darkGray).font('Helvetica');
            quotation.items.forEach((item, index) => {
                const isEven = index % 2 === 0;
                if (isEven) {
                    doc
                        .rect(tableLeft, rowTop - 5, tableWidth, 20)
                        .fillColor('#f8fafc')
                        .fill();
                }
                doc
                    .fontSize(9)
                    .fillColor(darkGray)
                    .text(item.product_name, tableLeft + 5, rowTop, { width: 200, lineBreak: false, ellipsis: true })
                    .text(`${Number(item.quantity)} ${item.unit}`, tableLeft + 210, rowTop, { width: 50, align: 'center' })
                    .text(Number(item.unit_price).toLocaleString('en-IN', { maximumFractionDigits: 2 }), tableLeft + 270, rowTop, { width: 70, align: 'right' })
                    .text(`${Number(item.tax_percent)}%`, tableLeft + 350, rowTop, { width: 50, align: 'right' })
                    .text(Number(item.total).toLocaleString('en-IN', { maximumFractionDigits: 2 }), tableLeft + 410, rowTop, { width: 80, align: 'right' });
                rowTop += 20;
            });
            doc
                .rect(tableLeft, tableTop, tableWidth, rowTop - tableTop)
                .strokeColor(borderColor)
                .lineWidth(1)
                .stroke();
            doc.moveDown(2);
            const summaryTop = rowTop + 20;
            const summaryLeft = tableLeft + 320;
            const summaryWidth = 175;
            doc
                .fontSize(10)
                .font('Helvetica')
                .fillColor(darkGray)
                .text('Subtotal:', summaryLeft, summaryTop, { width: 80 })
                .text(`₹ ${Number(quotation.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, summaryLeft + 80, summaryTop, { width: 95, align: 'right' });
            doc
                .text('Tax/GST:', summaryLeft, doc.y + 5, { width: 80 })
                .text(`₹ ${Number(quotation.tax).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, summaryLeft + 80, doc.y - 12, { width: 95, align: 'right' });
            const totalY = doc.y + 10;
            doc
                .rect(summaryLeft, totalY - 5, summaryWidth, 25)
                .fillColor(primaryColor)
                .fill();
            doc
                .fontSize(12)
                .fillColor('white')
                .font('Helvetica-Bold')
                .text('Total:', summaryLeft + 5, totalY + 3, { width: 80 })
                .text(`₹ ${Number(quotation.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, summaryLeft + 80, totalY + 3, { width: 90, align: 'right' });
            if (quotation.terms_conditions) {
                doc.moveDown(3);
                doc
                    .fontSize(10)
                    .fillColor(darkGray)
                    .font('Helvetica-Bold')
                    .text('Terms & Conditions', 50);
                doc
                    .fontSize(9)
                    .font('Helvetica')
                    .fillColor(lightGray)
                    .text(quotation.terms_conditions, 50, doc.y + 5, {
                    width: 495,
                    align: 'justify',
                });
            }
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                doc
                    .fontSize(8)
                    .fillColor(lightGray)
                    .text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 50, { align: 'center', width: doc.page.width - 100 });
                doc.text(`Generated by ${tenant?.company_name || 'Quotebot'} | ${new Date().toLocaleDateString()}`, 50, doc.page.height - 35, { align: 'center', width: doc.page.width - 100 });
            }
            doc.end();
        });
    }
    async getRelatedPurchaseOrders(quotationId, tenantId) {
        const quotation = await this.prisma.quotation.findFirst({
            where: { id: quotationId, tenant_id: tenantId },
        });
        if (!quotation) {
            throw new common_1.NotFoundException('Quotation not found');
        }
        return this.prisma.assistancePurchaseOrder.findMany({
            where: {
                quotation_id: quotationId,
                tenant_id: tenantId,
            },
            include: {
                conversation: {
                    select: {
                        id: true,
                        customer_name: true,
                    },
                },
                invoice: {
                    select: {
                        id: true,
                        number: true,
                        total: true,
                        status: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async getRelatedInvoices(quotationId, tenantId) {
        const quotation = await this.prisma.quotation.findFirst({
            where: { id: quotationId, tenant_id: tenantId },
        });
        if (!quotation) {
            throw new common_1.NotFoundException('Quotation not found');
        }
        return this.prisma.invoice.findMany({
            where: {
                quotation_id: quotationId,
                tenant_id: tenantId,
            },
            include: {
                quotation: {
                    select: {
                        id: true,
                        number: true,
                    },
                },
                conversation: {
                    select: {
                        id: true,
                        customer_name: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });
    }
};
exports.QuotationsService = QuotationsService;
exports.QuotationsService = QuotationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService,
        email_templates_service_1.EmailTemplatesService])
], QuotationsService);
//# sourceMappingURL=quotations.service.js.map