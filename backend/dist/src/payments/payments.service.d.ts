import { PrismaService } from '../prisma.service';
import { PaginationParams, PaginatedResult } from '../common/utils/pagination.util';
import { RecordPaymentDto } from './dtos/record-payment.dto';
export declare class PaymentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    recordPayment(tenantId: string, dto: RecordPaymentDto): Promise<{
        notes: string | null;
        method: string | null;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        status: string;
        deleted_at: Date | null;
        external_id: string | null;
        invoice_id: string;
        amount: import("@prisma/client-runtime-utils").Decimal;
        payment_method: string | null;
        reference_number: string | null;
        processed_at: Date | null;
    }>;
    findByInvoice(tenantId: string, invoiceId: string): Promise<{
        notes: string | null;
        method: string | null;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        status: string;
        deleted_at: Date | null;
        external_id: string | null;
        invoice_id: string;
        amount: import("@prisma/client-runtime-utils").Decimal;
        payment_method: string | null;
        reference_number: string | null;
        processed_at: Date | null;
    }[]>;
    findAll(tenantId: string, params: PaginationParams): Promise<PaginatedResult<any>>;
    getReceivablesAging(tenantId: string): Promise<{
        current: number;
        days_1_30: number;
        days_31_60: number;
        days_61_90: number;
        days_90_plus: number;
        total: number;
    }>;
}
