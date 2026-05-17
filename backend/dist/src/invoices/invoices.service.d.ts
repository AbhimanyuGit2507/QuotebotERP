import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
export declare class InvoicesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private generateInvoiceNumber;
    create(tenantId: string, payload: {
        quotation_id: string;
        due_date?: string;
        date?: string;
    }): Promise<{
        payments: {
            method: string | null;
            id: string;
            created_at: Date;
            tenant_id: string;
            external_id: string | null;
            invoice_id: string;
            amount: number;
            processed_at: Date | null;
        }[];
        quotation: {
            number: string;
            id: string;
            created_at: Date;
            updated_at: Date;
            tenant_id: string;
            status: string;
            client_id: string;
            display_name: string | null;
            search_tokens: Prisma.JsonValue | null;
            date: string;
            valid_until: string;
            subtotal: number;
            tax: number;
            total: number;
            terms_conditions: string | null;
        } | null;
    } & {
        number: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        status: string;
        currency: string;
        display_name: string | null;
        search_tokens: Prisma.JsonValue | null;
        date: string;
        subtotal: number;
        tax: number;
        total: number;
        quotation_id: string | null;
        due_date: string | null;
        paid_amount: number;
    }>;
    list(tenantId: string, status?: string): Promise<({
        payments: {
            method: string | null;
            id: string;
            created_at: Date;
            tenant_id: string;
            external_id: string | null;
            invoice_id: string;
            amount: number;
            processed_at: Date | null;
        }[];
        quotation: {
            number: string;
            id: string;
            created_at: Date;
            updated_at: Date;
            tenant_id: string;
            status: string;
            client_id: string;
            display_name: string | null;
            search_tokens: Prisma.JsonValue | null;
            date: string;
            valid_until: string;
            subtotal: number;
            tax: number;
            total: number;
            terms_conditions: string | null;
        } | null;
    } & {
        number: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        status: string;
        currency: string;
        display_name: string | null;
        search_tokens: Prisma.JsonValue | null;
        date: string;
        subtotal: number;
        tax: number;
        total: number;
        quotation_id: string | null;
        due_date: string | null;
        paid_amount: number;
    })[]>;
    get(tenantId: string, id: string): Promise<{
        payments: {
            method: string | null;
            id: string;
            created_at: Date;
            tenant_id: string;
            external_id: string | null;
            invoice_id: string;
            amount: number;
            processed_at: Date | null;
        }[];
        quotation: {
            number: string;
            id: string;
            created_at: Date;
            updated_at: Date;
            tenant_id: string;
            status: string;
            client_id: string;
            display_name: string | null;
            search_tokens: Prisma.JsonValue | null;
            date: string;
            valid_until: string;
            subtotal: number;
            tax: number;
            total: number;
            terms_conditions: string | null;
        } | null;
    } & {
        number: string;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        status: string;
        currency: string;
        display_name: string | null;
        search_tokens: Prisma.JsonValue | null;
        date: string;
        subtotal: number;
        tax: number;
        total: number;
        quotation_id: string | null;
        due_date: string | null;
        paid_amount: number;
    }>;
    recordPayment(tenantId: string, invoiceId: string, payload: {
        amount: number;
        method?: string;
        external_id?: string;
        processed_at?: string;
    }): Promise<{
        method: string | null;
        id: string;
        created_at: Date;
        tenant_id: string;
        external_id: string | null;
        invoice_id: string;
        amount: number;
        processed_at: Date | null;
    }>;
}
export default InvoicesService;
