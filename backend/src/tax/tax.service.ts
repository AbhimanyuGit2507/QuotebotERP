import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTaxProfileDto } from './dtos/create-tax-profile.dto';

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.taxProfile.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        is_active: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const profile = await this.prisma.taxProfile.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
    });
    if (!profile) throw new NotFoundException('Tax profile not found');
    return profile;
  }

  async create(tenantId: string, dto: CreateTaxProfileDto) {
    // If is_default is true, unset any existing default first
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

  async update(id: string, tenantId: string, dto: Partial<CreateTaxProfileDto>) {
    const existing = await this.prisma.taxProfile.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
    });
    if (!existing) throw new NotFoundException('Tax profile not found');

    // If setting as default, unset any existing default first
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

  async remove(id: string, tenantId: string) {
    const existing = await this.prisma.taxProfile.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
    });
    if (!existing) throw new NotFoundException('Tax profile not found');

    return this.prisma.taxProfile.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async getDefault(tenantId: string) {
    const profile = await this.prisma.taxProfile.findFirst({
      where: {
        tenant_id: tenantId,
        is_default: true,
        is_active: true,
        deleted_at: null,
      },
    });
    if (!profile) throw new NotFoundException('No default tax profile found');
    return profile;
  }

  async calculateTax(
    amount: number,
    taxProfileId: string,
    tenantId: string,
    clientId?: string,
  ): Promise<{
    cgst: number;
    sgst: number;
    igst: number;
    total_tax: number;
    tax_rate: number;
  }> {
    const taxProfile = await this.prisma.taxProfile.findFirst({
      where: { id: taxProfileId, tenant_id: tenantId, deleted_at: null },
    });
    if (!taxProfile) throw new NotFoundException('Tax profile not found');

    const rate = Number(taxProfile.rate);

    // Get company GSTIN — prefer the dedicated column, fall back to profile_json.gstin
    const companySettings = await this.prisma.settingsCompany.findUnique({
      where: { tenant_id: tenantId },
    });
    const profileJson = companySettings?.profile_json as Record<string, unknown> | null;
    const companyGstin =
      companySettings?.company_gstin ||
      (typeof profileJson?.gstin === 'string' ? profileJson.gstin : null);

    // Get client GST if clientId provided
    let clientGst: string | null | undefined = null;
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
        // Intra-state: split into CGST + SGST
        cgst = Math.round(((amount * (rate / 2)) / 100) * 100) / 100;
        sgst = Math.round(((amount * (rate / 2)) / 100) * 100) / 100;
      } else {
        // Inter-state: IGST
        igst = Math.round(((amount * rate) / 100) * 100) / 100;
      }
    } else {
      // GSTINs not available, default to IGST
      igst = Math.round(((amount * rate) / 100) * 100) / 100;
    }

    const total_tax = Math.round((cgst + sgst + igst) * 100) / 100;

    return { cgst, sgst, igst, total_tax, tax_rate: rate };
  }

  async seedDefaults(tenantId: string) {
    // Check if any tax profiles already exist for this tenant
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

    const created = await Promise.all(
      defaults.map((d) =>
        this.prisma.taxProfile.create({
          data: {
            tenant_id: tenantId,
            name: d.name,
            type: d.type,
            rate: d.rate,
            is_default: d.is_default,
          },
        }),
      ),
    );

    return { message: 'Default tax profiles created', profiles: created };
  }
}
