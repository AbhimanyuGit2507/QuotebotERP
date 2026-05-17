export declare class InboundEmailDto {
    email_account_id: string;
    external_id: string;
    thread_id?: string;
    provider: 'gmail' | 'ses' | 'smtp' | 'forward';
    sender_email: string;
    sender_name?: string;
    subject: string;
    body: string;
    raw_payload?: Record<string, any>;
    received_at?: string;
}
