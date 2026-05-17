import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type ImportEntity = 'clients' | 'products';

interface ImportPreviewRequest {
  entity: ImportEntity;
  rows: Array<Record<string, unknown>>;
}

interface ImportCommitRequest {
  entity: ImportEntity;
  rows: Array<Record<string, unknown>>;
}

type ImportError = { rowIndex: number; messages: string[] };

type ClientRow = {
  name: string;
  email: string;
  type?: string;
  phone?: string;
  gst?: string;
  address?: string;
  city?: string;
  state?: string;
  tier?: string;
};

type ProductRow = {
  sku: string;
  name: string;
  category: string;
  unit: string;
  price?: number;
  cost?: number;
  stock?: number;
  reorder_level?: number;
  hsn?: string;
  gst_percent?: number;
  status?: string;
};

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  preview(tenantId: string, payload: ImportPreviewRequest) {
    if (!payload?.entity || !payload?.rows) {
      throw new BadRequestException('Invalid import payload');
    }

    switch (payload.entity) {
      case 'clients':
        return this.previewClients(payload.rows);
      case 'products':
        return this.previewProducts(payload.rows);
      default:
        throw new BadRequestException('Unsupported import entity');
    }
  }

  async commit(tenantId: string, payload: ImportCommitRequest) {
    if (!payload?.entity || !payload?.rows) {
      throw new BadRequestException('Invalid import payload');
    }

    switch (payload.entity) {
      case 'clients':
        return this.commitClients(tenantId, payload.rows);
      case 'products':
        return this.commitProducts(tenantId, payload.rows);
      default:
        throw new BadRequestException('Unsupported import entity');
    }
  }

  private previewClients(rows: Array<Record<string, unknown>>) {
    const errors: ImportError[] = [];
    const normalizedRows: ClientRow[] = [];

    rows.forEach((row, index) => {
      const normalized = this.normalizeClientRow(row);
      const rowErrors: string[] = [];

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

  private previewProducts(rows: Array<Record<string, unknown>>) {
    const errors: ImportError[] = [];
    const normalizedRows: ProductRow[] = [];

    rows.forEach((row, index) => {
      const normalized = this.normalizeProductRow(row);
      const rowErrors: string[] = [];

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

  private async commitClients(
    tenantId: string,
    rows: Array<Record<string, unknown>>,
  ) {
    const errors: ImportError[] = [];
    let created = 0;
    let updated = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const rowIndex = i + 1;
      const normalized = this.normalizeClientRow(rows[i]);
      const rowErrors: string[] = [];

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
      } else {
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

  private async commitProducts(
    tenantId: string,
    rows: Array<Record<string, unknown>>,
  ) {
    const errors: ImportError[] = [];
    let created = 0;
    let updated = 0;
    const categoryCache = new Map<string, string>();

    for (let i = 0; i < rows.length; i += 1) {
      const rowIndex = i + 1;
      const normalized = this.normalizeProductRow(rows[i]);
      const rowErrors: string[] = [];

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

      const categoryId = await this.resolveCategoryId(
        tenantId,
        normalized.category,
        categoryCache,
      );

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
      } else {
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

  private normalizeClientRow(row: Record<string, unknown>): ClientRow {
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

  private normalizeProductRow(row: Record<string, unknown>): ProductRow {
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

  private pickValue(row: Record<string, unknown>, keys: string[]) {
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
          } catch {
            return '';
          }
        }
        if (typeof value === 'string') return value.trim();
        if (typeof value === 'number' || typeof value === 'boolean')
          return String(value).trim();
        return '';
      }
    }
    return '';
  }

  private pickNumber(row: Record<string, unknown>, keys: string[]) {
    const value = this.pickValue(row, keys);
    if (!value) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private normalizeRowKeys(row: Record<string, unknown>) {
    return Object.keys(row).reduce<Record<string, unknown>>((acc, key) => {
      acc[this.normalizeHeader(key)] = row[key];
      return acc;
    }, {});
  }

  private normalizeHeader(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private normalizeClientType(type?: string) {
    const normalized = (type || '').toLowerCase();
    if (normalized === 'b2c' || normalized === 'individual') {
      return 'B2C';
    }
    return 'B2B';
  }

  private normalizeClientTier(tier?: string) {
    const normalized = (tier || '').toLowerCase();
    if (normalized === 'new') {
      return 'new';
    }
    if (['top', 'vip', 'gold'].includes(normalized)) {
      return 'top';
    }
    return 'regular';
  }

  private normalizeStatus(status?: string) {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'inactive') {
      return 'inactive';
    }
    return 'active';
  }

  private isValidEmail(value: string) {
    return /.+@.+\..+/.test(value);
  }

  private async resolveCategoryId(
    tenantId: string,
    name: string,
    cache: Map<string, string>,
  ) {
    const key = name.trim().toLowerCase();
    if (cache.has(key)) {
      return cache.get(key) as string;
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
}
