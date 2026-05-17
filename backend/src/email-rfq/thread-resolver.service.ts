import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ThreadResolverService {
  private readonly logger = new Logger(ThreadResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  private normalizeSubject(s: string | undefined): string {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private async findConversationByMessageId(
    tenantId: string,
    messageIdHeader: string,
  ) {
    if (!messageIdHeader) return null;
    const msg = await this.prisma.message.findFirst({
      where: {
        tenant_id: tenantId,
        message_id_header: messageIdHeader,
      },
      select: { conversation_id: true },
    });
    return msg?.conversation_id || null;
  }

  async resolveConversation(
    message: Record<string, any>,
    payload: Record<string, unknown>,
  ): Promise<{
    conversationId: string | null;
    matchedBy?: string;
    reason?: string;
  }> {
    try {
      const tenantId = String(message.tenant_id || '');
      if (!tenantId) return { conversationId: null };

      // 1) In-Reply-To header
      const inReplyTo =
        message.in_reply_to || (payload && (payload as any).in_reply_to) || '';
      if (inReplyTo && String(inReplyTo).trim().length > 0) {
        const convId = await this.findConversationByMessageId(
          tenantId,
          String(inReplyTo).trim(),
        );
        if (convId) {
          return {
            conversationId: convId,
            matchedBy: 'in_reply_to',
            reason: 'Matched by In-Reply-To header',
          };
        }
      }

      // 2) References header (may be JSON array or space-separated list)
      const referencesRaw =
        message.references_header ||
        (payload && (payload as any).references) ||
        '';
      let refs: string[] = [];
      if (referencesRaw) {
        try {
          if (typeof referencesRaw === 'string') {
            const trimmed = referencesRaw.trim();
            if (trimmed.startsWith('[')) {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) refs = parsed.map(String);
            } else {
              // split on whitespace and commas
              refs = trimmed
                .split(/[\s,]+/)
                .map((s) => s.trim())
                .filter(Boolean);
            }
          } else if (Array.isArray(referencesRaw)) {
            refs = referencesRaw.map(String);
          }
        } catch {
          // fallback to empty
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

      // 3) Quote/Quotation number in subject/body -> find related quotation -> conversation
      const subject = String(
        message.subject || message.conversation?.subject || '',
      );
      const bodyText = String(
        (payload && (payload as any).body_text) || message.body || '',
      );
      const combined = `${subject}\n${bodyText}`;
      const quoteMatch = combined.match(
        /\b(?:quote|quotation)\s*(?:#|no\.?|number)?\s*[:#-]?\s*([A-Z0-9-]{3,})\b/i,
      );
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

      // 4) Subject similarity: look for conversations with similar normalized subject
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
          if (
            cNorm.length > 0 &&
            (cNorm.includes(norm) || norm.includes(cNorm))
          ) {
            return {
              conversationId: c.id,
              matchedBy: 'subject_similarity',
              reason: 'Matched by subject similarity',
            };
          }
        }
      }

      return { conversationId: null };
    } catch (error) {
      this.logger.warn(
        `ThreadResolver failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { conversationId: null };
    }
  }
}
