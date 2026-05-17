"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ThreadResolverService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreadResolverService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let ThreadResolverService = ThreadResolverService_1 = class ThreadResolverService {
    prisma;
    logger = new common_1.Logger(ThreadResolverService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    normalizeSubject(s) {
        return String(s || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }
    async findConversationByMessageId(tenantId, messageIdHeader) {
        if (!messageIdHeader)
            return null;
        const msg = await this.prisma.message.findFirst({
            where: {
                tenant_id: tenantId,
                message_id_header: messageIdHeader,
            },
            select: { conversation_id: true },
        });
        return msg?.conversation_id || null;
    }
    async resolveConversation(message, payload) {
        try {
            const tenantId = String(message.tenant_id || '');
            if (!tenantId)
                return { conversationId: null };
            const inReplyTo = message.in_reply_to || (payload && payload.in_reply_to) || '';
            if (inReplyTo && String(inReplyTo).trim().length > 0) {
                const convId = await this.findConversationByMessageId(tenantId, String(inReplyTo).trim());
                if (convId) {
                    return {
                        conversationId: convId,
                        matchedBy: 'in_reply_to',
                        reason: 'Matched by In-Reply-To header',
                    };
                }
            }
            const referencesRaw = message.references_header ||
                (payload && payload.references) ||
                '';
            let refs = [];
            if (referencesRaw) {
                try {
                    if (typeof referencesRaw === 'string') {
                        const trimmed = referencesRaw.trim();
                        if (trimmed.startsWith('[')) {
                            const parsed = JSON.parse(trimmed);
                            if (Array.isArray(parsed))
                                refs = parsed.map(String);
                        }
                        else {
                            refs = trimmed
                                .split(/[\s,]+/)
                                .map((s) => s.trim())
                                .filter(Boolean);
                        }
                    }
                    else if (Array.isArray(referencesRaw)) {
                        refs = referencesRaw.map(String);
                    }
                }
                catch {
                    refs = [];
                }
            }
            for (const ref of refs) {
                const convId = await this.findConversationByMessageId(tenantId, ref);
                if (convId) {
                    return {
                        conversationId: convId,
                        matchedBy: 'references',
                        reason: 'Matched by References header',
                    };
                }
            }
            const subject = String(message.subject || message.conversation?.subject || '');
            const bodyText = String((payload && payload.body_text) || message.body || '');
            const combined = `${subject}\n${bodyText}`;
            const quoteMatch = combined.match(/\b(?:quote|quotation)\s*(?:#|no\.?|number)?\s*[:#-]?\s*([A-Z0-9-]{3,})\b/i);
            if (quoteMatch && quoteMatch[1]) {
                const qnum = quoteMatch[1].trim();
                const quotation = await this.prisma.quotation.findFirst({
                    where: { tenant_id: tenantId, number: qnum },
                    select: { conversation_id: true },
                });
                if (quotation?.conversation_id) {
                    return {
                        conversationId: quotation.conversation_id,
                        matchedBy: 'quote_number',
                        reason: `Matched by quotation number ${qnum}`,
                    };
                }
            }
            const norm = this.normalizeSubject(subject).slice(0, 120);
            if (norm.length > 4) {
                const candidates = await this.prisma.conversation.findMany({
                    where: {
                        tenant_id: tenantId,
                        subject: { contains: subject.slice(0, 80) },
                    },
                    orderBy: { last_message_at: 'desc' },
                    take: 5,
                    select: { id: true, subject: true, last_message_at: true },
                });
                for (const c of candidates) {
                    const cNorm = this.normalizeSubject(c.subject).slice(0, 120);
                    if (cNorm.length > 0 &&
                        (cNorm.includes(norm) || norm.includes(cNorm))) {
                        return {
                            conversationId: c.id,
                            matchedBy: 'subject_similarity',
                            reason: 'Matched by subject similarity',
                        };
                    }
                }
            }
            return { conversationId: null };
        }
        catch (error) {
            this.logger.warn(`ThreadResolver failed: ${error instanceof Error ? error.message : String(error)}`);
            return { conversationId: null };
        }
    }
};
exports.ThreadResolverService = ThreadResolverService;
exports.ThreadResolverService = ThreadResolverService = ThreadResolverService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ThreadResolverService);
//# sourceMappingURL=thread-resolver.service.js.map