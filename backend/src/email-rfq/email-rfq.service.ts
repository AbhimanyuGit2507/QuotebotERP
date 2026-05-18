import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  AssistanceTicketStatus,
  ConversationStage,
  FollowupType,
  MessageClassification,
  Prisma,
  PurchaseOrderStatus,
  EmailTemplateType,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { RfqsService } from '../rfqs/rfqs.service';
import { QuotationsService } from '../quotations/quotations.service';
import { ThreadResolverService } from './thread-resolver.service';
import { PoMatcherService } from './po-matcher.service';
import { EmailService } from '../email/email.service';
import { EmailTemplatesService } from '../email-templates/email-templates.service';

type LlmItem = {
  product_name: string;
  quantity: number;
  unit?: string;
  notes?: string;
};

type LlmExtractionResult = {
  is_rfq: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  items: LlmItem[];
};

type BatchClassificationResult = {
  rfq_ids: string[];
  non_rfq_ids: string[];
  reasons?: Record<string, string>;
};

type BatchCandidateMessage = {
  id: string;
  subject: string;
  body: string;
};

type MessageWithConversation = Prisma.MessageGetPayload<{
  include: { conversation: true };
}>;

type EligibleMessage = {
  message: MessageWithConversation;
  payload: Record<string, unknown>;
  retryCount: number;
};

type ProviderRequestError = Error & {
  statusCode?: number;
  retryAfterMs?: number;
};

type RegexClassificationResult = {
  verdict: 'rfq' | 'non_rfq' | 'uncertain';
  reason: string;
  confidence: 'high' | 'medium' | 'low';
};

type PrimaryIntentResult = {
  classification: MessageClassification;
  confidence: number;
  reason: string;
  followupType?: FollowupType;
};

@Injectable()
export class EmailRfqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailRfqService.name);
  private readonly enabled =
    process.env.BACKEND_RFQ_PIPELINE_ENABLED !== 'false';
  private readonly intervalMs = Number(
    process.env.BACKEND_RFQ_PIPELINE_INTERVAL_MS || 20000,
  );
  private readonly runBatchLimit = Math.min(
    Math.max(Number(process.env.RFQ_PIPELINE_BATCH_LIMIT || 60), 10),
    250,
  );
  private readonly classifierBatchSize = Math.min(
    Math.max(Number(process.env.RFQ_CLASSIFIER_BATCH_SIZE || 8), 1),
    25,
  );
  private readonly classifierSnippetHeadChars = Math.min(
    Math.max(Number(process.env.RFQ_CLASSIFIER_SNIPPET_HEAD_CHARS || 200), 50),
    1000,
  );
  private readonly classifierSnippetMaxChars = Math.min(
    Math.max(Number(process.env.RFQ_CLASSIFIER_SNIPPET_MAX_CHARS || 600), 200),
    3000,
  );
  private readonly classifierKeywordWindowChars = Math.min(
    Math.max(Number(process.env.RFQ_CLASSIFIER_KEYWORD_WINDOW_CHARS || 40), 10),
    200,
  );
  private readonly classifierMaxWindows = Math.min(
    Math.max(Number(process.env.RFQ_CLASSIFIER_MAX_WINDOWS || 4), 1),
    12,
  );
  private readonly classifierBatchMaxBytes = Math.min(
    Math.max(Number(process.env.RFQ_CLASSIFIER_MAX_BATCH_BYTES || 26000), 8000),
    30000,
  );
  private readonly extractionDelayMs = Math.min(
    Math.max(Number(process.env.RFQ_EXTRACT_DELAY_MS || 50), 0),
    1000,
  );
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Rate limiting: max 10 LLM calls per minute to avoid hitting provider limits
  private readonly llmRateLimitPerMinute = Number(
    process.env.LLM_RATE_LIMIT_PER_MINUTE || 10,
  );
  private llmCallTimestamps: number[] = [];
  private providerCooldownUntilMs = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly rfqsService: RfqsService,
    private readonly quotationsService: QuotationsService,
    private readonly threadResolver: ThreadResolverService,
    private readonly poMatcher: PoMatcherService,
    private readonly emailService: EmailService,
    private readonly emailTemplatesService: EmailTemplatesService,
  ) {}

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log(
        'Backend RFQ pipeline disabled via BACKEND_RFQ_PIPELINE_ENABLED=false',
      );
      return;
    }

    const safeInterval =
      Number.isFinite(this.intervalMs) && this.intervalMs >= 5000
        ? this.intervalMs
        : 20000;
    this.logger.log(
      `Backend RFQ pipeline enabled. Interval: ${safeInterval}ms, batchLimit: ${this.runBatchLimit}, classifierBatchSize: ${this.classifierBatchSize}, extractionDelayMs: ${this.extractionDelayMs}`,
    );

    this.timer = setInterval(() => {
      void this.processPendingMessages({ limit: this.runBatchLimit });
    }, safeInterval);

    setTimeout(() => {
      void this.processPendingMessages({ limit: this.runBatchLimit });
    }, 1000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private normalizeName(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private asText(value: unknown, fallback = ''): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return fallback;
  }

  private errorToMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object') {
      try {
        return JSON.stringify(error);
      } catch {
        return 'Unknown object error';
      }
    }

    if (
      typeof error === 'number' ||
      typeof error === 'boolean' ||
      typeof error === 'bigint'
    ) {
      return String(error);
    }

    return 'Unknown error';
  }

  private parseRetryAfterToMs(value: string | null): number {
    if (!value || value.trim().length === 0) {
      return 0;
    }

    const trimmed = value.trim();
    const seconds = Number(trimmed);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000);
    }

    const targetTime = Date.parse(trimmed);
    if (!Number.isFinite(targetTime)) {
      return 0;
    }

    return Math.max(0, targetTime - Date.now());
  }

  private buildProviderHttpError(
    providerName: string,
    res: Response,
  ): ProviderRequestError {
    const retryAfterMs = this.parseRetryAfterToMs(
      res.headers.get('retry-after'),
    );
    const error = new Error(
      `${providerName} request failed with status ${res.status}`,
    ) as ProviderRequestError;
    error.statusCode = res.status;
    if (retryAfterMs > 0) {
      error.retryAfterMs = retryAfterMs;
    }
    return error;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private parseJsonFlexible(value: unknown): Record<string, unknown> | null {
    if (!value) return null;
    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch (error: unknown) {
      this.logger.debug(
        `Primary JSON parse failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      // Keep trying other extraction strategies.
    }

    const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (codeBlock?.[1]) {
      try {
        return JSON.parse(codeBlock[1].trim()) as Record<string, unknown>;
      } catch (error: unknown) {
        this.logger.debug(
          `Code-block JSON parse failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
        // Keep trying other extraction strategies.
      }
    }

    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as Record<
          string,
          unknown
        >;
      } catch (error: unknown) {
        this.logger.debug(
          `Bracket-slice JSON parse failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
        // Keep trying other extraction strategies.
      }
    }

    return null;
  }

  private sanitizeItems(items: unknown): LlmItem[] {
    if (!Array.isArray(items)) {
      return [];
    }

    const out: LlmItem[] = [];
    for (const raw of items) {
      if (!raw || typeof raw !== 'object') continue;
      const row = raw as Record<string, unknown>;
      const product_name = this.asText(row.product_name ?? row.name, '').trim();
      const quantity = Number(row.quantity);
      const unit = this.asText(row.unit, 'unit').trim().toLowerCase();
      const notes = this.asText(row.notes, '').trim();

      if (!product_name || !Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      out.push({
        product_name,
        quantity,
        unit,
        ...(notes ? { notes } : {}),
      });
    }

    const dedup = new Map<string, LlmItem>();
    for (const item of out) {
      const key = `${this.normalizeName(item.product_name)}::${item.quantity}::${item.unit || ''}`;
      if (!dedup.has(key)) {
        dedup.set(key, item);
      }
    }

    return Array.from(dedup.values());
  }

  private regexExtract(text: string): LlmItem[] {
    const lines = String(text || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const unitPattern = '(pc|pcs|piece|pieces|unit|units|kg|g|ltr|l|box|boxes)';
    const patterns: RegExp[] = [
      new RegExp(
        `^(.+?)\\s*[\\-–:]\\s*(\\d+(?:\\.\\d+)?)\\s*${unitPattern}$`,
        'i',
      ),
      new RegExp(`^(.+?)\\s*\\((\\d+(?:\\.\\d+)?)\\s*${unitPattern}\\)$`, 'i'),
      new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*${unitPattern}\\s+(.+)$`, 'i'),
      new RegExp(`^(.+?)\\s+(\\d+)${unitPattern}$`, 'i'),
      new RegExp(`^(.+?)\\s*[\\-–:]\\s*(\\d+(?:\\.\\d+)?)$`, 'i'),
    ];

    const found: LlmItem[] = [];

    for (const line of lines) {
      const normalizedLine = line.replace(/^\s*(?:\d+[.)]|[-*])\s+/, '');
      for (const pattern of patterns) {
        const m = normalizedLine.match(pattern);
        if (!m) continue;

        const groups = m.slice(1).map((x) => String(x || '').trim());
        let productName = '';
        let qty = 0;
        let unit = 'unit';

        if (pattern === patterns[2]) {
          qty = Number(groups[0]);
          unit = groups[1].toLowerCase();
          productName = groups[2];
        } else if (pattern === patterns[3]) {
          productName = groups[0];
          qty = Number(groups[1]);
          unit = groups[2].toLowerCase();
        } else if (pattern === patterns[4]) {
          productName = groups[0];
          qty = Number(groups[1]);
          unit = 'unit';
        } else {
          productName = groups[0];
          qty = Number(groups[1]);
          unit = groups[2].toLowerCase();
        }

        if (!productName || !Number.isFinite(qty) || qty <= 0) {
          continue;
        }

        found.push({
          product_name: productName,
          quantity: qty,
          unit,
          notes: 'Recovered by backend regex fallback',
        });
        break;
      }
    }

    return this.sanitizeItems(found);
  }

  private computeQuantityConfidence(
    items: LlmItem[],
    bodyText: string,
  ): number {
    if (items.length === 0) {
      return 0;
    }

    const normalizedBody = this.normalizeName(bodyText);
    let confidentHits = 0;
    for (const item of items) {
      const normalizedName = this.normalizeName(item.product_name);
      const qtyPattern = new RegExp(`\\b${item.quantity}\\b`);
      const hasName =
        normalizedName.length > 0 && normalizedBody.includes(normalizedName);
      const hasQty = qtyPattern.test(bodyText);
      if (hasName && hasQty) {
        confidentHits += 1;
      }
    }

    return Math.round((confidentHits / items.length) * 100);
  }

  private buildKeywordWindows(text: string): string[] {
    const windows: string[] = [];
    const seen = new Set<string>();
    const patterns: RegExp[] = [
      /(request\s+for\s+quote|rfq|quotation\s+request|proforma|price\s+quote|best\s+price|kindly\s+quote|please\s+quote|need\s+quote|rate\s+for|pricing\s+for)/gi,
      /(\b\d+(?:\.\d+)?\s*(pc|pcs|piece|pieces|unit|units|kg|g|ltr|l|box|boxes)\b)/gi,
    ];

    const input = String(text || '');
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while (
        (match = pattern.exec(input)) &&
        windows.length < this.classifierMaxWindows
      ) {
        const start = Math.max(
          0,
          match.index - this.classifierKeywordWindowChars,
        );
        const end = Math.min(
          input.length,
          match.index + match[0].length + this.classifierKeywordWindowChars,
        );
        const slice = input.slice(start, end).trim();
        if (!slice) continue;
        const key = slice.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        windows.push(slice);
      }
    }

    return windows;
  }

  private buildClassifierSnippet(subject: string, body: string): string {
    const head = String(body || '').slice(0, this.classifierSnippetHeadChars);
    const windows = this.buildKeywordWindows(body);
    const parts = [
      `Subject: ${subject || '(No subject)'}`,
      `Body: ${head}`,
      ...(windows.length > 0
        ? ['Keyword windows:', ...windows.map((win) => `- ${win}`)]
        : []),
    ];

    const combined = parts.join('\n').trim();
    if (combined.length <= this.classifierSnippetMaxChars) {
      return combined;
    }

    return combined.slice(0, this.classifierSnippetMaxChars);
  }

  private parseRetryAfterMs(value: string | null): number {
    if (!value) {
      return 0;
    }

    const asSeconds = Number.parseFloat(value);
    if (Number.isFinite(asSeconds) && asSeconds > 0) {
      return Math.round(asSeconds * 1000);
    }

    const asDate = new Date(value);
    if (Number.isNaN(asDate.getTime())) {
      return 0;
    }

    return Math.max(0, asDate.getTime() - Date.now());
  }

  private classifyRfqByRegex(
    subject: string,
    body: string,
  ): RegexClassificationResult {
    const joined = `${subject || ''}\n${body || ''}`.toLowerCase();

    const rfqIntentPattern =
      /(request\s+for\s+quote|rfq|quotation\s+request|proforma|price\s+quote|best\s+price|kindly\s+quote|please\s+quote|need\s+quote|rate\s+for|pricing\s+for)/i;
    const nonRfqPattern =
      /(newsletter|unsubscribe|otp|verification\s+code|password\s+reset|delivery\s+status|bounce\s+notice|calendar\s+invite|out\s+of\s+office|automatic\s+reply|payment\s+received|invoice\s+paid|receipt)/i;

    const hasRfqIntent = rfqIntentPattern.test(joined);
    const hasNonRfqSignal = nonRfqPattern.test(joined);
    const regexItems = this.regexExtract(body || '');

    if (hasNonRfqSignal && !hasRfqIntent && regexItems.length === 0) {
      return {
        verdict: 'non_rfq',
        reason: 'Regex classifier matched non-RFQ email signals',
        confidence: 'high',
      };
    }

    if (regexItems.length >= 1 && hasRfqIntent) {
      return {
        verdict: 'rfq',
        reason:
          'Regex classifier detected RFQ intent and quantity-bearing items',
        confidence: 'high',
      };
    }

    if (regexItems.length >= 2) {
      return {
        verdict: 'rfq',
        reason:
          'Regex classifier detected multiple quantity-bearing line items',
        confidence: 'medium',
      };
    }

    if (hasRfqIntent) {
      return {
        verdict: 'uncertain',
        reason: 'RFQ intent detected without strong regex item confidence',
        confidence: 'low',
      };
    }

    return {
      verdict: 'uncertain',
      reason: 'Regex classifier could not confidently determine RFQ intent',
      confidence: 'low',
    };
  }

  private classifyFollowupType(subject: string, body: string): FollowupType {
    const text = `${subject || ''}\n${body || ''}`.toLowerCase();

    if (
      /(spec|datasheet|technical|compatib|grade|standard|warranty|certif|test report|material)/i.test(
        text,
      )
    ) {
      return FollowupType.TECHNICAL;
    }

    if (
      /(discount|reduce|best price|negot|counter offer|revise quote|too high|lower rate)/i.test(
        text,
      )
    ) {
      return FollowupType.NEGOTIATION;
    }

    if (
      /(delivery|lead time|dispatch|shipment|shipping|eta|timeline|schedule|when can you deliver)/i.test(
        text,
      )
    ) {
      return FollowupType.DELIVERY;
    }

    return FollowupType.GENERAL;
  }

  private detectPoSignals(
    subject: string,
    body: string,
    payload: Record<string, unknown>,
  ) {
    const text = `${subject || ''}\n${body || ''}`.toLowerCase();
    const phraseMatch =
      /(please find attached po|purchase\s*order|order\s*confirmed|kindly process attached purchase order|we confirm order|po\s*number)/i.test(
        text,
      );

    const attachmentsRaw = payload.attachments ?? payload.attachments_json;
    const attachments = Array.isArray(attachmentsRaw)
      ? attachmentsRaw
          .map((item) => this.asText(item, '').toLowerCase())
          .filter((item) => item.length > 0)
      : [];

    const attachmentMatch = attachments.some((name) =>
      /(\bpo\b|purchase[_\s-]*order|order\.pdf|po\.pdf)/i.test(name),
    );

    return {
      matched: phraseMatch || attachmentMatch,
      confidence:
        attachmentMatch && phraseMatch ? 0.97 : phraseMatch ? 0.9 : 0.86,
    };
  }

  private classifyPrimaryIntent(
    subject: string,
    body: string,
    payload: Record<string, unknown>,
    conversationQuotationId?: string | null,
  ): PrimaryIntentResult {
    const poSignals = this.detectPoSignals(subject, body, payload);
    if (poSignals.matched) {
      return {
        classification: MessageClassification.PO,
        confidence: poSignals.confidence,
        reason: 'PO intent detected from attachment/body signals',
      };
    }

    const regexDecision = this.classifyRfqByRegex(subject, body);
    if (regexDecision.verdict === 'rfq') {
      return {
        classification: MessageClassification.RFQ,
        confidence: regexDecision.confidence === 'high' ? 0.92 : 0.78,
        reason: regexDecision.reason,
      };
    }

    const text = `${subject || ''}\n${body || ''}`.toLowerCase();
    const mentionsQuote =
      /(quote|quotation|qt\/|regarding quote|your quotation|our quotation)/i.test(
        text,
      ) || Boolean(conversationQuotationId);
    const hasQuestionOrClarification =
      /\?|clarify|doubt|please confirm|can you|could you|need clarification|delivery|lead time|discount|best offer|negot/i.test(
        text,
      );

    if (mentionsQuote && hasQuestionOrClarification) {
      const followupType = this.classifyFollowupType(subject, body);
      return {
        classification: MessageClassification.FOLLOWUP,
        confidence: 0.84,
        reason:
          'Followup detected based on quote reference and clarification/negotiation intent',
        followupType,
      };
    }

    if (regexDecision.verdict === 'uncertain') {
      return {
        classification: MessageClassification.RFQ,
        confidence: 0.6,
        reason: regexDecision.reason,
      };
    }

    return {
      classification: MessageClassification.UNKNOWN,
      confidence: 0.35,
      reason: 'No strong RFQ/FOLLOWUP/PO intent signals detected',
    };
  }

  private extractPoNumber(subject: string, body: string): string {
    const text = `${subject || ''}\n${body || ''}`;
    const poMatch = text.match(
      /\b(?:po\s*(?:number|no\.?|#)?\s*[:-]?\s*)([A-Z0-9/-]{4,})\b/i,
    );
    return poMatch?.[1]?.trim() || '';
  }

  private generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    return `INV/${year}-${ts}${rand}`;
  }

  private async ensureInvoiceForQuotation(
    tenantId: string,
    quotationId: string,
    conversationId: string,
  ) {
    const existing = await this.prisma.invoice.findFirst({
      where: {
        tenant_id: tenantId,
        quotation_id: quotationId,
      },
    });

    if (existing) {
      return existing;
    }

    const quotation = await this.prisma.quotation.findFirst({
      where: {
        id: quotationId,
        tenant_id: tenantId,
      },
      include: {
        client: true,
        items: true,
      },
    });

    if (!quotation) {
      return null;
    }

    const companySettings = await this.prisma.settingsCompany.findUnique({
      where: { tenant_id: tenantId },
    });

    return this.prisma.invoice.create({
      data: {
        tenant_id: tenantId,
        quotation_id: quotationId,
        conversation_id: conversationId,
        number: this.generateInvoiceNumber(),
        date: new Date(),
        currency: companySettings?.currency ?? 'INR',
        subtotal: Number(quotation.subtotal) || 0,
        tax: Number(quotation.tax) || 0,
        total: Number(quotation.total) || 0,
        status: 'open',
      },
    });
  }

  private async createAssistanceTicketForFollowup(params: {
    tenantId: string;
    conversationId: string;
    messageId: string;
    type: FollowupType;
  }) {
    const existing = await this.prisma.assistanceTicket.findFirst({
      where: {
        tenant_id: params.tenantId,
        message_id: params.messageId,
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.assistanceTicket.create({
      data: {
        tenant_id: params.tenantId,
        conversation_id: params.conversationId,
        message_id: params.messageId,
        type: params.type,
        status: AssistanceTicketStatus.OPEN,
      },
    });
  }

  private async createOrUpdatePurchaseOrderRecord(params: {
    tenantId: string;
    conversationId: string;
    quotationId?: string | null;
    subject: string;
    body: string;
    confidence: number;
    messageId: string;
  }) {
    const poNumber = this.extractPoNumber(params.subject, params.body);
    const existing = await this.prisma.assistancePurchaseOrder.findFirst({
      where: {
        tenant_id: params.tenantId,
        conversation_id: params.conversationId,
        ...(poNumber ? { po_number: poNumber } : {}),
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const status =
      params.confidence >= 0.95
        ? PurchaseOrderStatus.APPROVED
        : PurchaseOrderStatus.REVIEW_PENDING;

    const extractedData = {
      message_id: params.messageId,
      subject: params.subject,
      body_preview: params.body.slice(0, 500),
      detected_at: new Date().toISOString(),
    } as Prisma.InputJsonValue;

    if (existing) {
      return this.prisma.assistancePurchaseOrder.update({
        where: { id: existing.id },
        data: {
          quotation_id: params.quotationId || existing.quotation_id,
          confidence: params.confidence,
          status,
          po_number: poNumber || existing.po_number,
          extracted_data: extractedData,
        },
      });
    }

    return this.prisma.assistancePurchaseOrder.create({
      data: {
        tenant_id: params.tenantId,
        conversation_id: params.conversationId,
        quotation_id: params.quotationId || undefined,
        po_number: poNumber || undefined,
        extracted_data: extractedData,
        confidence: params.confidence,
        status,
      },
    });
  }

  private isRateLimitError(error: unknown): boolean {
    const message =
      error instanceof Error
        ? error.message.toLowerCase()
        : typeof error === 'string'
          ? error.toLowerCase()
          : '';

    return (
      message.includes('429') ||
      message.includes('rate limited') ||
      message.includes('rate-limited') ||
      message.includes('rate limit')
    );
  }

  private buildStrictJsonMessages(prompt: string) {
    return [
      {
        role: 'system' as const,
        content:
          'You are a strict JSON generation engine. Output exactly one valid JSON object that matches the requested schema. Do not use markdown, code fences, prose, comments, or Python. If unsure, still return valid JSON only.',
      },
      {
        role: 'user' as const,
        content: prompt,
      },
    ];
  }

  private buildRepairPrompt(
    task: 'classifier' | 'extractor',
    originalPrompt: string,
    badResponse: string,
  ) {
    const schema =
      task === 'classifier'
        ? '{"rfq_ids":["id1"],"non_rfq_ids":["id2"],"reasons":{"id1":"short reason"}}'
        : '{"is_rfq":true|false,"confidence":"high|medium|low","reason":"string","items":[{"product_name":"string","quantity":1,"unit":"string","notes":"string"}]}';

    return [
      'Your previous answer did not match the requested JSON schema.',
      'Convert the content below into exactly one valid JSON object and nothing else.',
      'Do not add markdown, code fences, explanations, Python, or comments.',
      `Expected schema: ${schema}`,
      'Original task prompt:',
      originalPrompt,
      'Previous answer to repair:',
      badResponse,
    ].join('\n');
  }

  private isValidTaskResponse(
    task: 'classifier' | 'extractor',
    responseText: string,
  ): boolean {
    const parsed = this.parseJsonFlexible(responseText);
    if (!parsed || typeof parsed !== 'object') {
      return false;
    }

    if (task === 'classifier') {
      return Array.isArray(parsed.rfq_ids) && Array.isArray(parsed.non_rfq_ids);
    }

    return typeof parsed.is_rfq === 'boolean' && Array.isArray(parsed.items);
  }

  private async callGroq(prompt: string, model: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY || '';
    const baseUrl =
      process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';

    if (!apiKey) {
      throw new Error('Groq API key missing: set GROQ_API_KEY');
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: this.buildStrictJsonMessages(prompt),
      }),
    });

    if (!res.ok) {
      throw this.buildProviderHttpError('Groq', res);
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = String(payload.choices?.[0]?.message?.content || '').trim();
    if (!text) {
      throw new Error('Groq response did not include output text');
    }

    return text;
  }

  private async callOpenRouter(prompt: string, model: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const baseUrl =
      process.env.OPENROUTER_BASE_URL ||
      'https://openrouter.ai/api/v1/chat/completions';

    if (!apiKey) {
      throw new Error('OpenRouter API key missing: set OPENROUTER_API_KEY');
    }

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer':
          process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'Quotebot ERP',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: this.buildStrictJsonMessages(prompt),
      }),
    });

    if (!res.ok) {
      throw this.buildProviderHttpError('OpenRouter', res);
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = String(payload.choices?.[0]?.message?.content || '').trim();
    if (!text) {
      throw new Error('OpenRouter response did not include output text');
    }

    return text;
  }

  private async callCerebras(prompt: string, model: string): Promise<string> {
    const apiKey = process.env.CEREBRAS_API_KEY || '';
    const baseUrl =
      process.env.CEREBRAS_BASE_URL || 'https://api.cerebras.ai/v1';

    if (!apiKey) {
      throw new Error('Cerebras API key missing: set CEREBRAS_API_KEY');
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: this.buildStrictJsonMessages(prompt),
      }),
    });

    if (!res.ok) {
      throw this.buildProviderHttpError('Cerebras', res);
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = String(payload.choices?.[0]?.message?.content || '').trim();
    if (!text) {
      throw new Error('Cerebras response did not include output text');
    }

    return text;
  }

  private async callOpenAiCompatible(
    prompt: string,
    model: string,
    apiKey: string,
    baseUrl: string,
    providerName: string,
  ): Promise<string> {
    if (!apiKey) {
      throw new Error(`${providerName} API key missing`);
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: this.buildStrictJsonMessages(prompt),
      }),
    });

    if (!res.ok) {
      throw this.buildProviderHttpError(providerName, res);
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = String(payload.choices?.[0]?.message?.content || '').trim();
    if (!text) {
      throw new Error(`${providerName} response did not include output text`);
    }

    return text;
  }

  private async callTogether(prompt: string, model: string): Promise<string> {
    return this.callOpenAiCompatible(
      prompt,
      model,
      process.env.TOGETHER_API_KEY || '',
      process.env.TOGETHER_BASE_URL || 'https://api.together.xyz/v1',
      'Together',
    );
  }

  private async callMistral(prompt: string, model: string): Promise<string> {
    return this.callOpenAiCompatible(
      prompt,
      model,
      process.env.MISTRAL_API_KEY || '',
      process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1',
      'Mistral',
    );
  }

  private async callDeepSeek(prompt: string, model: string): Promise<string> {
    return this.callOpenAiCompatible(
      prompt,
      model,
      process.env.DEEPSEEK_API_KEY || '',
      process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      'DeepSeek',
    );
  }

  private async callGemini(prompt: string, model: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY || '';
    const baseUrl =
      process.env.GEMINI_BASE_URL ||
      'https://generativelanguage.googleapis.com/v1beta/models';

    if (!apiKey) {
      throw new Error('Gemini API key missing: set GEMINI_API_KEY');
    }

    const encodedModel = encodeURIComponent(model);
    const res = await fetch(
      `${baseUrl}/${encodedModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
          },
        }),
      },
    );

    if (!res.ok) {
      throw this.buildProviderHttpError('Gemini', res);
    }

    const payload = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const parts = payload.candidates?.[0]?.content?.parts || [];
    const text = parts
      .map((part) => (typeof part.text === 'string' ? part.text.trim() : ''))
      .filter(Boolean)
      .join('\n')
      .trim();

    if (!text) {
      throw new Error('Gemini response did not include output text');
    }

    return text;
  }

  private async callProviderWithRetry(
    provider:
      | 'groq'
      | 'cerebras'
      | 'gemini'
      | 'together'
      | 'mistral'
      | 'deepseek'
      | 'openrouter',
    prompt: string,
    model: string,
  ): Promise<string> {
    const scopedMaxRetries =
      process.env.RFQ_CLASSIFIER_MAX_RETRIES !== undefined &&
      prompt.includes('TASK: Classify each email as RFQ or non-RFQ.')
        ? Number(process.env.RFQ_CLASSIFIER_MAX_RETRIES)
        : Number(process.env.RFQ_LLM_MAX_RETRIES || 2);
    const maxRetries = Math.min(Math.max(scopedMaxRetries, 0), 6);
    const retryBaseMs = Math.min(
      Math.max(Number(process.env.RFQ_LLM_RETRY_BASE_MS || 1000), 200),
      10000,
    );

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const cooldownUntil = this.providerCooldownUntilMs.get(provider) || 0;
      const now = Date.now();
      if (cooldownUntil > now) {
        const waitMs = cooldownUntil - now;
        this.logger.debug(
          `${provider} cooldown active; waiting ${waitMs}ms before retrying`,
        );
        await this.sleep(waitMs);
      }

      try {
        if (provider === 'groq') {
          return await this.callGroq(prompt, model);
        }

        if (provider === 'together') {
          return await this.callTogether(prompt, model);
        }

        if (provider === 'mistral') {
          return await this.callMistral(prompt, model);
        }

        if (provider === 'deepseek') {
          return await this.callDeepSeek(prompt, model);
        }

        if (provider === 'cerebras') {
          return await this.callCerebras(prompt, model);
        }

        if (provider === 'openrouter') {
          return await this.callOpenRouter(prompt, model);
        }

        return await this.callGemini(prompt, model);
      } catch (error: unknown) {
        const message = this.errorToMessage(error);
        lastError = error instanceof Error ? error : new Error(message);
        const typedError = error as Error & {
          statusCode?: number;
          retryAfterMs?: number;
        };
        const is429 =
          typedError.statusCode === 429 || this.isRateLimitError(message);
        const retryAfterMs =
          typeof typedError.retryAfterMs === 'number' &&
          typedError.retryAfterMs > 0
            ? typedError.retryAfterMs
            : undefined;

        if (
          attempt < maxRetries &&
          (is429 || message.toLowerCase().includes('timeout'))
        ) {
          const delayMs = Math.max(
            retryAfterMs || 0,
            retryBaseMs * Math.pow(2, attempt),
          );

          if (is429) {
            this.providerCooldownUntilMs.set(provider, Date.now() + delayMs);
          }

          this.logger.warn(
            `${provider} request failed (${message}). Retry ${attempt + 1}/${maxRetries} in ${delayMs}ms`,
          );
          await this.sleep(delayMs);
          continue;
        }

        break;
      }
    }

    throw lastError || new Error(`${provider} request failed`);
  }

  private resolveProviderModel(
    provider:
      | 'groq'
      | 'cerebras'
      | 'gemini'
      | 'together'
      | 'mistral'
      | 'deepseek'
      | 'openrouter',
    task: 'classifier' | 'extractor',
  ): string {
    if (provider === 'groq') {
      return (
        (task === 'classifier'
          ? process.env.GROQ_CLASSIFIER_MODEL
          : process.env.GROQ_EXTRACTION_MODEL) ||
        process.env.GROQ_MODEL ||
        'openai/gpt-oss-20b'
      );
    }

    if (provider === 'cerebras') {
      return (
        (task === 'classifier'
          ? process.env.CEREBRAS_CLASSIFIER_MODEL
          : process.env.CEREBRAS_EXTRACTION_MODEL) ||
        process.env.CEREBRAS_MODEL ||
        'llama3.1-8b'
      );
    }

    if (provider === 'together') {
      return (
        (task === 'classifier'
          ? process.env.TOGETHER_CLASSIFIER_MODEL
          : process.env.TOGETHER_EXTRACTION_MODEL) ||
        process.env.TOGETHER_MODEL ||
        'mistralai/Mistral-Nemo-Instruct-2407'
      );
    }

    if (provider === 'mistral') {
      return (
        (task === 'classifier'
          ? process.env.MISTRAL_CLASSIFIER_MODEL
          : process.env.MISTRAL_EXTRACTION_MODEL) ||
        process.env.MISTRAL_MODEL ||
        'open-mistral-nemo'
      );
    }

    if (provider === 'deepseek') {
      return (
        (task === 'classifier'
          ? process.env.DEEPSEEK_CLASSIFIER_MODEL
          : process.env.DEEPSEEK_EXTRACTION_MODEL) ||
        process.env.DEEPSEEK_MODEL ||
        'deepseek-chat'
      );
    }

    if (provider === 'openrouter') {
      return (
        (task === 'classifier'
          ? process.env.OPENROUTER_CLASSIFIER_MODEL
          : process.env.OPENROUTER_EXTRACTION_MODEL) ||
        process.env.OPENROUTER_MODEL ||
        'google/gemma-3-27b-it:free'
      );
    }

    return (
      (task === 'classifier'
        ? process.env.GEMINI_CLASSIFIER_MODEL
        : process.env.GEMINI_EXTRACTION_MODEL) ||
      process.env.GEMINI_MODEL ||
      'gemini-2.5-flash-lite'
    );
  }

  private async callLlmWithFallbacks(
    prompt: string,
    task: 'classifier' | 'extractor',
  ): Promise<string> {
    const defaultOrder: Array<
      | 'groq'
      | 'cerebras'
      | 'gemini'
      | 'together'
      | 'mistral'
      | 'deepseek'
      | 'openrouter'
    > = [
      'groq',
      'mistral',
      'gemini',
      'openrouter',
      'cerebras',
      'together',
      'deepseek',
    ];
    const configuredOrder = (process.env.RFQ_LLM_FALLBACK_ORDER || '')
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(
        (
          x,
        ): x is
          | 'groq'
          | 'cerebras'
          | 'gemini'
          | 'together'
          | 'mistral'
          | 'deepseek'
          | 'openrouter' =>
          x === 'groq' ||
          x === 'cerebras' ||
          x === 'gemini' ||
          x === 'together' ||
          x === 'mistral' ||
          x === 'deepseek' ||
          x === 'openrouter',
      );
    const classifierPreferredOrder: Array<
      | 'groq'
      | 'cerebras'
      | 'gemini'
      | 'together'
      | 'mistral'
      | 'deepseek'
      | 'openrouter'
    > = [
      'groq',
      'cerebras',
      'mistral',
      'openrouter',
      'gemini',
      'together',
      'deepseek',
    ];

    const order =
      task === 'classifier' && configuredOrder.length === 0
        ? classifierPreferredOrder
        : configuredOrder.length > 0
          ? configuredOrder
          : defaultOrder;

    this.logger.log(`🔗 LLM fallback chain for ${task}: ${order.join(' → ')}`);

    let lastError: Error | null = null;
    for (const provider of order) {
      const model = this.resolveProviderModel(provider, task);
      this.logger.debug(
        `Attempting ${provider} (model: ${model}) for ${task}...`,
      );
      try {
        const result = await this.callProviderWithRetry(
          provider,
          prompt,
          model,
        );

        if (this.isValidTaskResponse(task, result)) {
          this.logger.log(`✅ ${provider} succeeded for ${task}`);
          return result;
        }

        this.logger.warn(
          `⚠️ ${provider} returned non-JSON or invalid schema for ${task}; attempting repair...`,
        );

        const repaired = await this.callProviderWithRetry(
          provider,
          this.buildRepairPrompt(task, prompt, result),
          model,
        );

        if (this.isValidTaskResponse(task, repaired)) {
          this.logger.log(`✅ ${provider} repaired successfully for ${task}`);
          return repaired;
        }

        throw new Error('Provider output did not match expected JSON schema');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `❌ ${provider} failed for ${task} (${model}): ${message}`,
        );
        lastError = error instanceof Error ? error : new Error(message);
      }
    }

    throw lastError || new Error('All configured LLM providers failed');
  }

  private async callLlmExtraction(
    subject: string,
    body: string,
  ): Promise<LlmExtractionResult> {
    const prompt = [
      'TASK: Extract RFQ intent and line items from the email below.',
      'OUTPUT CONTRACT:',
      '- Return exactly one valid JSON object and nothing else.',
      '- No markdown, no code fences, no explanation, no Python, no comments.',
      '- Use double quotes for all strings.',
      '- Use the exact keys shown below and no extra keys.',
      'Schema:',
      '{"is_rfq":true|false,"confidence":"high|medium|low","reason":"string","items":[{"product_name":"string","quantity":1,"unit":"string","notes":"string"}]}',
      'Rules:',
      '- Mark is_rfq=true only if this is a quotation/proforma/pricing request.',
      '- Extract every concrete purchasable line item.',
      '- Each item with a distinct product and quantity must become a separate array entry.',
      '- Quantity must come directly from the email and be numeric.',
      '- Do not invent items or quantities.',
      '- If the email is not an RFQ, set is_rfq=false and return items as an empty array.',
      `Subject: ${subject || '(No subject)'}`,
      `Body: ${body || ''}`,
    ].join('\n');

    // Rate limit before calling LLM
    await this.rateLimitLlmCall();

    const responseText = await this.callLlmWithFallbacks(prompt, 'extractor');

    const parsed = this.parseJsonFlexible(responseText);
    if (!parsed) {
      throw new Error('LLM output invalid JSON');
    }

    const confidenceRaw = this.asText(parsed.confidence, 'low').toLowerCase();
    const confidence: 'high' | 'medium' | 'low' =
      confidenceRaw === 'high' || confidenceRaw === 'medium'
        ? confidenceRaw
        : 'low';

    return {
      is_rfq: Boolean(parsed.is_rfq),
      confidence,
      reason: this.asText(parsed.reason, ''),
      items: this.sanitizeItems(parsed.items),
    };
  }

  private async classifyRfqBatch(
    messages: BatchCandidateMessage[],
  ): Promise<BatchClassificationResult> {
    if (messages.length === 0) {
      return { rfq_ids: [], non_rfq_ids: [] };
    }

    const payloadJson = JSON.stringify(messages);
    const payloadSize = Buffer.byteLength(payloadJson, 'utf8');
    const maxPayloadBytes = 30 * 1024; // 30 KB limit for safety

    // If batch is too large, split it in half and process recursively
    if (payloadSize > maxPayloadBytes) {
      if (messages.length === 1) {
        throw new Error(
          `Single message payload exceeds max size (${payloadSize} > ${maxPayloadBytes})`,
        );
      }

      this.logger.warn(
        `Batch RFQ classification payload too large (${payloadSize} bytes), splitting batch of ${messages.length} messages in half`,
      );

      const midpoint = Math.ceil(messages.length / 2);
      const [firstHalf, secondHalf] = [
        messages.slice(0, midpoint),
        messages.slice(midpoint),
      ];

      const [firstResult, secondResult] = await Promise.all([
        this.classifyRfqBatch(firstHalf),
        this.classifyRfqBatch(secondHalf),
      ]);

      return {
        rfq_ids: [...firstResult.rfq_ids, ...secondResult.rfq_ids],
        non_rfq_ids: [...firstResult.non_rfq_ids, ...secondResult.non_rfq_ids],
        reasons: {
          ...firstResult.reasons,
          ...secondResult.reasons,
        },
      };
    }

    // Rate limit before calling LLM
    await this.rateLimitLlmCall();

    const prompt = [
      'TASK: Classify each email as RFQ or non-RFQ.',
      'OUTPUT CONTRACT:',
      '- Return exactly one valid JSON object and nothing else.',
      '- No markdown, no code fences, no explanation, no Python, no comments.',
      '- Use double quotes for all strings.',
      '- Use the exact keys shown below and no extra keys.',
      'Schema:',
      '{"rfq_ids":["id1"],"non_rfq_ids":["id2"],"reasons":{"id1":"short reason"}}',
      'Rules:',
      '- RFQ means a clear request for quote/pricing/proforma with purchasable intent.',
      '- Non-RFQ includes newsletters, notifications, greetings, alerts, internal updates.',
      '- Body may be a partial snippet; favor recall over precision.',
      '- If unsure, mark as RFQ to avoid false negatives.',
      '- Every input id must appear in either rfq_ids or non_rfq_ids.',
      `Input JSON: ${payloadJson}`,
    ].join('\n');

    const responseText = await this.callLlmWithFallbacks(prompt, 'classifier');

    const parsed = this.parseJsonFlexible(responseText);
    if (!parsed) {
      throw new Error('Batch classifier output invalid JSON');
    }

    const rfqIds = Array.isArray(parsed.rfq_ids)
      ? parsed.rfq_ids.map((x) => this.asText(x, '')).filter(Boolean)
      : [];
    const nonRfqIds = Array.isArray(parsed.non_rfq_ids)
      ? parsed.non_rfq_ids.map((x) => this.asText(x, '')).filter(Boolean)
      : [];

    const reasonsRaw =
      parsed.reasons &&
      typeof parsed.reasons === 'object' &&
      !Array.isArray(parsed.reasons)
        ? (parsed.reasons as Record<string, unknown>)
        : {};

    const reasons: Record<string, string> = {};
    for (const [id, value] of Object.entries(reasonsRaw)) {
      const normalized = this.asText(value, '').trim();
      if (normalized) {
        reasons[id] = normalized;
      }
    }

    const inputIds = new Set(messages.map((message) => message.id));
    const rfqSet = new Set(rfqIds.filter((id) => inputIds.has(id)));
    const nonRfqSet = new Set(nonRfqIds.filter((id) => inputIds.has(id)));

    for (const id of inputIds) {
      if (!rfqSet.has(id) && !nonRfqSet.has(id)) {
        nonRfqSet.add(id);
      }
    }

    return {
      rfq_ids: Array.from(rfqSet),
      non_rfq_ids: Array.from(nonRfqSet),
      reasons,
    };
  }

  private async classifyRfqCandidatesInBatches(
    candidates: BatchCandidateMessage[],
  ): Promise<BatchClassificationResult> {
    if (candidates.length === 0) {
      return { rfq_ids: [], non_rfq_ids: [], reasons: {} };
    }

    const result: BatchClassificationResult = {
      rfq_ids: [],
      non_rfq_ids: [],
      reasons: {},
    };

    const batches: BatchCandidateMessage[][] = [];
    let currentBatch: BatchCandidateMessage[] = [];

    const pushBatch = () => {
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
      }
    };

    for (const candidate of candidates) {
      const tentative = [...currentBatch, candidate];
      const tentativeSize = Buffer.byteLength(
        JSON.stringify(tentative),
        'utf8',
      );

      if (
        currentBatch.length > 0 &&
        (tentativeSize > this.classifierBatchMaxBytes ||
          currentBatch.length >= this.classifierBatchSize)
      ) {
        pushBatch();
      }

      currentBatch.push(candidate);
    }

    pushBatch();

    const totalBatches = Math.max(batches.length, 1);
    const runStart = Date.now();

    for (let index = 0; index < batches.length; index += 1) {
      const batchIndex = index + 1;
      const batch = batches[index];
      const batchStart = Date.now();
      const batchResult = await this.classifyRfqBatch(batch);
      const batchDurationMs = Date.now() - batchStart;
      const elapsedMs = Date.now() - runStart;

      result.rfq_ids.push(...batchResult.rfq_ids);
      result.non_rfq_ids.push(...batchResult.non_rfq_ids);
      result.reasons = {
        ...(result.reasons || {}),
        ...(batchResult.reasons || {}),
      };

      this.logger.log(
        `[RFQ_TIMING] classify_batch ${batchIndex}/${totalBatches} size=${batch.length} took=${batchDurationMs}ms elapsed=${elapsedMs}ms avg_per_email=${Math.round(batchDurationMs / Math.max(batch.length, 1))}ms`,
      );
    }

    return result;
  }

  private async updateMessageProcessing(
    messageId: string,
    patch: Record<string, unknown>,
    options: {
      status?: 'pending' | 'parsed' | 'failed';
      isProcessed?: boolean;
      classification?: MessageClassification;
      classificationConfidence?: number;
      followupType?: FollowupType | null;
    } = {},
  ) {
    const existing = await this.prisma.message.findFirst({
      where: { id: messageId },
      select: { raw_payload: true },
    });

    const basePayload =
      existing?.raw_payload &&
      typeof existing.raw_payload === 'object' &&
      !Array.isArray(existing.raw_payload)
        ? (existing.raw_payload as Record<string, unknown>)
        : {};

    const mergedPayload = {
      ...basePayload,
      ...patch,
    } as Prisma.InputJsonValue;

    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        processing_status: options.status || 'parsed',
        is_processed:
          typeof options.isProcessed === 'boolean'
            ? options.isProcessed
            : options.status === 'pending'
              ? false
              : true,
        raw_payload: mergedPayload,
        ...(options.classification
          ? { classification: options.classification }
          : {}),
        ...(typeof options.classificationConfidence === 'number'
          ? { classification_confidence: options.classificationConfidence }
          : {}),
        ...(options.followupType !== undefined
          ? { followup_type: options.followupType }
          : {}),
        updated_at: new Date(),
      },
    });
  }

  private async rateLimitLlmCall(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    // Remove timestamps older than 1 minute
    this.llmCallTimestamps = this.llmCallTimestamps.filter(
      (ts) => ts > oneMinuteAgo,
    );

    // If at or over limit, wait until the oldest call is older than 1 minute
    if (this.llmCallTimestamps.length >= this.llmRateLimitPerMinute) {
      const oldestTimestamp = this.llmCallTimestamps[0];
      const waitMs = Math.max(0, oneMinuteAgo + 1000 - oldestTimestamp);

      if (waitMs > 0) {
        this.logger.debug(
          `LLM rate limit active (${this.llmCallTimestamps.length}/${this.llmRateLimitPerMinute}), waiting ${waitMs}ms...`,
        );
        await this.sleep(waitMs);
      }
    }

    this.llmCallTimestamps.push(now);
  }

  private isPayloadTooLargeError(error: unknown): boolean {
    const message = this.errorToMessage(error);
    return (
      message.includes('413') ||
      message.toLowerCase().includes('payload too large') ||
      message.toLowerCase().includes('request entity too large')
    );
  }

  private isRateLimitOrTemporary(error: unknown): boolean {
    const message = this.errorToMessage(error);
    const normalized = message.toLowerCase();
    return (
      normalized.includes('429') ||
      normalized.includes('rate limit') ||
      normalized.includes('rate-limit') ||
      normalized.includes('timeout') ||
      normalized.includes('temporarily') ||
      normalized.includes('overloaded')
    );
  }

  private getMessageRetryBackoffMs(message: {
    raw_payload?: unknown;
    created_at?: Date;
    updated_at?: Date;
  }): number {
    // Extract retry_count from raw_payload
    const rawPayload =
      message.raw_payload &&
      typeof message.raw_payload === 'object' &&
      !Array.isArray(message.raw_payload)
        ? (message.raw_payload as Record<string, unknown>)
        : {};

    const retryCount = Number(rawPayload.retry_count || 0);
    const lastAttemptTime = message.updated_at?.getTime() || Date.now();
    const timeSinceLastAttempt = Date.now() - lastAttemptTime;

    // Exponential backoff: 5m, 15m, 45m, 2h, 6h, 24h
    const backoffMs =
      [5, 15, 45, 120, 360, 1440][Math.min(retryCount, 5)] * 60 * 1000;
    return Math.max(0, backoffMs - timeSinceLastAttempt);
  }

  /*
  async processPendingMessages(
    options: { tenantId?: string; limit?: number } = {},
  ) {
    if (this.isRunning) {
      return { started: false, reason: 'Pipeline already running' };
    }

    this.isRunning = true;
    const runStartedAt = Date.now();
    const summary = {
      scanned: 0,
      created_rfqs: 0,
      non_rfq: 0,
      unresolved: 0,
      llm_errors: 0,
      skipped: 0,
      followups: 0,
      po_detected: 0,
      unknown: 0,
    };

    try {
      const take = Math.min(
        Math.max(Number(options.limit || this.runBatchLimit), 1),
        250,
      );
      
      // Query both pending messages and failed messages ready for retry
      const [pending, failedForRetry] = await Promise.all([
        this.prisma.message.findMany({
          where: {
            direction: 'inbound',
            processing_status: 'pending',
            ...(options.tenantId ? { tenant_id: options.tenantId } : {}),
          },
          orderBy: { created_at: 'asc' },
          include: {
            conversation: true,
          },
          take,
        }),
        // Get failed messages that are due for retry (max 5 retries, exponential backoff)
        this.prisma.message.findMany({
          where: {
            direction: 'inbound',
            processing_status: 'failed',
            ...(options.tenantId ? { tenant_id: options.tenantId } : {}),
          },
          orderBy: { updated_at: 'asc' },
          take: Math.max(1, Math.ceil(take / 3)), // Reserve some quota for retrying failed messages
        }),
      ]);

      // Filter failed messages that are due for retry
      const failedDueForRetry = failedForRetry.filter((msg) => {
        const remainingBackoffMs = this.getMessageRetryBackoffMs(msg);
        return remainingBackoffMs === 0;
      });

      // Requeue failed messages by resetting status to pending
      for (const failedMsg of failedDueForRetry) {
        const rawPayload =
          failedMsg.raw_payload &&
          typeof failedMsg.raw_payload === 'object' &&
          !Array.isArray(failedMsg.raw_payload)
            ? (failedMsg.raw_payload as Record<string, unknown>)
            : {};

        const retryCount = Number(rawPayload.retry_count || 0);
        
        await this.updateMessageProcessing(
          failedMsg.id,
          {
            ...rawPayload,
            retry_count: retryCount + 1,
            last_auto_retry_at: new Date(),
            parsing_error: '', // Clear the error since we're retrying
          },
          {
            status: 'pending',
            isProcessed: false,
          },
        );

        this.logger.log(
          `Auto-requeued failed message (id: ${failedMsg.id}, retry: ${retryCount + 1}/${5})`,
        );
      }

      // Combine pending messages with newly requeued failed messages
      const allMessages = [...pending, ...failedDueForRetry];
      const batchCandidates: BatchCandidateMessage[] = allMessages.map(
        (message) => {
          const rawPayload =
            message.raw_payload &&
            typeof message.raw_payload === 'object' &&
            !Array.isArray(message.raw_payload)
              ? (message.raw_payload as Record<string, unknown>)
              : {};

          return {
            id: message.id,
            subject: String(message.conversation?.subject || ''),
            body: this.asText(rawPayload.body_text, message.body || ''),
          };
        },
      );

      const pendingById = new Map(
        allMessages.map((message) => [message.id, message]),
      );

      summary.scanned = allMessages.length;

      const batchCandidates: BatchCandidateMessage[] = pending.map(
        (message) => {
          const rawPayload =
            message.raw_payload &&
            typeof message.raw_payload === 'object' &&
            !Array.isArray(message.raw_payload)
              ? (message.raw_payload as Record<string, unknown>)
              : {};

          return {
            id: message.id,
            subject: String(message.conversation?.subject || ''),
            body: this.asText(rawPayload.body_text, message.body || ''),
          };
        },
      );

      const pendingById = new Map(
        pending.map((message) => [message.id, message]),
      );
      const regexRfqCandidates: BatchCandidateMessage[] = [];
      const uncertainCandidates: BatchCandidateMessage[] = [];

      for (const candidate of batchCandidates) {
        const message = pendingById.get(candidate.id);
        if (!message) {
          continue;
        }

        const regexDecision = this.classifyRfqByRegex(
          candidate.subject,
            {
              parsing_source: 'backend_regex_classifier',
              parsing_confidence: regexDecision.confidence,
              parsing_error: '',
              parsed_items: [],
              auto_rfq_created: false,
              pipeline_stage: 'extracting_items_regex_gate',
            },
            {
              status: 'pending',
              isProcessed: false,
            },
          );
          continue;
        }

        uncertainCandidates.push(candidate);
      }

      let classification: BatchClassificationResult = {
        rfq_ids: [],
        non_rfq_ids: [],
        reasons: {},
      };
      let classificationFailedForUncertain = false;
      if (uncertainCandidates.length > 0) {
        try {
          classification = await this.classifyRfqBatch(uncertainCandidates);
        } catch (error: unknown) {
          const message = (error as Error).message;
          const isRateLimited = this.isRateLimitOrTemporary(error);
          classificationFailedForUncertain = true;

          for (const candidate of uncertainCandidates) {
            const pendingMessage = pendingById.get(candidate.id);
            if (!pendingMessage) {
              continue;
            }

            await this.updateMessageProcessing(
              pendingMessage.id,
              {
                parsing_source: 'backend_llm_classifier',
                parsing_confidence: 'low',
                parsing_error: isRateLimited
                  ? `Batch RFQ classification temporarily rate-limited or overloaded. Message kept pending for automatic retry. Details: ${message}`
                  : `Batch RFQ classification failed. All providers exhausted. Details: ${message}`,
                parsed_items: [],
                auto_rfq_created: false,
                pipeline_stage: isRateLimited
                  ? 'classification_rate_limited'
                  : 'classification_failed',
              },
              {
                status: isRateLimited ? 'pending' : 'failed',
                isProcessed: isRateLimited ? false : undefined,
              },
            );
          }

          summary.llm_errors += uncertainCandidates.length;
          if (isRateLimited) {
            summary.skipped += uncertainCandidates.length;
          }
        }
      }

      const llmRfqIdSet = new Set(classification.rfq_ids);

      if (!classificationFailedForUncertain) {
        for (const candidate of uncertainCandidates) {
          const message = pendingById.get(candidate.id);
          if (!message) {
            continue;
          }

          if (!llmRfqIdSet.has(candidate.id)) {
            summary.non_rfq += 1;
            await this.updateMessageProcessing(message.id, {
              parsing_source: 'backend_llm_classifier',
              parsing_confidence: 'medium',
              parsing_error:
                classification.reasons?.[candidate.id] ||
                'Classified as non-RFQ email',
              parsed_items: [],
              auto_rfq_created: false,
              pipeline_stage: 'classified_non_rfq',
            });
            continue;
          }

          await this.updateMessageProcessing(
            message.id,
            {
              parsing_source: 'backend_llm_classifier',
              parsing_confidence: 'medium',
              parsing_error: classification.reasons?.[candidate.id] || '',
              parsed_items: [],
              auto_rfq_created: false,
              pipeline_stage: 'extracting_items',
            },
            {
              status: 'pending',
              isProcessed: false,
            },
          );
        }
      }

      const extractionCandidates: BatchCandidateMessage[] = [
        ...regexRfqCandidates,
        ...uncertainCandidates.filter((candidate) =>
          llmRfqIdSet.has(candidate.id),
        ),
      ];

      for (const candidate of extractionCandidates) {
        const message = pendingById.get(candidate.id);
        if (!message) {
          continue;
        }

        // TEMPORARY: Disable regex extraction, use LLM-only
        // const regexItems = this.regexExtract(candidate.body);
        // let combinedItems = this.sanitizeItems(regexItems);
        let combinedItems: LlmItem[] = [];
        let parsingSource = 'backend_llm_pipeline';
        let parsingConfidence: 'high' | 'medium' | 'low' = 'medium';
        let usedLlmExtraction = false;

        // Compute regex confidence (always 0 since regex disabled)
        const regexQuantityConfidence = 0;

        // LLM extraction (enabled)
        let llm: LlmExtractionResult;
        try {
          llm = await this.callLlmExtraction(candidate.subject, candidate.body);
          usedLlmExtraction = true;
          this.logger.debug(
            `[LLM-ONLY DEBUG] Raw LLM response: is_rfq=${llm.is_rfq}, confidence=${llm.confidence}, items_count=${llm.items?.length || 0}, items=${JSON.stringify(llm.items)}`,
          );
          const llmItems = this.sanitizeItems(llm.items);
          this.logger.debug(
            `[LLM-ONLY DEBUG] After sanitize: items_count=${llmItems.length}, items=${JSON.stringify(llmItems)}`,
          );

          // Use LLM items if they exist, or if regex had no items
          if (
            llmItems.length > 0 &&
            (combinedItems.length === 0 ||
              llmItems.length > combinedItems.length)
          ) {
            combinedItems = llmItems;
            parsingSource = 'backend_llm_pipeline';
            parsingConfidence = llm.confidence;
            this.logger.debug(
              `[LLM-ONLY DEBUG] Using LLM items: ${llmItems.length} items, confidence=${parsingConfidence}`,
            );
          } else if (combinedItems.length > 0) {
            // Regex had items but low confidence; keep regex but mark as attempted LLM
            parsingConfidence =
              regexQuantityConfidence >= 70
                ? 'high'
                : regexQuantityConfidence >= 40
                  ? 'medium'
                  : 'low';
          }
        } catch (error: unknown) {
          summary.llm_errors += 1;
          const rateLimited = this.isRateLimitError(error);
          if (rateLimited) {
            summary.skipped += 1;
          }

          // If regex had items, use them; otherwise mark as failed
          if (combinedItems.length > 0) {
            parsingConfidence =
              regexQuantityConfidence >= 70
                ? 'high'
                : regexQuantityConfidence >= 40
                  ? 'medium'
                  : 'low';
            this.logger.warn(
              `LLM fallback extraction failed but regex items available: ${(error as Error).message}`,
            );
          } else {
            await this.updateMessageProcessing(
              message.id,
              {
                parsing_source: 'backend_llm_extractor',
                parsing_confidence: 'low',
                parsing_error: rateLimited
                  ? 'LLM extraction temporarily rate-limited (429). Message kept pending for automatic retry.'
                  : `LLM extraction failed: ${(error as Error).message}`,
                parsed_items: [],
                auto_rfq_created: false,
                pipeline_stage: rateLimited
                  ? 'extraction_rate_limited'
                  : 'extraction_failed',
              },
              {
                status: rateLimited ? 'pending' : 'failed',
                isProcessed: rateLimited ? false : undefined,
              },
            );
            continue;
          }
        }

        if (combinedItems.length === 0) {
          summary.unresolved += 1;
          await this.updateMessageProcessing(message.id, {
            parsing_source: 'rfq_unresolved',
            parsing_confidence: parsingConfidence,
            parsing_error:
              'RFQ detected but no valid line items with explicit quantity found',
            parsed_items: [],
            auto_rfq_created: false,
            pipeline_stage: 'extraction_completed',
          });
          continue;
        }

        const preview = await this.rfqsService.previewFromEmail(
          message.tenant_id,
          {
            client_email: message.sender_email,
            message_id: message.id,
            items: combinedItems,
          },
        );

        const matchedItems = Array.isArray(preview.matched_items)
          ? (preview.matched_items as LlmItem[])
          : [];

        if (matchedItems.length === 0) {
          summary.unresolved += 1;
          await this.updateMessageProcessing(message.id, {
            parsing_source: 'rfq_unresolved',
            parsing_confidence: parsingConfidence,
            parsing_error: String(
              preview.summary || 'No valid catalog match found',
            ),
            parsed_items: combinedItems,
            rejected_items: preview.unmatched_items,
            auto_rfq_created: false,
            pipeline_stage: 'extraction_completed',
          });
          continue;
        }

        const matchedRatio = matchedItems.length / combinedItems.length;
        const quantityConfidence = this.computeQuantityConfidence(
          matchedItems,
          candidate.body,
        );
        const confidenceScore = Math.round(
          matchedRatio * 45 +
            (parsingConfidence === 'high'
              ? 35
              : parsingConfidence === 'medium'
                ? 20
                : 10) +
            (quantityConfidence / 100) * 20,
        );
        const confidence: 'high' | 'medium' | 'low' =
          confidenceScore >= 75
            ? 'high'
            : confidenceScore >= 50
              ? 'medium'
              : 'low';

        const shouldCreateRfq = confidenceScore > 50;

        if (!shouldCreateRfq) {
          summary.unresolved += 1;
          await this.updateMessageProcessing(message.id, {
            parsing_source: parsingSource,
            parsing_confidence: confidence,
            confidence: confidenceScore,
            quantity_confidence: quantityConfidence,
            parsing_error: `Extraction confidence below threshold (${confidenceScore}/100, needs > 50 for auto RFQ).`,
            parsed_items: matchedItems,
            rejected_items: preview.unmatched_items,
            auto_rfq_created: false,
            pipeline_stage: 'extraction_completed',
          });
          continue;
        }

        try {
          const createdRfq = await this.rfqsService.createFromEmail(message.tenant_id, {
            client_email: message.sender_email,
            message_id: message.id,
            parsing_source: parsingSource,
            parsing_confidence: confidence,
            items: matchedItems,
          });

          await this.updateMessageProcessing(message.id, {
            parsing_source: parsingSource,
            parsing_confidence: confidence,
            confidence: confidenceScore,
            quantity_confidence: quantityConfidence,
            parsed_items: matchedItems,
            rejected_items: preview.unmatched_items,
            auto_rfq_created: true,
            pipeline_stage: 'rfq_created',
          });

          summary.created_rfqs += 1;

          // Auto-create and send quotation (non-blocking)
          void this.autoCreateAndSendQuotation(createdRfq.id, message.tenant_id);
        } catch (error: unknown) {
          if (error instanceof BadRequestException) {
            summary.unresolved += 1;
            await this.updateMessageProcessing(
              message.id,
              {
                parsing_source: parsingSource,
                parsing_confidence: confidence,
                parsing_error: (error as Error).message,
                parsed_items: matchedItems,
                auto_rfq_created: false,
                pipeline_stage: 'rfq_create_failed',
              },
              {
                status: 'failed',
              },
            );
          } else {
            summary.skipped += 1;
            this.logger.warn(
              `Unexpected createFromEmail error for message ${message.id}: ${(error as Error).message}`,
            );
          }
        }

        if (usedLlmExtraction) {
          // Small gap between heavy extraction requests to reduce burst 429s.
          await this.sleep(Number(process.env.RFQ_EXTRACT_DELAY_MS || 250));
        }
      }

      return {
        started: true,
        ...summary,
      };
    } finally {
      this.isRunning = false;
    }
  }
  */

  async processPendingMessages(
    options: { tenantId?: string; limit?: number } = {},
  ) {
    if (this.isRunning) {
      return { started: false, reason: 'Pipeline already running' };
    }

    this.isRunning = true;
    const runStartedAt = Date.now();
    const summary = {
      scanned: 0,
      created_rfqs: 0,
      non_rfq: 0,
      unresolved: 0,
      llm_errors: 0,
      skipped: 0,
      followups: 0,
      po_detected: 0,
      unknown: 0,
    };

    const maxAutoRetries = Math.max(
      0,
      Number(process.env.RFQ_PIPELINE_MAX_AUTO_RETRIES || 5),
    );
    const retryDelayMinutes = [5, 15, 45, 120, 360, 1440];

    const readPayload = (payload: unknown): Record<string, unknown> => {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return {};
      }

      return payload as Record<string, unknown>;
    };

    const getString = (value: unknown, fallback = ''): string => {
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      return fallback;
    };

    const getRetryCount = (payload: Record<string, unknown>): number => {
      const rawCount = Number(
        payload.rfq_pipeline_retry_count ?? payload.retry_count ?? 0,
      );
      return Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 0;
    };

    const getNextRetryAt = (payload: Record<string, unknown>): number => {
      const rawNext =
        payload.rfq_pipeline_next_retry_at ?? payload.next_retry_at ?? '';
      if (typeof rawNext !== 'string' || rawNext.trim().length === 0) {
        return 0;
      }

      const parsed = Date.parse(rawNext);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const isRetryDue = (payload: Record<string, unknown>): boolean => {
      const nextRetryAt = getNextRetryAt(payload);
      return nextRetryAt === 0 || nextRetryAt <= Date.now();
    };

    const classifyFailure = (error: unknown) => {
      const message = this.errorToMessage(error);
      const normalized = message.toLowerCase();

      if (this.isPayloadTooLargeError(error)) {
        return {
          kind: 'payload_too_large',
          retryable: true,
          message,
        };
      }

      if (
        this.isRateLimitOrTemporary(error) ||
        this.isRateLimitError(error) ||
        normalized.includes('timeout') ||
        normalized.includes('temporarily') ||
        normalized.includes('overloaded') ||
        normalized.includes('503') ||
        normalized.includes('502') ||
        normalized.includes('504') ||
        normalized.includes('fetch failed') ||
        normalized.includes('network')
      ) {
        return {
          kind:
            normalized.includes('rate limit') || normalized.includes('429')
              ? 'rate_limited'
              : 'temporary_provider',
          retryable: true,
          message,
        };
      }

      if (
        normalized.includes('invalid json') ||
        normalized.includes('schema') ||
        normalized.includes('non-json') ||
        normalized.includes('unexpected token') ||
        normalized.includes('did not include output text') ||
        normalized.includes('empty response')
      ) {
        return {
          kind: normalized.includes('did not include output text')
            ? 'empty_response'
            : normalized.includes('schema')
              ? 'schema_invalid'
              : 'invalid_json',
          retryable: true,
          message,
        };
      }

      if (
        normalized.includes('missing api key') ||
        normalized.includes('api key missing') ||
        normalized.includes('not configured')
      ) {
        return {
          kind: 'fatal_misconfiguration',
          retryable: false,
          message,
        };
      }

      return {
        kind: 'fatal_provider_failure',
        retryable: false,
        message,
      };
    };

    const computeBackoffMs = (retryCount: number, kind: string): number => {
      const index = Math.min(retryCount, retryDelayMinutes.length - 1);
      const baseDelay = retryDelayMinutes[index] * 60 * 1000;

      if (kind === 'payload_too_large') {
        return 30 * 1000;
      }

      if (
        kind === 'invalid_json' ||
        kind === 'schema_invalid' ||
        kind === 'empty_response'
      ) {
        return Math.max(30 * 1000, Math.min(baseDelay, 5 * 60 * 1000));
      }

      if (kind === 'temporary_provider') {
        return Math.max(60 * 1000, baseDelay);
      }

      return baseDelay;
    };

    const buildRetryPayload = (
      payload: Record<string, unknown>,
      kind: string,
      reason: string,
      retryCount: number,
    ): Record<string, unknown> => {
      const nextRetryAt = new Date(
        Date.now() + computeBackoffMs(retryCount, kind),
      ).toISOString();

      return {
        ...payload,
        rfq_pipeline_retry_count: retryCount + 1,
        rfq_pipeline_last_retry_at: new Date().toISOString(),
        rfq_pipeline_next_retry_at: nextRetryAt,
        rfq_pipeline_last_failure_kind: kind,
        rfq_pipeline_last_failure_reason: reason,
      };
    };

    const compactClassifierPrompt = (messages: BatchCandidateMessage[]) => {
      const compactRows = messages
        .map(
          (message) =>
            `- ${message.id}\n  subject: ${(message.subject || '').slice(0, 120)}\n  body: ${(message.body || '').slice(0, 1800)}`,
        )
        .join('\n');

      return [
        'TASK: Classify each message as RFQ or non-RFQ.',
        'Return exactly one JSON object and nothing else.',
        'Schema: {"rfq_ids":["id1"],"non_rfq_ids":["id2"],"reasons":{"id1":"short reason"}}',
        'Rules: Use RFQ for a request for quote/pricing/proforma.',
        'Body is a snippet; if unsure, mark RFQ to avoid missing true RFQs.',
        compactRows,
      ].join('\n');
    };

    const compactExtractionPrompt = (subject: string, body: string) => {
      return [
        'TASK: Extract RFQ intent and purchasable line items.',
        'Return exactly one JSON object and nothing else.',
        'Schema: {"is_rfq":true|false,"confidence":"high|medium|low","reason":"string","items":[{"product_name":"string","quantity":1,"unit":"string","notes":"string"}]}',
        'Use a compact answer. Do not invent products or quantities.',
        `Subject: ${(subject || '').slice(0, 200)}`,
        `Body: ${(body || '').slice(0, 8000)}`,
      ].join('\n');
    };

    const parseClassification = (
      responseText: string,
      messages: BatchCandidateMessage[],
    ): BatchClassificationResult => {
      const parsed = this.parseJsonFlexible(responseText);
      if (!parsed) {
        throw new Error('Batch classifier output invalid JSON');
      }

      const inputIds = new Set(messages.map((message) => message.id));
      const rfqIds = Array.isArray(parsed.rfq_ids)
        ? parsed.rfq_ids
            .map((value) => getString(value, '').trim())
            .filter((id) => inputIds.has(id))
        : [];
      const nonRfqIds = Array.isArray(parsed.non_rfq_ids)
        ? parsed.non_rfq_ids
            .map((value) => getString(value, '').trim())
            .filter((id) => inputIds.has(id))
        : [];

      const reasonsRaw =
        parsed.reasons &&
        typeof parsed.reasons === 'object' &&
        !Array.isArray(parsed.reasons)
          ? (parsed.reasons as Record<string, unknown>)
          : {};

      const reasons: Record<string, string> = {};
      for (const [key, value] of Object.entries(reasonsRaw)) {
        const reason = getString(value, '').trim();
        if (reason) {
          reasons[key] = reason;
        }
      }

      const rfqSet = new Set(rfqIds);
      const nonRfqSet = new Set(nonRfqIds);
      for (const id of inputIds) {
        if (!rfqSet.has(id) && !nonRfqSet.has(id)) {
          nonRfqSet.add(id);
        }
      }

      return {
        rfq_ids: Array.from(rfqSet),
        non_rfq_ids: Array.from(nonRfqSet),
        reasons,
      };
    };

    const parseExtraction = (responseText: string): LlmExtractionResult => {
      const parsed = this.parseJsonFlexible(responseText);
      if (!parsed) {
        throw new Error('LLM output invalid JSON');
      }

      const confidenceRaw = getString(parsed.confidence, 'low').toLowerCase();
      const confidence: 'high' | 'medium' | 'low' =
        confidenceRaw === 'high' || confidenceRaw === 'medium'
          ? confidenceRaw
          : 'low';

      return {
        is_rfq: Boolean(parsed.is_rfq),
        confidence,
        reason: getString(parsed.reason, ''),
        items: this.sanitizeItems(parsed.items),
      };
    };

    const eligibleMessages: EligibleMessage[] = [];

    try {
      const take = Math.min(Math.max(Number(options.limit || 30), 1), 200);
      const [pendingMessages, failedMessages] = await Promise.all([
        this.prisma.message.findMany({
          where: {
            direction: 'inbound',
            processing_status: 'pending',
            ...(options.tenantId ? { tenant_id: options.tenantId } : {}),
          },
          orderBy: { created_at: 'asc' },
          include: { conversation: true },
          take,
        }),
        this.prisma.message.findMany({
          where: {
            direction: 'inbound',
            processing_status: 'failed',
            ...(options.tenantId ? { tenant_id: options.tenantId } : {}),
          },
          orderBy: { updated_at: 'asc' },
          include: { conversation: true },
          take: Math.max(1, Math.ceil(take / 3)),
        }),
      ]);

      summary.scanned = pendingMessages.length + failedMessages.length;

      for (const message of pendingMessages) {
        const payload = readPayload(message.raw_payload);
        if (!isRetryDue(payload)) {
          summary.skipped += 1;
          continue;
        }

        eligibleMessages.push({
          message,
          payload,
          retryCount: getRetryCount(payload),
        });
      }

      for (const message of failedMessages) {
        const payload = readPayload(message.raw_payload);
        const retryCount = getRetryCount(payload);

        if (retryCount >= maxAutoRetries) {
          summary.skipped += 1;
          continue;
        }

        if (!isRetryDue(payload)) {
          summary.skipped += 1;
          continue;
        }

        const retryPayload = buildRetryPayload(
          payload,
          'auto_retry_requeued',
          'Automatic retry requeued after previous failure.',
          retryCount,
        );

        await this.updateMessageProcessing(
          message.id,
          {
            parsing_source: 'backend_auto_retry',
            parsing_confidence: 'low',
            parsing_error: '',
            parsed_items: [],
            auto_rfq_created: false,
            pipeline_stage: 'retry_requeued',
            ...retryPayload,
          },
          {
            status: 'pending',
            isProcessed: false,
          },
        );

        eligibleMessages.push({
          message,
          payload: retryPayload,
          retryCount: retryCount + 1,
        });
      }

      const pendingById = new Map(
        eligibleMessages.map((entry) => [entry.message.id, entry]),
      );
      const regexRfqCandidates: BatchCandidateMessage[] = [];
      const uncertainCandidates: BatchCandidateMessage[] = [];

      for (const entry of eligibleMessages) {
        const fullBody = this.asText(
          entry.payload.body_text,
          entry.message.body || '',
        );
        const candidate: BatchCandidateMessage = {
          id: entry.message.id,
          subject: getString(entry.message.conversation?.subject, ''),
          body: fullBody,
        };

        // Attempt to resolve thread/conversation by headers, references, quote numbers or subject similarity
        try {
          const resolverResult = await this.threadResolver.resolveConversation(
            entry.message as Record<string, any>,
            entry.payload,
          );
          if (
            resolverResult.conversationId &&
            resolverResult.conversationId !== entry.message.conversation_id
          ) {
            // Re-link message to resolved conversation
            try {
              await this.prisma.message.update({
                where: { id: entry.message.id },
                data: { conversation_id: resolverResult.conversationId },
              });
            } catch (e) {
              this.logger.warn(
                `Failed to update message.conversation_id for ${entry.message.id}: ${e instanceof Error ? e.message : String(e)}`,
              );
            }

            try {
              await this.prisma.conversation.update({
                where: { id: resolverResult.conversationId },
                data: { last_message_at: new Date() },
              });
            } catch (e) {
              this.logger.debug(
                `Failed to update conversation.last_message_at for ${resolverResult.conversationId}: ${e instanceof Error ? e.message : String(e)}`,
              );
            }

            entry.message.conversation_id = resolverResult.conversationId;

            await this.updateMessageProcessing(
              entry.message.id,
              {
                thread_resolver: {
                  matched_by: resolverResult.matchedBy || 'resolver',
                  reason: resolverResult.reason || '',
                },
              },
              { status: 'pending', isProcessed: false },
            );
          }
        } catch (err) {
          this.logger.warn(
            `Thread resolver error for message ${entry.message.id}: ${this.errorToMessage(err)}`,
          );
        }

        const primaryIntent = this.classifyPrimaryIntent(
          candidate.subject,
          candidate.body,
          entry.payload,
          entry.message.conversation?.quotation_id,
        );

        if (primaryIntent.classification === MessageClassification.FOLLOWUP) {
          const followupType =
            primaryIntent.followupType || FollowupType.GENERAL;

          await this.createAssistanceTicketForFollowup({
            tenantId: entry.message.tenant_id,
            conversationId: entry.message.conversation_id,
            messageId: entry.message.id,
            type: followupType,
          });

          await this.prisma.conversation.update({
            where: { id: entry.message.conversation_id },
            data: {
              current_stage: ConversationStage.MANUAL_ASSISTANCE,
            },
          });

          summary.followups += 1;
          await this.updateMessageProcessing(
            candidate.id,
            {
              parsing_source: 'backend_intent_router',
              parsing_confidence: 'medium',
              parsing_error: primaryIntent.reason,
              parsed_items: [],
              auto_rfq_created: false,
              pipeline_stage: 'followup_ticket_created',
            },
            {
              status: 'parsed',
              classification: MessageClassification.FOLLOWUP,
              classificationConfidence: primaryIntent.confidence,
              followupType,
            },
          );
          continue;
        }

        if (primaryIntent.classification === MessageClassification.PO) {
          const poRecord = await this.createOrUpdatePurchaseOrderRecord({
            tenantId: entry.message.tenant_id,
            conversationId: entry.message.conversation_id,
            quotationId: entry.message.conversation?.quotation_id,
            subject: candidate.subject,
            body: candidate.body,
            confidence: primaryIntent.confidence,
            messageId: entry.message.id,
          });

          // Compute detailed PO match confidence
          const match = await this.poMatcher.scorePurchaseOrder({
            tenantId: entry.message.tenant_id,
            conversationId: entry.message.conversation_id,
            messageBody: candidate.body,
            messageSubject: candidate.subject,
            poRecordId: poRecord.id,
            quotationId: entry.message.conversation?.quotation_id,
          });

          const percent = Number(match?.percent || 0);

          // Decide status thresholds
          let newStatus = poRecord.status;
          if (percent >= 95) newStatus = PurchaseOrderStatus.APPROVED;
          else if (percent >= 70)
            newStatus = PurchaseOrderStatus.REVIEW_PENDING;
          else newStatus = PurchaseOrderStatus.DETECTED;

          await this.prisma.assistancePurchaseOrder.update({
            where: { id: poRecord.id },
            data: { confidence: percent, status: newStatus },
          });

          // If high confidence and quotation present, auto-generate invoice
          if (percent >= 95 && entry.message.conversation?.quotation_id) {
            const invoice = await this.ensureInvoiceForQuotation(
              entry.message.tenant_id,
              entry.message.conversation.quotation_id,
              entry.message.conversation_id,
            );

            // Attempt to send invoice email immediately using conversation's email account
            if (invoice && entry.message.conversation?.email_account_id) {
              const to = [String(entry.message.sender_email || '')].filter(
                Boolean,
              );

              // Fetch full invoice with items and client details
              const fullInvoice = await this.prisma.invoice.findUnique({
                where: { id: invoice.id },
                include: {
                  quotation: {
                    include: {
                      client: true,
                      items: true,
                    },
                  },
                },
              });

              // Get company name
              const tenant = await this.prisma.tenant.findUnique({
                where: { id: entry.message.tenant_id },
                select: { company_name: true },
              });

              // Get email template
              const template = await this.emailTemplatesService.findByType(
                entry.message.tenant_id,
                EmailTemplateType.INVOICE_EMAIL,
              );

              // Build item details from quotation items
              const itemDetails =
                fullInvoice?.quotation?.items
                  ?.map((item, index) => {
                    return `${index + 1}. ${item.product_name} - Qty: ${Number(item.quantity)} ${item.unit} @ INR ${Number(item.unit_price)}/unit = INR ${Number(item.total)}`;
                  })
                  .join('\n') || '';

              // Determine payment status
              const paidAmount = Number(fullInvoice?.paid_amount || 0);
              const totalAmount = Number(fullInvoice?.total || 0);
              let paymentStatus = '';
              if (paidAmount >= totalAmount) {
                paymentStatus = 'Status: PAID';
              } else if (paidAmount > 0) {
                paymentStatus = `Status: PARTIALLY PAID (INR ${paidAmount} of INR ${totalAmount})`;
              } else {
                paymentStatus = 'Status: PENDING PAYMENT';
              }

              // Format dates for template
              const invoiceDateStr = fullInvoice?.date instanceof Date
                ? fullInvoice.date.toISOString().split('T')[0]
                : String(fullInvoice?.date || '');
              const dueDateStr = fullInvoice?.due_date instanceof Date
                ? fullInvoice.due_date.toISOString().split('T')[0]
                : String(fullInvoice?.due_date || '');

              // Template variables
              const variables = {
                client_name: fullInvoice?.quotation?.client?.name || 'Customer',
                company_name: tenant?.company_name || 'Quotebot',
                invoice_number: fullInvoice?.number || '',
                invoice_date: invoiceDateStr,
                due_date: dueDateStr,
                currency: fullInvoice?.currency || 'INR',
                total_amount: Number(totalAmount).toLocaleString('en-IN', {
                  maximumFractionDigits: 2,
                }),
                payment_status: paymentStatus,
                item_details: itemDetails,
              };

              // Substitute variables in template
              const emailSubject =
                this.emailTemplatesService.substituteVariables(
                  template.subject_template,
                  variables,
                );
              const emailBody = this.emailTemplatesService.substituteVariables(
                template.body_template,
                variables,
              );

              try {
                await this.emailService.sendNow(entry.message.tenant_id, {
                  email_account_id: entry.message.conversation.email_account_id,
                  to,
                  subject: emailSubject,
                  body: emailBody,
                });

                // Store sent email details
                await this.prisma.invoice.update({
                  where: { id: invoice.id },
                  data: {
                    sent_email_subject: emailSubject,
                    sent_email_body: emailBody,
                    sent_at: new Date(),
                  },
                });
              } catch (err) {
                this.logger.warn(
                  `Immediate send of invoice ${invoice.id} failed: ${this.errorToMessage(err)}; queued as outboundEmail instead.`,
                );
                try {
                  await this.emailService.createOutboundEmail(
                    entry.message.tenant_id,
                    {
                      email_account_id:
                        entry.message.conversation.email_account_id,
                      to,
                      subject: emailSubject,
                      body: emailBody,
                    },
                  );

                  // Store sent email details even for queued emails
                  await this.prisma.invoice.update({
                    where: { id: invoice.id },
                    data: {
                      sent_email_subject: emailSubject,
                      sent_email_body: emailBody,
                      sent_at: new Date(),
                    },
                  });
                } catch (e) {
                  this.logger.warn(
                    `Failed to queue outbound email for invoice ${invoice.id}: ${this.errorToMessage(e)}`,
                  );
                }
              }
            }

            await this.prisma.assistancePurchaseOrder.update({
              where: { id: poRecord.id },
              data: {
                invoice_id: invoice?.id,
                status: invoice
                  ? PurchaseOrderStatus.INVOICE_GENERATED
                  : PurchaseOrderStatus.APPROVED,
              },
            });

            await this.prisma.conversation.update({
              where: { id: entry.message.conversation_id },
              data: {
                current_stage: invoice
                  ? ConversationStage.INVOICE_SENT
                  : ConversationStage.PO_VERIFIED,
              },
            });
          } else if (newStatus === PurchaseOrderStatus.REVIEW_PENDING) {
            await this.prisma.conversation.update({
              where: { id: entry.message.conversation_id },
              data: { current_stage: ConversationStage.PO_RECEIVED },
            });
          } else {
            await this.prisma.conversation.update({
              where: { id: entry.message.conversation_id },
              data: { current_stage: ConversationStage.PO_RECEIVED },
            });
          }

          summary.po_detected += 1;
          await this.updateMessageProcessing(
            candidate.id,
            {
              parsing_source: 'backend_intent_router',
              parsing_confidence: 'medium',
              parsing_error: primaryIntent.reason,
              parsed_items: [],
              auto_rfq_created: false,
              pipeline_stage: 'po_detected',
              po_match_percent: percent,
              po_match_components: match?.components || {},
            },
            {
              status: 'parsed',
              classification: MessageClassification.PO,
              classificationConfidence: primaryIntent.confidence,
              followupType: null,
            },
          );
          continue;
        }

        if (primaryIntent.classification === MessageClassification.UNKNOWN) {
          summary.unknown += 1;
          await this.updateMessageProcessing(
            candidate.id,
            {
              parsing_source: 'backend_intent_router',
              parsing_confidence: 'low',
              parsing_error: primaryIntent.reason,
              parsed_items: [],
              auto_rfq_created: false,
              pipeline_stage: 'classified_unknown',
            },
            {
              status: 'parsed',
              classification: MessageClassification.UNKNOWN,
              classificationConfidence: primaryIntent.confidence,
              followupType: null,
            },
          );
          continue;
        }

        const regexDecision = this.classifyRfqByRegex(
          candidate.subject,
          candidate.body,
        );

        if (regexDecision.verdict === 'non_rfq') {
          summary.non_rfq += 1;
          await this.updateMessageProcessing(
            candidate.id,
            {
              parsing_source: 'backend_regex_classifier',
              parsing_confidence: regexDecision.confidence,
              parsing_error: regexDecision.reason,
              parsed_items: [],
              auto_rfq_created: false,
              pipeline_stage: 'classified_non_rfq_regex',
              rfq_pipeline_last_error_kind: 'regex_non_rfq',
            },
            {
              status: 'parsed',
              classification: MessageClassification.UNKNOWN,
              classificationConfidence: 0.8,
            },
          );
          continue;
        }

        if (regexDecision.verdict === 'rfq') {
          const classifiedAt =
            typeof entry.payload.rfq_classified_at === 'string' &&
            entry.payload.rfq_classified_at.trim().length > 0
              ? entry.payload.rfq_classified_at
              : new Date().toISOString();
          regexRfqCandidates.push(candidate);
          await this.updateMessageProcessing(
            candidate.id,
            {
              parsing_source: 'backend_regex_classifier',
              parsing_confidence: regexDecision.confidence,
              parsing_error: '',
              parsed_items: [],
              auto_rfq_created: false,
              pipeline_stage: 'extracting_items_regex_gate',
              rfq_classified_at: classifiedAt,
            },
            {
              status: 'pending',
              isProcessed: false,
              classification: MessageClassification.RFQ,
              classificationConfidence: 0.88,
            },
          );
          continue;
        }

        uncertainCandidates.push(candidate);
      }

      let classification: BatchClassificationResult = {
        rfq_ids: [],
        non_rfq_ids: [],
        reasons: {},
      };
      let classificationFailed = false;
      const classifyStageStartedAt = Date.now();

      const classifierCandidates = uncertainCandidates.map((candidate) => ({
        ...candidate,
        body: this.buildClassifierSnippet(candidate.subject, candidate.body),
      }));

      if (classifierCandidates.length > 0) {
        try {
          classification =
            await this.classifyRfqCandidatesInBatches(classifierCandidates);
        } catch (error: unknown) {
          const failure = classifyFailure(error);

          if (failure.retryable) {
            try {
              classification = parseClassification(
                await this.callLlmWithFallbacks(
                  compactClassifierPrompt(classifierCandidates),
                  'classifier',
                ),
                classifierCandidates,
              );
            } catch (compactError: unknown) {
              classificationFailed = true;
              const compactFailure = classifyFailure(compactError);
              const firstUncertainEntry = classifierCandidates[0]
                ? pendingById.get(classifierCandidates[0].id)
                : undefined;
              const finalFailure =
                compactFailure.retryable &&
                getRetryCount(
                  readPayload(firstUncertainEntry?.message.raw_payload),
                ) < maxAutoRetries
                  ? compactFailure
                  : failure;

              for (const candidate of classifierCandidates) {
                const entry = pendingById.get(candidate.id);
                if (!entry) continue;

                const retryCount = getRetryCount(entry.payload);
                const shouldRetry =
                  finalFailure.retryable && retryCount < maxAutoRetries;
                const retryPayload = shouldRetry
                  ? buildRetryPayload(
                      entry.payload,
                      finalFailure.kind,
                      `Batch RFQ classification ${finalFailure.kind.replace(/_/g, ' ')}. Details: ${finalFailure.message}`,
                      retryCount,
                    )
                  : entry.payload;

                await this.updateMessageProcessing(
                  candidate.id,
                  {
                    parsing_source: 'backend_llm_classifier',
                    parsing_confidence: 'low',
                    parsing_error: shouldRetry
                      ? `Batch RFQ classification ${finalFailure.kind.replace(/_/g, ' ')}. Automatic retry scheduled. Details: ${finalFailure.message}`
                      : `Batch RFQ classification failed. Details: ${finalFailure.message}`,
                    parsed_items: [],
                    auto_rfq_created: false,
                    pipeline_stage: shouldRetry
                      ? 'classification_retry_scheduled'
                      : 'classification_failed',
                    ...retryPayload,
                  },
                  {
                    status: shouldRetry ? 'pending' : 'failed',
                    isProcessed: shouldRetry ? false : undefined,
                  },
                );
              }

              summary.llm_errors += classifierCandidates.length;
              if (finalFailure.retryable) {
                summary.skipped += classifierCandidates.length;
              }
            }
          } else {
            classificationFailed = true;
            for (const candidate of classifierCandidates) {
              const entry = pendingById.get(candidate.id);
              if (!entry) continue;

              await this.updateMessageProcessing(
                candidate.id,
                {
                  parsing_source: 'backend_llm_classifier',
                  parsing_confidence: 'low',
                  parsing_error: `Batch RFQ classification failed. Details: ${failure.message}`,
                  parsed_items: [],
                  auto_rfq_created: false,
                  pipeline_stage: 'classification_failed',
                  rfq_pipeline_last_error_kind: failure.kind,
                },
                { status: 'failed' },
              );
            }

            summary.llm_errors += classifierCandidates.length;
          }
        }
      }

      const classifyStageDurationMs = Date.now() - classifyStageStartedAt;
      if (classifierCandidates.length > 0) {
        this.logger.log(
          `[RFQ_TIMING] classify_stage size=${classifierCandidates.length} took=${classifyStageDurationMs}ms avg_per_email=${Math.round(
            classifyStageDurationMs / Math.max(classifierCandidates.length, 1),
          )}ms`,
        );
      }

      const llmRfqIdSet = new Set(classification.rfq_ids);
      const extractionCandidates: BatchCandidateMessage[] = [
        ...regexRfqCandidates,
        ...uncertainCandidates.filter((candidate) =>
          llmRfqIdSet.has(candidate.id),
        ),
      ];

      if (!classificationFailed) {
        for (const candidate of uncertainCandidates) {
          const entry = pendingById.get(candidate.id);
          if (!entry) continue;

          if (!llmRfqIdSet.has(candidate.id)) {
            summary.non_rfq += 1;
            await this.updateMessageProcessing(
              candidate.id,
              {
                parsing_source: 'backend_llm_classifier',
                parsing_confidence: 'medium',
                parsing_error:
                  classification.reasons?.[candidate.id] ||
                  'Classified as non-RFQ email',
                parsed_items: [],
                auto_rfq_created: false,
                pipeline_stage: 'classified_non_rfq',
              },
              { status: 'parsed' },
            );
            continue;
          }

          const classifiedAt =
            typeof entry.payload.rfq_classified_at === 'string' &&
            entry.payload.rfq_classified_at.trim().length > 0
              ? entry.payload.rfq_classified_at
              : new Date().toISOString();
          await this.updateMessageProcessing(
            candidate.id,
            {
              parsing_source: 'backend_llm_classifier',
              parsing_confidence: 'medium',
              parsing_error: classification.reasons?.[candidate.id] || '',
              parsed_items: [],
              auto_rfq_created: false,
              pipeline_stage: 'extracting_items',
              rfq_classified_at: classifiedAt,
            },
            {
              status: 'pending',
              isProcessed: false,
            },
          );
        }
      }

      const extractWithFallback = async (
        candidate: BatchCandidateMessage,
      ): Promise<LlmExtractionResult> => {
        try {
          return await this.callLlmExtraction(
            candidate.subject,
            candidate.body,
          );
        } catch (error: unknown) {
          const failure = classifyFailure(error);

          if (!failure.retryable) {
            throw error;
          }

          const compactResponse = await this.callLlmWithFallbacks(
            compactExtractionPrompt(candidate.subject, candidate.body),
            'extractor',
          );

          return parseExtraction(compactResponse);
        }
      };

      const extractionStageStartedAt = Date.now();
      for (const candidate of extractionCandidates) {
        const entry = pendingById.get(candidate.id);
        if (!entry) continue;

        const messageStart = Date.now();

        const retryCount = getRetryCount(entry.payload);
        const currentPayload = entry.payload;

        let extraction: LlmExtractionResult;
        try {
          extraction = await extractWithFallback(candidate);
        } catch (error: unknown) {
          const failure = classifyFailure(error);
          summary.llm_errors += 1;

          const shouldRetry = failure.retryable && retryCount < maxAutoRetries;
          const retryPayload = shouldRetry
            ? buildRetryPayload(
                currentPayload,
                failure.kind,
                `LLM extraction ${failure.kind.replace(/_/g, ' ')}. Details: ${failure.message}`,
                retryCount,
              )
            : currentPayload;

          await this.updateMessageProcessing(
            candidate.id,
            {
              parsing_source: 'backend_llm_extractor',
              parsing_confidence: 'low',
              parsing_error: shouldRetry
                ? `LLM extraction ${failure.kind.replace(/_/g, ' ')}. Automatic retry scheduled. Details: ${failure.message}`
                : `LLM extraction failed. Details: ${failure.message}`,
              parsed_items: [],
              auto_rfq_created: false,
              pipeline_stage: shouldRetry
                ? 'extraction_retry_scheduled'
                : 'extraction_failed',
              ...retryPayload,
            },
            {
              status: shouldRetry ? 'pending' : 'failed',
              isProcessed: shouldRetry ? false : undefined,
            },
          );

          if (shouldRetry) {
            summary.skipped += 1;
          }

          continue;
        }

        const extractedItems = this.sanitizeItems(extraction.items);
        if (!extraction.is_rfq || extractedItems.length === 0) {
          summary.unresolved += 1;
          await this.updateMessageProcessing(
            candidate.id,
            {
              parsing_source: 'rfq_unresolved',
              parsing_confidence: extraction.confidence,
              parsing_error:
                extraction.reason ||
                'RFQ detected but no valid line items with explicit quantity found',
              parsed_items: extractedItems,
              auto_rfq_created: false,
              pipeline_stage: 'extraction_completed',
            },
            { status: 'parsed' },
          );
          continue;
        }

        try {
          const tenantId = getString(entry.message.tenant_id, '').trim();
          const clientEmail = getString(entry.message.sender_email, '').trim();

          if (!tenantId) {
            summary.unresolved += 1;
            await this.updateMessageProcessing(
              candidate.id,
              {
                parsing_source: 'backend_llm_pipeline',
                parsing_confidence: extraction.confidence,
                parsing_error:
                  'RFQ creation skipped because tenant_id is missing on source message.',
                parsed_items: extractedItems,
                auto_rfq_created: false,
                pipeline_stage: 'rfq_create_failed',
              },
              { status: 'failed' },
            );
            continue;
          }

          const preview = await this.rfqsService.previewFromEmail(tenantId, {
            client_email: clientEmail,
            message_id: candidate.id,
            items: extractedItems,
          });

          const matchedItems = Array.isArray(preview.matched_items)
            ? preview.matched_items
            : [];

          if (matchedItems.length === 0) {
            summary.unresolved += 1;
            await this.updateMessageProcessing(
              candidate.id,
              {
                parsing_source: 'rfq_unresolved',
                parsing_confidence: extraction.confidence,
                parsing_error: getString(
                  preview.summary,
                  'No valid catalog match found',
                ),
                parsed_items: extractedItems,
                rejected_items: preview.unmatched_items,
                auto_rfq_created: false,
                pipeline_stage: 'extraction_completed',
              },
              { status: 'parsed' },
            );
            continue;
          }

          const createdRfq = await this.rfqsService.createFromEmail(tenantId, {
            client_email: clientEmail,
            message_id: candidate.id,
            items: matchedItems,
            parsing_confidence: extraction.confidence,
            parsing_source: 'backend_llm_pipeline',
          });

          await this.updateMessageProcessing(
            candidate.id,
            {
              parsing_source: 'backend_llm_pipeline',
              parsing_confidence: extraction.confidence,
              parsing_error: '',
              parsed_items: matchedItems,
              rejected_items: preview.unmatched_items,
              auto_rfq_created: true,
              pipeline_stage: 'rfq_created',
              rfq_pipeline_retry_count: 0,
              rfq_pipeline_next_retry_at: '',
              rfq_pipeline_last_failure_kind: '',
              rfq_pipeline_last_failure_reason: '',
            },
            { status: 'parsed' },
          );

          summary.created_rfqs += 1;

          // Auto-create and send quotation (non-blocking)
          if (createdRfq.id && tenantId) {
            void this.autoCreateAndSendQuotation(createdRfq.id, tenantId);
          }
        } catch (error: unknown) {
          const message = this.errorToMessage(error);
          if (error instanceof BadRequestException) {
            summary.unresolved += 1;
            await this.updateMessageProcessing(
              candidate.id,
              {
                parsing_source: 'backend_llm_pipeline',
                parsing_confidence: extraction.confidence,
                parsing_error: message,
                parsed_items: extractedItems,
                auto_rfq_created: false,
                pipeline_stage: 'rfq_create_failed',
              },
              { status: 'failed' },
            );
            continue;
          }

          summary.llm_errors += 1;
          const failure = classifyFailure(error);
          const shouldRetry = failure.retryable && retryCount < maxAutoRetries;
          const retryPayload = shouldRetry
            ? buildRetryPayload(
                currentPayload,
                failure.kind,
                `RFQ creation failed after extraction. Details: ${message}`,
                retryCount,
              )
            : currentPayload;

          await this.updateMessageProcessing(
            candidate.id,
            {
              parsing_source: 'backend_llm_pipeline',
              parsing_confidence: extraction.confidence,
              parsing_error: shouldRetry
                ? `RFQ creation failed. Automatic retry scheduled. Details: ${message}`
                : `RFQ creation failed. Details: ${message}`,
              parsed_items: extractedItems,
              auto_rfq_created: false,
              pipeline_stage: shouldRetry
                ? 'rfq_create_retry_scheduled'
                : 'rfq_create_failed',
              ...retryPayload,
            },
            {
              status: shouldRetry ? 'pending' : 'failed',
              isProcessed: shouldRetry ? false : undefined,
            },
          );
        }

        if (extraction.confidence !== 'high') {
          await this.sleep(this.extractionDelayMs);
        }

        const messageDurationMs = Date.now() - messageStart;
        this.logger.debug(
          `[RFQ_TIMING] extract_message id=${candidate.id} took=${messageDurationMs}ms`,
        );
      }

      const extractionStageDurationMs = Date.now() - extractionStageStartedAt;
      if (extractionCandidates.length > 0) {
        this.logger.log(
          `[RFQ_TIMING] extraction_stage size=${extractionCandidates.length} took=${extractionStageDurationMs}ms avg_per_email=${Math.round(
            extractionStageDurationMs /
              Math.max(extractionCandidates.length, 1),
          )}ms`,
        );
      }

      const totalDurationMs = Date.now() - runStartedAt;
      this.logger.log(
        `[RFQ_TIMING] run_complete scanned=${summary.scanned} processed=${
          summary.created_rfqs +
          summary.non_rfq +
          summary.unresolved +
          summary.followups +
          summary.po_detected +
          summary.unknown
        } created_rfqs=${summary.created_rfqs} non_rfq=${summary.non_rfq} unresolved=${summary.unresolved} followups=${summary.followups} po_detected=${summary.po_detected} unknown=${summary.unknown} llm_errors=${summary.llm_errors} skipped=${summary.skipped} took=${totalDurationMs}ms avg_per_scanned=${Math.round(
          totalDurationMs / Math.max(summary.scanned, 1),
        )}ms`,
      );

      return {
        started: true,
        ...summary,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Automatically creates and sends a quotation for a newly created RFQ
   * This runs asynchronously after RFQ creation to avoid blocking the pipeline
   */
  private async autoCreateAndSendQuotation(
    rfqId: string,
    tenantId: string,
  ): Promise<void> {
    try {
      const autoQuoteEnabled = process.env.AUTO_SEND_QUOTATION !== 'false';

      if (!autoQuoteEnabled) {
        return;
      }

      // Fetch the RFQ with all details
      const rfq = await this.prisma.rFQ.findUnique({
        where: { id: rfqId },
        include: {
          client: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!rfq || !rfq.client) {
        this.logger.warn(
          `Cannot auto-create quotation for RFQ ${rfqId}: RFQ or client not found`,
        );
        return;
      }

      // Check if quotation already exists for this RFQ
      if (rfq.quotation_id) {
        this.logger.debug(
          `Quotation already exists for RFQ ${rfqId}, skipping auto-create`,
        );
        return;
      }

      // Prepare quotation items from RFQ items
      const quotationItems = rfq.items.map((item) => ({
        product_id: item.product_id,
        product_name:
          item.product?.name || item.product_name || 'Unknown Product',
        quantity: Number(item.quantity),
        unit: item.unit || 'unit',
        unit_price: Number(item.product?.price || 0),
        tax_percent: Number(item.product?.gst_percent || 18),
        notes: item.notes || undefined,
      }));

      if (quotationItems.length === 0) {
        this.logger.warn(
          `Cannot auto-create quotation for RFQ ${rfqId}: No items found`,
        );
        return;
      }

      // Create the quotation
      this.logger.log(`🔄 Auto-creating quotation for RFQ ${rfq.number}...`);
      const quotation = await this.quotationsService.create(tenantId, {
        client_id: rfq.client_id,
        date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'draft',
        items: quotationItems,
      });

      // Link quotation to RFQ
      await this.prisma.rFQ.update({
        where: { id: rfqId },
        data: {
          quotation_id: quotation.id,
          status: 'quoted',
        },
      });

      this.logger.log(
        `✓ Created quotation ${quotation.number} for RFQ ${rfq.number}`,
      );

      // Auto-send quotation if client has email
      if (rfq.client.email && rfq.client.email.includes('@')) {
        this.logger.log(
          `📧 Auto-sending quotation ${quotation.number} to ${rfq.client.email}...`,
        );

        try {
          await this.quotationsService.sendByEmail(quotation.id, tenantId, {
            to: [rfq.client.email],
            message:
              'Thank you for your inquiry. Please find our quotation attached.',
          });

          this.logger.log(
            `✓ Quotation ${quotation.number} sent successfully to ${rfq.client.email}`,
          );
        } catch (sendError) {
          this.logger.error(
            `Failed to auto-send quotation ${quotation.number}: ${sendError instanceof Error ? sendError.message : String(sendError)}`,
          );
          // Don't throw - quotation was created successfully, just sending failed
        }
      } else {
        this.logger.warn(
          `Cannot auto-send quotation ${quotation.number}: Client ${rfq.client.name} has no valid email`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Auto-quotation failed for RFQ ${rfqId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't throw - this is a background operation
    }
  }
}
