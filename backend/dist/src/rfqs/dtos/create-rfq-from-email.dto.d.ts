export declare class CreateRfqFromEmailItemDto {
    product_id?: string;
    product_name?: string;
    name?: string;
    quantity: number;
    unit?: string;
    notes?: string;
}
export declare class CreateRfqFromEmailDto {
    client_email: string;
    message_id: string;
    parsing_confidence?: string;
    parsing_source?: string;
    items: CreateRfqFromEmailItemDto[];
}
