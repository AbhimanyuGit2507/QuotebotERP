import type { Request } from 'express';
import { EmailRfqService } from './email-rfq.service';
export declare class EmailRfqController {
    private readonly emailRfqService;
    constructor(emailRfqService: EmailRfqService);
    processPending(req: Request, body: {
        limit?: number;
    }): Promise<{
        started: boolean;
        reason: string;
    } | {
        scanned: number;
        created_rfqs: number;
        non_rfq: number;
        unresolved: number;
        llm_errors: number;
        skipped: number;
        started: boolean;
        reason?: undefined;
    }>;
}
