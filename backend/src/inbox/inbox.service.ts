import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type RetryHistoryEntry = {
  retried_at: string;
  retried_by: string;
  reason: string;
  previous_processing_status: 'pending' | 'parsed' | 'failed';
  previous_parsing_source?: string;
  previous_parsing_error?: string;
  previous_item_count?: number;
  forced: boolean;
};

@Injectable()
export class InboxService {
  constructor(private readonly prisma: PrismaService) {}

  private stripHtmlTags(value: string): string {
    return value
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private readRawPayload(payload: unknown): Record<string, unknown> | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    return payload as Record<string, unknown>;
  }

  private normalizeParsedItems(items: unknown): Array<{
    product_name: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }> {
    if (!Array.isArray(items)) {
      return [];
    }

    const normalized: Array<{
      product_name: string;
      quantity: number;
      unit?: string;
      notes?: string;
    }> = [];

    for (const rawItem of items) {
      if (!rawItem || typeof rawItem !== 'object') {
        continue;
      }

      const item = rawItem as Record<string, unknown>;
      const productName =
        typeof item.product_name === 'string' &&
        item.product_name.trim().length > 0
          ? item.product_name.trim()
          : typeof item.name === 'string' && item.name.trim().length > 0
            ? item.name.trim()
            : '';

      const quantity = Number(item.quantity);
      if (!productName || !Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      normalized.push({
        product_name: productName,
        quantity,
        ...(typeof item.unit === 'string' && item.unit.trim().length > 0
          ? { unit: item.unit.trim() }
          : {}),
        ...(typeof item.notes === 'string' && item.notes.trim().length > 0
          ? { notes: item.notes.trim() }
          : {}),
      });
    }

    return normalized;
  }

  private normalizeRejectedItems(items: unknown): Array<{
    input_name: string;
    quantity: number;
    reason: string;
  }> {
    if (!Array.isArray(items)) {
      return [];
    }

    const normalized: Array<{
      input_name: string;
      quantity: number;
      reason: string;
    }> = [];

    for (const rawItem of items) {
      if (!rawItem || typeof rawItem !== 'object') {
        continue;
      }

      const item = rawItem as Record<string, unknown>;
      const inputName =
        typeof item.input_name === 'string' && item.input_name.trim().length > 0
          ? item.input_name.trim()
          : typeof item.product_name === 'string' &&
              item.product_name.trim().length > 0
            ? item.product_name.trim()
            : '';
      const quantity = Number(item.quantity);
      const reason =
        typeof item.reason === 'string' && item.reason.trim().length > 0
          ? item.reason.trim()
          : 'unmatched';

      if (!inputName || !Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      normalized.push({
        input_name: inputName,
        quantity,
        reason,
      });
    }

    return normalized;
  }

  private normalizeRetryCount(value: unknown): number {
    const count = Number(value);
    if (!Number.isFinite(count) || count < 0) {
      return 0;
    }

    return Math.floor(count);
  }

  private normalizeRetryHistory(history: unknown): RetryHistoryEntry[] {
    if (!Array.isArray(history)) {
      return [];
    }

    const normalized: RetryHistoryEntry[] = [];
    for (const rawEntry of history) {
      if (!rawEntry || typeof rawEntry !== 'object') {
        continue;
      }

      const entry = rawEntry as Record<string, unknown>;
      const retriedAt =
        typeof entry.retried_at === 'string' &&
        entry.retried_at.trim().length > 0
          ? entry.retried_at.trim()
          : '';
      const previousProcessingStatus =
        entry.previous_processing_status === 'pending' ||
        entry.previous_processing_status === 'parsed' ||
        entry.previous_processing_status === 'failed'
          ? entry.previous_processing_status
          : null;

      if (!retriedAt || !previousProcessingStatus) {
        continue;
      }

      const previousItemCount = Number(entry.previous_item_count);

      normalized.push({
        retried_at: retriedAt,
        retried_by:
          typeof entry.retried_by === 'string' &&
          entry.retried_by.trim().length > 0
            ? entry.retried_by.trim()
            : 'manual_inbox_action',
        reason:
          typeof entry.reason === 'string' && entry.reason.trim().length > 0
            ? entry.reason.trim()
            : 'Manual retry requested from inbox UI.',
        previous_processing_status: previousProcessingStatus,
        ...(typeof entry.previous_parsing_source === 'string' &&
        entry.previous_parsing_source.trim().length > 0
          ? { previous_parsing_source: entry.previous_parsing_source.trim() }
          : {}),
        ...(typeof entry.previous_parsing_error === 'string' &&
        entry.previous_parsing_error.trim().length > 0
          ? { previous_parsing_error: entry.previous_parsing_error.trim() }
          : {}),
        ...(Number.isFinite(previousItemCount) && previousItemCount >= 0
          ? { previous_item_count: Math.floor(previousItemCount) }
          : {}),
        forced: Boolean(entry.forced),
      });
    }

    return normalized;
  }

  async findMessagesForProcessing(
    tenantId: string,
    processingStatus: 'pending' | 'parsed' | 'failed' = 'pending',
  ) {
    const messages = await this.prisma.message.findMany({
      where: {
        tenant_id: tenantId,
        direction: 'inbound',
        processing_status: processingStatus,
      },
      orderBy: [{ created_at: 'asc' }],
      include: {
        conversation: {
          include: {
            client: true,
          },
        },
      },
      take: 100,
    });

    return messages.map((message) => ({
      id: message.id,
      email_account_id: message.email_account_id,
      external_id: message.external_id,
      thread_id: message.thread_id,
      sender_email: message.sender_email,
      sender_name: message.sender_name,
      subject: message.conversation.subject,
      body: message.body,
      raw_payload: message.raw_payload,
      created_at: message.created_at,
      processing_status: message.processing_status,
    }));
  }

  private formatRelativeTime(value?: Date | null): string {
    if (!value) {
      return 'Unknown';
    }

    const now = Date.now();
    const then = value.getTime();
    const diffMs = Math.max(0, now - then);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) {
      return 'Just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    return value.toISOString().split('T')[0];
  }

  private formatAbsoluteTime(value?: Date | null): string {
    if (!value) {
      return 'Unknown';
    }

    return value.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  async findMessages(tenantId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        tenant_id: tenantId,
        direction: 'inbound',
      },
      include: {
        conversation: {
          include: {
            client: true,
          },
        },
      },
      orderBy: [{ created_at: 'desc' }],
      take: 1000,
    });

    const rfqIds = messages
      .map((message) => message.conversation.rfq_id)
      .filter((id): id is string => Boolean(id));

    const quotationIds = messages
      .map((message) => message.conversation.quotation_id)
      .filter((id): id is string => Boolean(id));

    const [rfqs, quotations] = await Promise.all([
      rfqIds.length
        ? this.prisma.rFQ.findMany({
            where: { id: { in: rfqIds }, tenant_id: tenantId },
            include: { items: true },
          })
        : Promise.resolve([]),
      quotationIds.length
        ? this.prisma.quotation.findMany({
            where: { id: { in: quotationIds }, tenant_id: tenantId },
            include: { items: true },
          })
        : Promise.resolve([]),
    ]);

    const rfqItemCount = new Map<string, number>();
    for (const rfq of rfqs) {
      rfqItemCount.set(rfq.id, rfq.items.length);
    }

    const quotationItemCount = new Map<string, number>();
    for (const quotation of quotations) {
      quotationItemCount.set(quotation.id, quotation.items.length);
    }

    return messages.map((message) => {
      const rawPayload = this.readRawPayload(message.raw_payload);
      const parsedItems = this.normalizeParsedItems(rawPayload?.parsed_items);
      const rejectedItems = this.normalizeRejectedItems(
        rawPayload?.rejected_items,
      );
      const allItems = [
        ...parsedItems.map((item) => ({
          ...item,
          status: 'matched' as const,
        })),
        ...rejectedItems.map((item) => ({
          product_name: item.input_name,
          quantity: item.quantity,
          status: 'rejected' as const,
          reason: item.reason,
        })),
      ];
      const retryCount = this.normalizeRetryCount(rawPayload?.retry_count);
      const retryHistory = this.normalizeRetryHistory(
        rawPayload?.retry_history,
      );
      const lastRetryAt =
        typeof rawPayload?.last_retry_at === 'string' &&
        rawPayload.last_retry_at.trim().length > 0
          ? rawPayload.last_retry_at
          : retryHistory[0]?.retried_at || '';
      let extractedItems = 0;
      if (message.conversation.rfq_id) {
        extractedItems = rfqItemCount.get(message.conversation.rfq_id) ?? 0;
      } else if (allItems.length > 0) {
        extractedItems = allItems.length;
      } else if (message.conversation.quotation_id) {
        extractedItems =
          quotationItemCount.get(message.conversation.quotation_id) ?? 0;
      }

      let status: 'new' | 'parsed' | 'needs_review' | 'failed' = 'needs_review';

      if (message.processing_status === 'parsed') {
        status = 'parsed';
      } else if (message.processing_status === 'failed') {
        status = 'failed';
      } else if (!message.is_read) {
        status = 'new';
      }

      const rawConfidence = rawPayload?.confidence;
      const rawParsingConfidence = rawPayload?.parsing_confidence;

      let confidence =
        typeof rawConfidence === 'number' && Number.isFinite(rawConfidence)
          ? rawConfidence
          : 0;

      if (confidence <= 0 && typeof rawParsingConfidence === 'string') {
        const normalizedConfidence = rawParsingConfidence.trim().toLowerCase();
        if (normalizedConfidence === 'high') {
          confidence = 90;
        } else if (normalizedConfidence === 'medium') {
          confidence = 70;
        } else if (normalizedConfidence === 'low') {
          confidence = 40;
        } else if (normalizedConfidence === 'error') {
          confidence = 10;
        }
      }

      const rawAttachments = rawPayload?.attachments;
      const attachments = Array.isArray(rawAttachments)
        ? rawAttachments.filter(
            (attachment): attachment is string =>
              typeof attachment === 'string' && attachment.trim().length > 0,
          )
        : [];

      const htmlBody =
        typeof rawPayload?.body_html === 'string' &&
        rawPayload.body_html.trim().length > 0
          ? rawPayload.body_html
          : '';

      const plainBody =
        typeof rawPayload?.body_text === 'string' &&
        rawPayload.body_text.trim().length > 0
          ? rawPayload.body_text
          : message.body;

      return {
        id: message.id,
        channel: message.channel === 'whatsapp' ? 'whatsapp' : 'email',
        sender: message.sender_name || message.conversation.client.name,
        from: message.sender_email || message.conversation.client.email,
        subject: message.conversation.subject,
        preview: this.stripHtmlTags(plainBody).slice(0, 120),
        content: plainBody,
        contentHtml: htmlBody || undefined,
        timestamp: this.formatAbsoluteTime(message.created_at),
        relativeTime: this.formatRelativeTime(message.created_at),
        status,
        isRead: message.is_read,
        confidence,
        extractedItems,
        parsedItems: allItems,
        parsingSource:
          typeof rawPayload?.parsing_source === 'string'
            ? rawPayload.parsing_source
            : '',
        parsingConfidence:
          typeof rawPayload?.parsing_confidence === 'string'
            ? rawPayload.parsing_confidence
            : '',
        parsingError:
          typeof rawPayload?.parsing_error === 'string'
            ? rawPayload.parsing_error
            : '',
        rfqId: typeof rawPayload?.rfq_id === 'string' ? rawPayload.rfq_id : '',
        quotationId:
          typeof rawPayload?.quotation_id === 'string'
            ? rawPayload.quotation_id
            : '',
        autoRfqCreated: Boolean(rawPayload?.auto_rfq_created),
        autoQuotationCreated: Boolean(rawPayload?.auto_quotation_created),
        retryCount,
        lastRetryAt,
        retryHistory,
        attachments,
      };
    });
  }

  async retryMessageParsing(
    id: string,
    tenantId: string,
    body: {
      force_retry?: boolean;
      reason?: string;
    },
  ) {
    const current = await this.prisma.message.findFirst({
      where: {
        id,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        processing_status: true,
        raw_payload: true,
        conversation: {
          select: {
            rfq_id: true,
            quotation_id: true,
          },
        },
      },
    });

    if (!current) {
      throw new NotFoundException(`Message ${id} not found`);
    }

    const currentPayload = this.readRawPayload(current?.raw_payload) || {};
    const forceRetry = Boolean(body.force_retry);

    const hasLinkedArtifacts =
      Boolean(current.conversation?.rfq_id) ||
      Boolean(current.conversation?.quotation_id) ||
      (typeof currentPayload.rfq_id === 'string' &&
        currentPayload.rfq_id.trim().length > 0) ||
      (typeof currentPayload.quotation_id === 'string' &&
        currentPayload.quotation_id.trim().length > 0);

    if (hasLinkedArtifacts && !forceRetry) {
      throw new BadRequestException(
        'Message is already linked to an RFQ or quotation. Set force_retry=true to retry anyway.',
      );
    }

    const retryCount = this.normalizeRetryCount(currentPayload.retry_count);
    const retryHistory = this.normalizeRetryHistory(
      currentPayload.retry_history,
    );
    const previousItems = this.normalizeParsedItems(
      currentPayload.parsed_items,
    );
    const retriedAt = new Date().toISOString();
    const previousProcessingStatus: 'pending' | 'parsed' | 'failed' =
      current.processing_status === 'parsed' ||
      current.processing_status === 'failed'
        ? current.processing_status
        : 'pending';

    const retryEntry: RetryHistoryEntry = {
      retried_at: retriedAt,
      retried_by: 'manual_inbox_action',
      reason:
        typeof body.reason === 'string' && body.reason.trim().length > 0
          ? body.reason.trim()
          : 'Manual retry requested from inbox UI.',
      previous_processing_status: previousProcessingStatus,
      ...(typeof currentPayload.parsing_source === 'string' &&
      currentPayload.parsing_source.trim().length > 0
        ? { previous_parsing_source: currentPayload.parsing_source.trim() }
        : {}),
      ...(typeof currentPayload.parsing_error === 'string' &&
      currentPayload.parsing_error.trim().length > 0
        ? { previous_parsing_error: currentPayload.parsing_error.trim() }
        : {}),
      ...(previousItems.length > 0
        ? { previous_item_count: previousItems.length }
        : {}),
      forced: forceRetry,
    };

    const mergedPayload: Record<string, unknown> = {
      ...currentPayload,
      parsing_source: 'manual_retry_requested',
      parsing_confidence: '',
      parsing_error: '',
      parsed_items: [],
      rfq_id: '',
      quotation_id: '',
      auto_rfq_created: false,
      auto_quotation_created: false,
      retry_count: retryCount + 1,
      last_retry_at: retriedAt,
      last_retry_forced: forceRetry,
      last_retry_reason: retryEntry.reason,
      retry_history: [retryEntry, ...retryHistory].slice(0, 10),
    };

    return this.prisma.message.update({
      where: { id },
      data: {
        processing_status: 'pending',
        is_processed: false,
        raw_payload: mergedPayload as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
    });
  }

  async retrySourceMessageByRfqId(
    rfqId: string,
    tenantId: string,
    body: {
      force_retry?: boolean;
      reason?: string;
    },
  ) {
    const candidates = await this.prisma.message.findMany({
      where: {
        tenant_id: tenantId,
        direction: 'inbound',
        OR: [{ conversation: { rfq_id: rfqId } }],
      },
      orderBy: [{ created_at: 'desc' }],
      select: {
        id: true,
        raw_payload: true,
      },
      take: 5,
    });

    let targetMessageId = candidates[0]?.id || '';

    if (!targetMessageId) {
      const recentMessages = await this.prisma.message.findMany({
        where: {
          tenant_id: tenantId,
          direction: 'inbound',
        },
        orderBy: [{ created_at: 'desc' }],
        select: {
          id: true,
          raw_payload: true,
        },
        take: 1000,
      });

      const matched = recentMessages.find((message) => {
        const payload = this.readRawPayload(message.raw_payload);
        return (
          typeof payload?.rfq_id === 'string' && payload.rfq_id.trim() === rfqId
        );
      });

      targetMessageId = matched?.id || '';
    }

    if (!targetMessageId) {
      throw new NotFoundException(
        `No source inbox message linked to RFQ ${rfqId}`,
      );
    }

    const updatedMessage = await this.retryMessageParsing(
      targetMessageId,
      tenantId,
      {
        ...body,
        force_retry: true,
        reason:
          body.reason?.trim() ||
          'Manual retry requested from RFQ Management page.',
      },
    );

    return {
      rfq_id: rfqId,
      message_id: updatedMessage.id,
      status: 'queued',
    };
  }

  async updateMessageProcessingStatus(
    id: string,
    tenantId: string,
    body: {
      processing_status: 'pending' | 'parsed' | 'failed';
      parsed_items?: Array<{
        product_name?: string;
        name?: string;
        quantity: number;
        unit?: string;
        notes?: string;
      }>;
      parsing_source?: string;
      parsing_confidence?: string;
      parsing_error?: string;
      rfq_id?: string;
      quotation_id?: string;
      auto_rfq_created?: boolean;
      auto_quotation_created?: boolean;
      force_retry?: boolean;
    },
  ) {
    const processingStatus = body.processing_status;
    if (!['pending', 'parsed', 'failed'].includes(processingStatus)) {
      throw new BadRequestException(
        `Invalid processing_status: ${processingStatus}`,
      );
    }

    const current = await this.prisma.message.findFirst({
      where: {
        id,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        raw_payload: true,
        conversation: {
          select: {
            rfq_id: true,
            quotation_id: true,
          },
        },
      },
    });

    if (!current) {
      throw new NotFoundException(`Message ${id} not found`);
    }

    const currentPayload = this.readRawPayload(current?.raw_payload) || {};
    const parsedItems = this.normalizeParsedItems(body.parsed_items);

    if (processingStatus === 'pending' && !body.force_retry) {
      const hasLinkedArtifacts =
        Boolean(current.conversation?.rfq_id) ||
        Boolean(current.conversation?.quotation_id) ||
        (typeof currentPayload.rfq_id === 'string' &&
          currentPayload.rfq_id.trim().length > 0) ||
        (typeof currentPayload.quotation_id === 'string' &&
          currentPayload.quotation_id.trim().length > 0);

      if (hasLinkedArtifacts) {
        throw new BadRequestException(
          'Message is already linked to an RFQ or quotation. Set force_retry=true to retry anyway.',
        );
      }
    }

    const mergedPayload: Record<string, unknown> = {
      ...currentPayload,
      ...(body.parsing_source !== undefined
        ? { parsing_source: body.parsing_source }
        : {}),
      ...(body.parsing_confidence !== undefined
        ? { parsing_confidence: body.parsing_confidence }
        : {}),
      ...(body.parsing_error !== undefined
        ? { parsing_error: body.parsing_error }
        : {}),
      ...(body.rfq_id !== undefined ? { rfq_id: body.rfq_id } : {}),
      ...(body.quotation_id !== undefined
        ? { quotation_id: body.quotation_id }
        : {}),
      ...(body.auto_rfq_created !== undefined
        ? { auto_rfq_created: body.auto_rfq_created }
        : {}),
      ...(body.auto_quotation_created !== undefined
        ? { auto_quotation_created: body.auto_quotation_created }
        : {}),
      ...(body.parsed_items !== undefined ? { parsed_items: parsedItems } : {}),
    };

    return this.prisma.message.update({
      where: { id },
      data: {
        processing_status: processingStatus,
        is_processed: processingStatus === 'parsed',
        raw_payload: mergedPayload as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
    });
  }
}
