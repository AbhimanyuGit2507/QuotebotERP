import type { Request } from 'express';
import { InvoicesService } from './invoices.service';
type AuthRequest = Request & {
    user?: {
        tenant_id?: string;
    };
};
export declare class InvoicesController {
    private readonly invoicesService;
    constructor(invoicesService: InvoicesService);
    create(req: AuthRequest, body: {
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
            search_tokens: import("@prisma/client/runtime/client").JsonValue | null;
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
        search_tokens: import("@prisma/client/runtime/client").JsonValue | null;
        date: string;
        subtotal: number;
        tax: number;
        total: number;
        quotation_id: string | null;
        due_date: string | null;
        paid_amount: number;
    }>;
    list(req: AuthRequest, status?: string): Promise<({
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
            search_tokens: import("@prisma/client/runtime/client").JsonValue | null;
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
        search_tokens: import("@prisma/client/runtime/client").JsonValue | null;
        date: string;
        subtotal: number;
        tax: number;
        total: number;
        quotation_id: string | null;
        due_date: string | null;
        paid_amount: number;
    })[]>;
    get(req: AuthRequest, id: string): Promise<{
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
            search_tokens: import("@prisma/client/runtime/client").JsonValue | null;
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
        search_tokens: import("@prisma/client/runtime/client").JsonValue | null;
        date: string;
        subtotal: number;
        tax: number;
        total: number;
        quotation_id: string | null;
        due_date: string | null;
        paid_amount: number;
    }>;
    recordPayment(req: AuthRequest, id: string, body: {
        amount: number;
        method?: string;
        external_id?: string;
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
export default InvoicesController;
