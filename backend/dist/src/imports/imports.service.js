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
exports.ImportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let ImportsService = class ImportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    preview(tenantId, payload) {
        if (!payload?.entity || !payload?.rows) {
            throw new common_1.BadRequestException('Invalid import payload');
        }
        switch (payload.entity) {
            case 'clients':
                return this.previewClients(payload.rows);
            case 'products':
                return this.previewProducts(payload.rows);
            default:
                throw new common_1.BadRequestException('Unsupported import entity');
        }
    }
    async commit(tenantId, payload) {
        if (!payload?.entity || !payload?.rows) {
            throw new common_1.BadRequestException('Invalid import payload');
        }
        switch (payload.entity) {
            case 'clients':
                return this.commitClients(tenantId, payload.rows);
            case 'products':
                return this.commitProducts(tenantId, payload.rows);
            default:
                throw new common_1.BadRequestException('Unsupported import entity');
        }
    }
    previewClients(rows) {
        const errors = [];
        const normalizedRows = [];
        rows.forEach((row, index) => {
            const normalized = this.normalizeClientRow(row);
            const rowErrors = [];
            if (!normalized.name) {
                rowErrors.push('Missing client name');
            }
            if (!normalized.email || !this.isValidEmail(normalized.email)) {
                rowErrors.push('Missing or invalid email');
            }
            if (rowErrors.length > 0) {
                errors.push({ rowIndex: index + 1, messages: rowErrors });
            }
            normalizedRows.push(normalized);
        });
        return {
            entity: 'clients',
            totalRows: rows.length,
            validRows: normalizedRows.length - errors.length,
            invalidRows: errors.length,
            errors,
            normalizedRows,
        };
    }
    previewProducts(rows) {
        const errors = [];
        const normalizedRows = [];
        rows.forEach((row, index) => {
            const normalized = this.normalizeProductRow(row);
            const rowErrors = [];
            if (!normalized.sku) {
                rowErrors.push('Missing SKU');
            }
            if (!normalized.name) {
                rowErrors.push('Missing product name');
            }
            if (!normalized.category) {
                rowErrors.push('Missing category');
            }
            if (!normalized.unit) {
                rowErrors.push('Missing unit');
            }
            if (rowErrors.length > 0) {
                errors.push({ rowIndex: index + 1, messages: rowErrors });
            }
            normalizedRows.push(normalized);
        });
        return {
            entity: 'products',
            totalRows: rows.length,
            validRows: normalizedRows.length - errors.length,
            invalidRows: errors.length,
            errors,
            normalizedRows,
        };
    }
    async commitClients(tenantId, rows) {
        const errors = [];
        let created = 0;
        let updated = 0;
        for (let i = 0; i < rows.length; i += 1) {
            const rowIndex = i + 1;
            const normalized = this.normalizeClientRow(rows[i]);
            const rowErrors = [];
            if (!normalized.name) {
                rowErrors.push('Missing client name');
            }
            if (!normalized.email || !this.isValidEmail(normalized.email)) {
                rowErrors.push('Missing or invalid email');
            }
            if (rowErrors.length > 0) {
                errors.push({ rowIndex, messages: rowErrors });
                continue;
            }
            const existing = await this.prisma.client.findFirst({
                where: { tenant_id: tenantId, email: normalized.email },
                select: { id: true },
            });
            await this.prisma.client.upsert({
                where: {
                    tenant_id_email: {
                        tenant_id: tenantId,
                        email: normalized.email,
                    },
                },
                update: {
                    name: normalized.name,
                    type: this.normalizeClientType(normalized.type),
                    phone: normalized.phone || undefined,
                    gst: normalized.gst || undefined,
                    address: normalized.address || undefined,
                    city: normalized.city || undefined,
                    state: normalized.state || undefined,
                    tier: this.normalizeClientTier(normalized.tier),
                },
                create: {
                    tenant_id: tenantId,
                    name: normalized.name,
                    type: this.normalizeClientType(normalized.type),
                    email: normalized.email,
                    phone: normalized.phone || undefined,
                    gst: normalized.gst || undefined,
                    address: normalized.address || undefined,
                    city: normalized.city || undefined,
                    state: normalized.state || undefined,
                    tier: this.normalizeClientTier(normalized.tier),
                },
            });
            if (existing) {
                updated += 1;
            }
            else {
                created += 1;
            }
        }
        return {
            entity: 'clients',
            totalRows: rows.length,
            created,
            updated,
            errors,
        };
    }
    async commitProducts(tenantId, rows) {
        const errors = [];
        let created = 0;
        let updated = 0;
        const categoryCache = new Map();
        for (let i = 0; i < rows.length; i += 1) {
            const rowIndex = i + 1;
            const normalized = this.normalizeProductRow(rows[i]);
            const rowErrors = [];
            if (!normalized.sku) {
                rowErrors.push('Missing SKU');
            }
            if (!normalized.name) {
                rowErrors.push('Missing product name');
            }
            if (!normalized.category) {
                rowErrors.push('Missing category');
            }
            if (!normalized.unit) {
                rowErrors.push('Missing unit');
            }
            if (rowErrors.length > 0) {
                errors.push({ rowIndex, messages: rowErrors });
                continue;
            }
            const categoryId = await this.resolveCategoryId(tenantId, normalized.category, categoryCache);
            const existing = await this.prisma.product.findFirst({
                where: { tenant_id: tenantId, sku: normalized.sku },
                select: { id: true },
            });
            await this.prisma.product.upsert({
                where: {
                    tenant_id_sku: {
                        tenant_id: tenantId,
                        sku: normalized.sku,
                    },
                },
                update: {
                    name: normalized.name,
                    category_id: categoryId,
                    unit: normalized.unit,
                    price: normalized.price ?? 0,
                    cost: normalized.cost ?? 0,
                    stock: normalized.stock ?? 0,
                    reorder_level: normalized.reorder_level ?? 10,
                    hsn: normalized.hsn || undefined,
                    gst_percent: normalized.gst_percent ?? 18,
                    status: this.normalizeStatus(normalized.status),
                },
                create: {
                    tenant_id: tenantId,
                    sku: normalized.sku,
                    name: normalized.name,
                    category_id: categoryId,
                    unit: normalized.unit,
                    price: normalized.price ?? 0,
                    cost: normalized.cost ?? 0,
                    stock: normalized.stock ?? 0,
                    reorder_level: normalized.reorder_level ?? 10,
                    hsn: normalized.hsn || undefined,
                    gst_percent: normalized.gst_percent ?? 18,
                    status: this.normalizeStatus(normalized.status),
                },
            });
            if (existing) {
                updated += 1;
            }
            else {
                created += 1;
            }
        }
        return {
            entity: 'products',
            totalRows: rows.length,
            created,
            updated,
            errors,
        };
    }
    normalizeClientRow(row) {
        return {
            name: this.pickValue(row, ['name', 'clientname', 'customername']),
            email: this.pickValue(row, ['email', 'emailaddress', 'clientemail']),
            type: this.pickValue(row, ['type', 'clienttype', 'customertype']),
            phone: this.pickValue(row, ['phone', 'phonenumber', 'mobile']),
            gst: this.pickValue(row, ['gst', 'gstin']),
            address: this.pickValue(row, ['address', 'billingaddress', 'street']),
            city: this.pickValue(row, ['city', 'town']),
            state: this.pickValue(row, ['state', 'region']),
            tier: this.pickValue(row, ['tier', 'segment']),
        };
    }
    normalizeProductRow(row) {
        return {
            sku: this.pickValue(row, ['sku', 'productcode', 'itemcode']),
            name: this.pickValue(row, ['name', 'productname', 'itemname']),
            category: this.pickValue(row, ['category', 'categoryname', 'group']),
            unit: this.pickValue(row, ['unit', 'uom']),
            price: this.pickNumber(row, ['price', 'unitprice', 'salesprice']),
            cost: this.pickNumber(row, ['cost', 'purchaseprice']),
            stock: this.pickNumber(row, ['stock', 'quantity', 'onhand']),
            reorder_level: this.pickNumber(row, [
                'reorderlevel',
                'reorder_level',
                'minstock',
            ]),
            hsn: this.pickValue(row, ['hsn', 'hsncode']),
            gst_percent: this.pickNumber(row, [
                'gst',
                'gstpercent',
                'gst_percent',
                'tax',
            ]),
            status: this.pickValue(row, ['status']),
        };
    }
    pickValue(row, keys) {
        const normalizedRow = this.normalizeRowKeys(row);
        for (const key of keys) {
            const normalizedKey = this.normalizeHeader(key);
            if (normalizedKey in normalizedRow) {
                const value = normalizedRow[normalizedKey];
                if (value === null || value === undefined) {
                    return '';
                }
                if (typeof value === 'object') {
                    try {
                        return JSON.stringify(value);
                    }
                    catch {
                        return '';
                    }
                }
                if (typeof value === 'string')
                    return value.trim();
                if (typeof value === 'number' || typeof value === 'boolean')
                    return String(value).trim();
                return '';
            }
        }
        return '';
    }
    pickNumber(row, keys) {
        const value = this.pickValue(row, keys);
        if (!value) {
            return undefined;
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    normalizeRowKeys(row) {
        return Object.keys(row).reduce((acc, key) => {
            acc[this.normalizeHeader(key)] = row[key];
            return acc;
        }, {});
    }
    normalizeHeader(value) {
        return value.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    normalizeClientType(type) {
        const normalized = (type || '').toLowerCase();
        if (normalized === 'b2c' || normalized === 'individual') {
            return 'B2C';
        }
        return 'B2B';
    }
    normalizeClientTier(tier) {
        const normalized = (tier || '').toLowerCase();
        if (normalized === 'new') {
            return 'new';
        }
        if (['top', 'vip', 'gold'].includes(normalized)) {
            return 'top';
        }
        return 'regular';
    }
    normalizeStatus(status) {
        const normalized = (status || '').toLowerCase();
        if (normalized === 'inactive') {
            return 'inactive';
        }
        return 'active';
    }
    isValidEmail(value) {
        return /.+@.+\..+/.test(value);
    }
    async resolveCategoryId(tenantId, name, cache) {
        const key = name.trim().toLowerCase();
        if (cache.has(key)) {
            return cache.get(key);
        }
        const category = await this.prisma.productCategory.upsert({
            where: {
                tenant_id_name: {
                    tenant_id: tenantId,
                    name,
                },
            },
            update: {},
            create: { tenant_id: tenantId, name },
        });
        cache.set(key, category.id);
        return category.id;
    }
};
exports.ImportsService = ImportsService;
exports.ImportsService = ImportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ImportsService);
//# sourceMappingURL=imports.service.js.map