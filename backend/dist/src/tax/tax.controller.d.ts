import { TaxService } from './tax.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateTaxProfileDto } from './dtos/create-tax-profile.dto';
import { CalculateTaxDto } from './dtos/calculate-tax.dto';
export declare class TaxController {
    private readonly taxService;
    constructor(taxService: TaxService);
    findAll(user: AuthenticatedUser): Promise<{
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
    findOne(id: string, user: AuthenticatedUser): Promise<{
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
    create(user: AuthenticatedUser, dto: CreateTaxProfileDto): Promise<{
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
    update(id: string, user: AuthenticatedUser, dto: CreateTaxProfileDto): Promise<{
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
    remove(id: string, user: AuthenticatedUser): Promise<{
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
    seedDefaults(user: AuthenticatedUser): Promise<{
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
    calculate(user: AuthenticatedUser, dto: CalculateTaxDto): Promise<{
        cgst: number;
        sgst: number;
        igst: number;
        total_tax: number;
        tax_rate: number;
    }>;
}
