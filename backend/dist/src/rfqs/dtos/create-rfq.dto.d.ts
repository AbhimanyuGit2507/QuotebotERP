import { RfqItemDto } from './rfq-item.dto';
export declare class CreateRfqDto {
    client_id: string;
    channel: string;
    priority?: string;
    status?: string;
    confidence_score?: number;
    due_date?: string;
    items?: RfqItemDto[];
}
