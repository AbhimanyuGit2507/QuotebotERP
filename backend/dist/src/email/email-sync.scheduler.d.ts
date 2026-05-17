import { EmailService } from './email.service';
import { PrismaService } from '../prisma.service';
export declare class EmailSyncScheduler {
    private emailService;
    private prisma;
    private readonly logger;
    private readonly AUTO_SYNC_ENABLED;
    constructor(emailService: EmailService, prisma: PrismaService);
    handleEmailSync(): Promise<void>;
}
