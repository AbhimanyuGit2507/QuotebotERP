import { RfqItemDto } from './rfq-item.dto';
export declare class UpdateRfqDto {
    client_id?: string;
    channel?: string;
    priority?: string;
    status?: string;
    confidence_score?: number;
    due_date?: string;
    items?: RfqItemDto[];
}
