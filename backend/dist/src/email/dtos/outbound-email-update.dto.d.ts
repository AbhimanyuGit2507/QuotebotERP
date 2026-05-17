export declare class OutboundEmailUpdateDto {
    status: 'sent' | 'failed';
    provider?: string;
    last_error?: string;
    attempts?: number;
}
