declare class ParsedItemDto {
    product_name?: string;
    name?: string;
    quantity: number;
    unit?: string;
    notes?: string;
}
export declare class UpdateMessageProcessingStatusDto {
    processing_status: 'pending' | 'parsed' | 'failed';
    parsed_items?: ParsedItemDto[];
    parsing_source?: string;
    parsing_confidence?: string;
    parsing_error?: string;
    rfq_id?: string;
    quotation_id?: string;
    auto_rfq_created?: boolean;
    auto_quotation_created?: boolean;
    force_retry?: boolean;
}
export {};
