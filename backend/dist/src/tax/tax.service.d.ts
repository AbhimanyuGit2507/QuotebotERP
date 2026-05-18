import { PrismaService } from '../prisma.service';
import { CreateTaxProfileDto } from './dtos/create-tax-profile.dto';
export declare class TaxService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(tenantId: string): Promise<{
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        deleted_at: Date | null;
        type: string;
        is_active: boolean;
        rate: import("@prisma/client-runtime-utils").Decimal;
        hsn_code: string | null;
        is_default: boolean;
    }[]>;
    findOne(id: string, tenantId: string): Promise<{
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        deleted_at: Date | null;
        type: string;
        is_active: boolean;
        rate: import("@prisma/client-runtime-utils").Decimal;
        hsn_code: string | null;
        is_default: boolean;
    }>;
    create(tenantId: string, dto: CreateTaxProfileDto): Promise<{
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        deleted_at: Date | null;
        type: string;
        is_active: boolean;
        rate: import("@prisma/client-runtime-utils").Decimal;
        hsn_code: string | null;
        is_default: boolean;
    }>;
    update(id: string, tenantId: string, dto: Partial<CreateTaxProfileDto>): Promise<{
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        deleted_at: Date | null;
        type: string;
        is_active: boolean;
        rate: import("@prisma/client-runtime-utils").Decimal;
        hsn_code: string | null;
        is_default: boolean;
    }>;
    remove(id: string, tenantId: string): Promise<{
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        deleted_at: Date | null;
        type: string;
        is_active: boolean;
        rate: import("@prisma/client-runtime-utils").Decimal;
        hsn_code: string | null;
        is_default: boolean;
    }>;
    getDefault(tenantId: string): Promise<{
        name: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        deleted_at: Date | null;
        type: string;
        is_active: boolean;
        rate: import("@prisma/client-runtime-utils").Decimal;
        hsn_code: string | null;
        is_default: boolean;
    }>;
    calculateTax(amount: number, taxProfileId: string, tenantId: string, clientId?: string): Promise<{
        cgst: number;
        sgst: number;
        igst: number;
        total_tax: number;
        tax_rate: number;
    }>;
    seedDefaults(tenantId: string): Promise<{
        message: string;
        profiles?: undefined;
    } | {
        message: string;
        profiles: {
            name: string;
            id: string;
            created_at: Date;
            updated_at: Date;
            tenant_id: string;
            deleted_at: Date | null;
            type: string;
            is_active: boolean;
            rate: import("@prisma/client-runtime-utils").Decimal;
            hsn_code: string | null;
            is_default: boolean;
        }[];
    }>;
}
