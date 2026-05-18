import { PaymentsService } from './payments.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { RecordPaymentDto } from './dtos/record-payment.dto';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    recordPayment(user: AuthenticatedUser, dto: RecordPaymentDto): Promise<{
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
    findAll(user: AuthenticatedUser, page?: string, pageSize?: string, sortBy?: string, sortOrder?: string): Promise<import("../common/utils/pagination.util").PaginatedResult<any>>;
    getReceivablesAging(user: AuthenticatedUser): Promise<{
        current: number;
        days_1_30: number;
        days_31_60: number;
        days_61_90: number;
        days_90_plus: number;
        total: number;
    }>;
    findByInvoice(invoiceId: string, user: AuthenticatedUser): Promise<{
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
}
