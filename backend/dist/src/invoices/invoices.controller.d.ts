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
            conversation_id: string | null;
            sent_email_subject: string | null;
            sent_email_body: string | null;
            sent_at: Date | null;
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
        conversation_id: string | null;
        sent_email_subject: string | null;
        sent_email_body: string | null;
        sent_at: Date | null;
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
            conversation_id: string | null;
            sent_email_subject: string | null;
            sent_email_body: string | null;
            sent_at: Date | null;
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
        conversation_id: string | null;
        sent_email_subject: string | null;
        sent_email_body: string | null;
        sent_at: Date | null;
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
            conversation_id: string | null;
            sent_email_subject: string | null;
            sent_email_body: string | null;
            sent_at: Date | null;
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
        conversation_id: string | null;
        sent_email_subject: string | null;
        sent_email_body: string | null;
        sent_at: Date | null;
        quotation_id: string | null;
        due_date: string | null;
        paid_amount: number;
    }>;
    getQuotation(req: AuthRequest, id: string): Promise<({
        items: {
            product_name: string;
            quantity: number;
            unit: string;
            notes: string | null;
            id: string;
            total: number;
            quotation_id: string;
            product_id: string;
            unit_price: number;
            tax_percent: number;
            availability: string | null;
            available_quantity: number | null;
        }[];
        client: {
            name: string;
            id: string;
            created_at: Date;
            updated_at: Date;
            email: string;
            tenant_id: string;
            state: string | null;
            tier: string;
            type: string;
            phone: string | null;
            website: string | null;
            address: string | null;
            city: string | null;
            gst: string | null;
            pan: string | null;
            total_orders: number;
            total_value: number;
            last_order_date: Date | null;
        };
    } & {
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
        conversation_id: string | null;
        sent_email_subject: string | null;
        sent_email_body: string | null;
        sent_at: Date | null;
    }) | null>;
    getPurchaseOrders(req: AuthRequest, id: string): Promise<({
        quotation: {
            number: string;
            id: string;
        } | null;
        conversation: {
            id: string;
            customer_name: string | null;
        };
    } & {
        confidence: number | null;
        id: string;
        created_at: Date;
        updated_at: Date;
        tenant_id: string;
        status: import("@prisma/client").$Enums.PurchaseOrderStatus;
        conversation_id: string;
        sent_email_subject: string | null;
        sent_email_body: string | null;
        sent_at: Date | null;
        quotation_id: string | null;
        po_number: string | null;
        invoice_id: string | null;
        extracted_data: import("@prisma/client/runtime/client").JsonValue | null;
    })[]>;
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
