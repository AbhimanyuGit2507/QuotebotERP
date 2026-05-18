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
exports.TaxService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let TaxService = class TaxService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId) {
        return this.prisma.taxProfile.findMany({
            where: {
                tenant_id: tenantId,
                deleted_at: null,
                is_active: true,
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async findOne(id, tenantId) {
        const profile = await this.prisma.taxProfile.findFirst({
            where: { id, tenant_id: tenantId, deleted_at: null },
        });
        if (!profile)
            throw new common_1.NotFoundException('Tax profile not found');
        return profile;
    }
    async create(tenantId, dto) {
        if (dto.is_default) {
            await this.prisma.taxProfile.updateMany({
                where: { tenant_id: tenantId, is_default: true, deleted_at: null },
                data: { is_default: false },
            });
        }
        return this.prisma.taxProfile.create({
            data: {
                tenant_id: tenantId,
                name: dto.name,
                type: dto.type,
                rate: dto.rate,
                hsn_code: dto.hsn_code,
                is_default: dto.is_default ?? false,
            },
        });
    }
    async update(id, tenantId, dto) {
        const existing = await this.prisma.taxProfile.findFirst({
            where: { id, tenant_id: tenantId, deleted_at: null },
        });
        if (!existing)
            throw new common_1.NotFoundException('Tax profile not found');
        if (dto.is_default) {
            await this.prisma.taxProfile.updateMany({
                where: {
                    tenant_id: tenantId,
                    is_default: true,
                    deleted_at: null,
                    id: { not: id },
                },
                data: { is_default: false },
            });
        }
        return this.prisma.taxProfile.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.type !== undefined && { type: dto.type }),
                ...(dto.rate !== undefined && { rate: dto.rate }),
                ...(dto.hsn_code !== undefined && { hsn_code: dto.hsn_code }),
                ...(dto.is_default !== undefined && { is_default: dto.is_default }),
            },
        });
    }
    async remove(id, tenantId) {
        const existing = await this.prisma.taxProfile.findFirst({
            where: { id, tenant_id: tenantId, deleted_at: null },
        });
        if (!existing)
            throw new common_1.NotFoundException('Tax profile not found');
        return this.prisma.taxProfile.update({
            where: { id },
            data: { deleted_at: new Date() },
        });
    }
    async getDefault(tenantId) {
        const profile = await this.prisma.taxProfile.findFirst({
            where: {
                tenant_id: tenantId,
                is_default: true,
                is_active: true,
                deleted_at: null,
            },
        });
        if (!profile)
            throw new common_1.NotFoundException('No default tax profile found');
        return profile;
    }
    async calculateTax(amount, taxProfileId, tenantId, clientId) {
        const taxProfile = await this.prisma.taxProfile.findFirst({
            where: { id: taxProfileId, tenant_id: tenantId, deleted_at: null },
        });
        if (!taxProfile)
            throw new common_1.NotFoundException('Tax profile not found');
        const rate = Number(taxProfile.rate);
        const companySettings = await this.prisma.settingsCompany.findUnique({
            where: { tenant_id: tenantId },
        });
        const companyGstin = companySettings?.company_gstin;
        let clientGst = null;
        if (clientId) {
            const client = await this.prisma.client.findFirst({
                where: { id: clientId, tenant_id: tenantId },
            });
            clientGst = client?.gst;
        }
        let cgst = 0;
        let sgst = 0;
        let igst = 0;
        if (companyGstin && clientGst && companyGstin.length >= 2 && clientGst.length >= 2) {
            const companyState = companyGstin.substring(0, 2);
            const clientState = clientGst.substring(0, 2);
            if (companyState === clientState) {
                cgst = Math.round(((amount * (rate / 2)) / 100) * 100) / 100;
                sgst = Math.round(((amount * (rate / 2)) / 100) * 100) / 100;
            }
            else {
                igst = Math.round(((amount * rate) / 100) * 100) / 100;
            }
        }
        else {
            igst = Math.round(((amount * rate) / 100) * 100) / 100;
        }
        const total_tax = Math.round((cgst + sgst + igst) * 100) / 100;
        return { cgst, sgst, igst, total_tax, tax_rate: rate };
    }
    async seedDefaults(tenantId) {
        const existing = await this.prisma.taxProfile.findFirst({
            where: { tenant_id: tenantId, deleted_at: null },
        });
        if (existing) {
            return { message: 'Tax profiles already exist for this tenant' };
        }
        const defaults = [
            { name: 'GST 28%', type: 'GST', rate: 28, is_default: false },
            { name: 'GST 18%', type: 'GST', rate: 18, is_default: true },
            { name: 'GST 12%', type: 'GST', rate: 12, is_default: false },
            { name: 'GST 5%', type: 'GST', rate: 5, is_default: false },
            { name: 'GST Exempt (0%)', type: 'GST', rate: 0, is_default: false },
        ];
        const created = await Promise.all(defaults.map((d) => this.prisma.taxProfile.create({
            data: {
                tenant_id: tenantId,
                name: d.name,
                type: d.type,
                rate: d.rate,
                is_default: d.is_default,
            },
        })));
        return { message: 'Default tax profiles created', profiles: created };
    }
};
exports.TaxService = TaxService;
exports.TaxService = TaxService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TaxService);
//# sourceMappingURL=tax.service.js.map