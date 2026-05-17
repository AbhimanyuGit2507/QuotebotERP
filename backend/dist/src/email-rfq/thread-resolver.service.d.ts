import { PrismaService } from '../prisma.service';
export declare class ThreadResolverService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private normalizeSubject;
    private findConversationByMessageId;
    resolveConversation(message: Record<string, any>, payload: Record<string, unknown>): Promise<{
        conversationId: string | null;
        matchedBy?: string;
        reason?: string;
    }>;
}
