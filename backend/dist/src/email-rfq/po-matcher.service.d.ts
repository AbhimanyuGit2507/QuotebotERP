import { PrismaService } from '../prisma.service';
export declare class PoMatcherService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private normalize;
    scorePurchaseOrder(params: {
        tenantId: string;
        conversationId: string;
        messageBody: string;
        messageSubject?: string;
        poRecordId?: string;
        quotationId?: string | null;
    }): Promise<{
        percent: number;
        components: {
            threadMatch: number;
            quoteNumberMatch: number;
            customerMatch: number;
            skuMatch: number;
            amountMatch: number;
            domainMatch: number;
        };
    }>;
}
