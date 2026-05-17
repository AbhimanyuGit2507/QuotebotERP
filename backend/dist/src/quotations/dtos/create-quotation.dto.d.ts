import { QuotationItemDto } from './quotation-item.dto';
export declare class CreateQuotationDto {
    client_id: string;
    date?: string;
    valid_until?: string;
    status?: string;
    terms_conditions?: string;
    items?: QuotationItemDto[];
}
