import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { recordsToCsv } from '../common/utils/export.util';
import { EmailService } from '../email/email.service';
import {
  PaginationParams,
  PaginatedResult,
  parsePaginationParams,
} from '../common/utils/pagination.util';

interface RfqItemInput {
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

interface RfqFromEmailItemInput {
  product_id?: string;
  product_name?: string;
  name?: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

type RfqResolvedProduct = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  status: string;
};

type RejectedRfqItem = {
  input_name: string;
  quantity: number;
  reason:
    | 'invalid_quantity'
    | 'invalid_product_name'
    | 'conversation_text_rejected'
    | 'product_not_found'
    | 'product_inactive'
    | 'out_of_stock'
    | 'insufficient_stock';
};

type RfqResolutionResult = {
  resolvedItems: RfqItemInput[];
  rejectedItems: RejectedRfqItem[];
};

type RfqProductCandidate = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  status: string;
};

type CreateRfqInput = {
  client_id: string;
  channel: string;
  priority?: string;
  status?: string;
  confidence_score?: number;
  due_date?: string;
  items?: RfqItemInput[];
};

type RfqWithRelations = Prisma.RFQGetPayload<{
  include: { client: true; items: true; quotation: true };
}>;

type RfqDbClient = Pick<
  PrismaService,
  | 'client'
  | 'emailAccount'
  | 'message'
  | 'product'
  | 'quotation'
  | 'rFQ'
  | 'rFQItem'
  | 'quotationItem'
>;

@Injectable()
export class RfqsService {
  private readonly logger = new Logger(RfqsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private normalizeProductName(value: string): string {
    return String(value || '')
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) =>
        token.length > 3 && token.endsWith('s') ? token.slice(0, -1) : token,
      )
      .join(' ');
  }

  private formatShortDate(d: Date = new Date()) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  private buildDisplayAndTokens(
    prefix: string,
    clientName: string,
    itemNames: string[],
  ) {
    const date = this.formatShortDate();
    const clientShort = (clientName || '')
      .split(/\s+/)
      .slice(0, 3)
      .join(' ')
      .slice(0, 30);
    const items = (itemNames || [])
      .slice(0, 5)
      .map((s) => String(s || '').trim())
      .filter(Boolean);
    const display = `${prefix} - ${date} - ${clientShort}${items.length ? ' - ' + items.join(', ') : ''}`;
    const tokens = [date, clientShort, ...items];
    return { display, tokens };
  }

  private buildStockWarningNote(
    productName: string,
    requestedQuantity: number,
    availableStock: number,
  ): string {
    return `Stock warning: only ${availableStock} unit(s) available for ${productName}; requested ${requestedQuantity}.`;
  }

  private collectStockWarningNotes(
    items: Array<{ notes?: string | null }>,
  ): string[] {
    return items
      .map((item) => item.notes?.trim() || '')
      .filter((note) => note.toLowerCase().includes('stock warning'));
  }

  private async recordParseRun(params: {
    tenantId: string;
    messageId?: string;
    clientEmail?: string;
    stage: 'preview' | 'create';
    status: 'success' | 'partial' | 'failed';
    source?: string;
    inputItems?: RfqFromEmailItemInput[];
    matchedItems?: RfqItemInput[];
    unmatchedItems?: RejectedRfqItem[];
    errorMessage?: string;
  }) {
    try {
      await this.prisma.parseRun.create({
        data: {
          tenant_id: params.tenantId,
          message_id: params.messageId,
          client_email: params.clientEmail,
          stage: params.stage,
          status: params.status,
          source: params.source,
          matched_count: params.matchedItems?.length || 0,
          unmatched_count: params.unmatchedItems?.length || 0,
          input_items_json:
            (params.inputItems as unknown as Prisma.InputJsonValue) ||
            undefined,
          matched_items_json:
            (params.matchedItems as unknown as Prisma.InputJsonValue) ||
            undefined,
          unmatched_items_json:
            (params.unmatchedItems as unknown as Prisma.InputJsonValue) ||
            undefined,
          error_message: params.errorMessage,
        },
      });
    } catch (error) {
      // Best-effort audit write: do not fail RFQ ingestion on logging errors.
      this.logger.warn(`ParseRun logging skipped: ${(error as Error).message}`);
    }
  }

  private looksLikeConversationText(value: string): boolean {
    const text = value.toLowerCase();
    return /(please|kindly|thanks|regards|quotation|quote|looking\s+for|we\s+are\s+looking|let\s+me\s+know|dear|hello)/i.test(
      text,
    );
  }

  private generateNumber() {
    const year = new Date().getFullYear();
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    return `RFQ/${year}-${year + 1}/${ts}${rand}`;
  }

  private generateQuotationNumber() {
    const year = new Date().getFullYear();
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(100 + Math.random() * 900);
    return `QT/${year}-${year + 1}/${ts}${rand}`;
  }

  private async runInTransaction<T>(
    callback: (db: RfqDbClient) => Promise<T>,
  ): Promise<T> {
    const dbWithTransaction = this.prisma as unknown as {
      db: {
        $transaction: <U>(fn: (tx: RfqDbClient) => Promise<U>) => Promise<U>;
      };
    };

    return dbWithTransaction.db.$transaction(async (tx) => callback(tx));
  }

  private async resolveRfqItemsFromEmail(
    tenantId: string,
    items: RfqFromEmailItemInput[],
  ): Promise<RfqResolutionResult> {
    const resolvedItems: RfqItemInput[] = [];
    const rejectedItems: RejectedRfqItem[] = [];
    let productCandidatesCache: RfqProductCandidate[] | null = null;

    const getProductCandidates = async (): Promise<RfqProductCandidate[]> => {
      if (productCandidatesCache) {
        return productCandidatesCache;
      }

      productCandidatesCache = await this.prisma.product.findMany({
        where: {
          tenant_id: tenantId,
        },
        select: {
          id: true,
          name: true,
          unit: true,
          stock: true,
          status: true,
        },
      });

      return productCandidatesCache;
    };

    for (const rawItem of items) {
      const quantity = Number(rawItem.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        rejectedItems.push({
          input_name: String(
            rawItem.product_name || rawItem.name || rawItem.product_id || '',
          ).trim(),
          quantity,
          reason: 'invalid_quantity',
        });
        continue;
      }

      let product: RfqResolvedProduct | null = null;

      if (rawItem.product_id) {
        const foundById = await this.prisma.product.findFirst({
          where: {
            id: rawItem.product_id,
            tenant_id: tenantId,
          },
          select: {
            id: true,
            name: true,
            unit: true,
            stock: true,
            status: true,
          },
        });
        product = foundById;
      }

      const productName = (rawItem.product_name || rawItem.name || '')
        .toString()
        .trim();

      if (!productName && !rawItem.product_id) {
        rejectedItems.push({
          input_name: '',
          quantity,
          reason: 'invalid_product_name',
        });
        continue;
      }

      if (
        !product &&
        productName &&
        this.looksLikeConversationText(productName)
      ) {
        rejectedItems.push({
          input_name: productName,
          quantity,
          reason: 'conversation_text_rejected',
        });
        continue;
      }

      if (!product && productName) {
        const foundByName = await this.prisma.product.findFirst({
          where: {
            tenant_id: tenantId,
            name: { equals: productName, mode: 'insensitive' },
          },
          select: {
            id: true,
            name: true,
            unit: true,
            stock: true,
            status: true,
          },
        });
        product = foundByName;
      }

      if (!product && productName) {
        const normalizedInput = this.normalizeProductName(productName);
        if (normalizedInput) {
          const candidates = await getProductCandidates();
          const normalizedMatch = candidates.find(
            (candidate) =>
              this.normalizeProductName(candidate.name) === normalizedInput,
          );

          if (normalizedMatch) {
            product = normalizedMatch;
          }
        }
      }

      if (!product) {
        rejectedItems.push({
          input_name: productName,
          quantity,
          reason: 'product_not_found',
        });
        continue;
      }

      if (this.looksLikeConversationText(product.name)) {
        rejectedItems.push({
          input_name: product.name,
          quantity,
          reason: 'conversation_text_rejected',
        });
        continue;
      }

      if (product.status !== 'active') {
        rejectedItems.push({
          input_name: product.name,
          quantity,
          reason: 'product_inactive',
        });
        continue;
      }

      if (product.stock <= 0) {
        rejectedItems.push({
          input_name: product.name,
          quantity,
          reason: 'out_of_stock',
        });
        continue;
      }

      const stockWarningNote =
        quantity > product.stock
          ? this.buildStockWarningNote(product.name, quantity, product.stock)
          : '';

      const resolvedNote = rawItem.notes
        ? stockWarningNote
          ? `${rawItem.notes}; ${stockWarningNote}`
          : rawItem.notes
        : stockWarningNote ||
          `Matched with product catalog: ${product.name} (${product.id})`;

      resolvedItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit: rawItem.unit || product.unit,
        notes: resolvedNote,
      });
    }

    if (resolvedItems.length > 0 && rejectedItems.length > 0) {
      const unmatchedNames = Array.from(
        new Set(
          rejectedItems
            .map((item) => item.input_name.trim())
            .filter((name) => name.length > 0),
        ),
      ).slice(0, 8);

      if (unmatchedNames.length > 0) {
        const unmatchedSummary = `Unmatched/ignored from source email: ${unmatchedNames.join(', ')}`;
        resolvedItems[0] = {
          ...resolvedItems[0],
          notes: resolvedItems[0].notes
            ? `${resolvedItems[0].notes}; ${unmatchedSummary}`
            : unmatchedSummary,
        };
      }
    }

    return { resolvedItems, rejectedItems };
  }

  async previewFromEmail(
    tenantId: string,
    body: {
      client_email: string;
      items: RfqFromEmailItemInput[];
      message_id?: string;
    },
  ) {
    if (!body.items || body.items.length === 0) {
      await this.recordParseRun({
        tenantId,
        messageId: body.message_id,
        clientEmail: body.client_email,
        stage: 'preview',
        status: 'failed',
        inputItems: body.items,
        errorMessage: 'No candidate items were provided for preview.',
      });

      return {
        matched_items: [],
        unmatched_items: [],
        summary: 'No candidate items were provided for preview.',
      };
    }

    const { resolvedItems, rejectedItems } =
      await this.resolveRfqItemsFromEmail(tenantId, body.items);

    const summaryParts: string[] = [];
    summaryParts.push(`Matched ${resolvedItems.length} item(s)`);
    summaryParts.push(`Rejected ${rejectedItems.length} item(s)`);

    await this.recordParseRun({
      tenantId,
      messageId: body.message_id,
      clientEmail: body.client_email,
      stage: 'preview',
      status:
        resolvedItems.length === 0
          ? 'failed'
          : rejectedItems.length > 0
            ? 'partial'
            : 'success',
      inputItems: body.items,
      matchedItems: resolvedItems,
      unmatchedItems: rejectedItems,
    });

    return {
      message_id: body.message_id || '',
      client_email: body.client_email,
      matched_items: resolvedItems,
      unmatched_items: rejectedItems,
      summary: `${summaryParts.join(', ')}.`,
    };
  }

  async findAll(
    tenantId: string,
    query: PaginationParams & {
      status?: string;
      channel?: string;
      limit?: number;
    },
  ): Promise<PaginatedResult<any>> {
    const { skip, take, page, pageSize } = parsePaginationParams(query);
    const { search, status, channel, limit } = query;

    const where: any = {
      tenant_id: tenantId,
      deleted_at: null,
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: 'insensitive' } },
              { display_name: { contains: search, mode: 'insensitive' } },
              { client: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
      ...(channel ? { channel } : {}),
    };

    const effectiveTake = limit ? Math.min(limit, take) : take;

    const [data, total] = await Promise.all([
      this.prisma.rFQ.findMany({
        where,
        include: { client: true, items: true, quotation: true },
        orderBy: { [query.sortBy || 'created_at']: query.sortOrder || 'desc' },
        skip,
        take: effectiveTake,
      }),
      this.prisma.rFQ.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize: effectiveTake,
        totalPages: Math.ceil(total / effectiveTake),
      },
    };
  }

  async findOne(id: string, tenantId: string) {
    const rfq = await this.prisma.rFQ.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
      include: { client: true, items: true, quotation: true },
    });

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    return rfq;
  }

  private async createWithDb(
    db: RfqDbClient,
    tenantId: string,
    body: CreateRfqInput,
  ) {
    const number = this.generateNumber();
    const client = await db.client.findFirst({
      where: { id: body.client_id, tenant_id: tenantId },
      select: { name: true },
    });
    const itemNames = (body.items || []).map((it) => it.product_name || '');
    const { display, tokens } = this.buildDisplayAndTokens(
      'RFQ',
      client?.name || '',
      itemNames,
    );

    return db.rFQ.create({
      data: {
        tenant_id: tenantId,
        number,
        client_id: body.client_id,
        channel: body.channel,
        priority: body.priority ?? 'medium',
        status: body.status ?? 'pending',
        confidence_score: body.confidence_score ?? 0,
        due_date: body.due_date ? new Date(body.due_date) : undefined,
        display_name: display,
        search_tokens: tokens as unknown as Prisma.InputJsonValue,
        items: body.items?.length
          ? {
              createMany: {
                data: body.items.map((item) => ({
                  product_id: item.product_id,
                  product_name: item.product_name,
                  quantity: Number(item.quantity),
                  unit: item.unit,
                  notes: item.notes,
                })),
              },
            }
          : undefined,
      },
      include: { client: true, items: true, quotation: true },
    });
  }

  async create(tenantId: string, body: CreateRfqInput) {
    return this.createWithDb(this.prisma, tenantId, body);
  }

  async createFromEmail(
    tenantId: string,
    body: {
      client_email: string;
      items: RfqFromEmailItemInput[];
      message_id: string;
      parsing_confidence?: string;
      parsing_source?: string;
    },
  ) {
    if (!body.message_id) {
      throw new BadRequestException(
        'message_id is required for inbox RFQ conversion',
      );
    }

    const sourceMessage = await this.prisma.message.findFirst({
      where: {
        id: body.message_id,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        raw_payload: true,
      },
    });

    if (!sourceMessage) {
      throw new BadRequestException('Source message not found for message_id');
    }

    const markSourceMessage = async (
      db: RfqDbClient,
      status: 'parsed' | 'failed',
      rawPayloadPatch: Record<string, unknown>,
    ) => {
      const payload =
        sourceMessage.raw_payload &&
        typeof sourceMessage.raw_payload === 'object' &&
        !Array.isArray(sourceMessage.raw_payload)
          ? (sourceMessage.raw_payload as Record<string, unknown>)
          : {};

      await db.message.update({
        where: { id: sourceMessage.id },
        data: {
          processing_status: status,
          is_processed: status === 'parsed',
          raw_payload: {
            ...payload,
            ...rawPayloadPatch,
          } as unknown as Prisma.InputJsonValue,
          updated_at: new Date(),
        },
      });
    };

    if (!body.items || body.items.length === 0) {
      await this.recordParseRun({
        tenantId,
        messageId: body.message_id,
        clientEmail: body.client_email,
        stage: 'create',
        status: 'failed',
        source: body.parsing_source,
        inputItems: body.items,
        errorMessage: 'No items provided for RFQ creation',
      });

      await markSourceMessage(this.prisma, 'parsed', {
        parsed_items: [],
        parsing_source: body.parsing_source || 'rfq_workflow',
        parsing_error: 'No items provided for RFQ creation',
        auto_rfq_created: false,
      });

      throw new BadRequestException('No items provided for RFQ creation');
    }

    const { resolvedItems, rejectedItems } =
      await this.resolveRfqItemsFromEmail(tenantId, body.items);

    if (resolvedItems.length === 0) {
      await this.recordParseRun({
        tenantId,
        messageId: body.message_id,
        clientEmail: body.client_email,
        stage: 'create',
        status: 'failed',
        source: body.parsing_source,
        inputItems: body.items,
        unmatchedItems: rejectedItems,
        errorMessage:
          'No valid and available catalog products matched extracted items',
      });

      await markSourceMessage(this.prisma, 'parsed', {
        parsed_items: body.items,
        parsing_source: body.parsing_source || 'rfq_workflow',
        rejected_items: rejectedItems,
        parsing_error:
          'No valid and available catalog products matched extracted items',
        auto_rfq_created: false,
      });

      throw new BadRequestException(
        'No valid and available catalog products matched extracted items',
      );
    }

    const normalizedParsingConfidence =
      typeof body.parsing_confidence === 'string'
        ? body.parsing_confidence.trim().toLowerCase()
        : '';

    let confidenceScore = 0;
    if (normalizedParsingConfidence === 'high') {
      confidenceScore = 90;
    } else if (normalizedParsingConfidence === 'medium') {
      confidenceScore = 70;
    } else if (normalizedParsingConfidence === 'low') {
      confidenceScore = 40;
    }

    const { createdRfq, createdQuotation } = await this.runInTransaction(
      async (db) => {
        let client = await db.client.findFirst({
          where: {
            tenant_id: tenantId,
            email: body.client_email,
          },
        });

        if (!client) {
          const fallbackName =
            body.client_email.split('@')[0] || 'Email Client';
          client = await db.client.create({
            data: {
              tenant_id: tenantId,
              name: fallbackName,
              type: 'B2B',
              email: body.client_email,
              tier: 'regular',
            },
          });
        }

        // Support reparsing: if source message already had an rfq_id, update that RFQ
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const existingRfqId =
          sourceMessage.raw_payload &&
          typeof sourceMessage.raw_payload === 'object'
            ? (sourceMessage.raw_payload as Record<string, any>)['rfq_id']
            : undefined;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const existingQuotationId =
          sourceMessage.raw_payload &&
          typeof sourceMessage.raw_payload === 'object'
            ? (sourceMessage.raw_payload as Record<string, any>)['quotation_id']
            : undefined;

        if (existingRfqId) {
          const existingRfq = await db.rFQ.findFirst({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            where: { id: existingRfqId, tenant_id: tenantId },
            include: { client: true, items: true, quotation: true },
          });

          if (existingRfq) {
            // replace items
            await db.rFQItem.deleteMany({ where: { rfq_id: existingRfq.id } });

            await db.rFQ.update({
              where: { id: existingRfq.id },
              data: {
                client_id: client.id,
                channel: 'email',
                priority: 'medium',
                status: 'pending',
                confidence_score: confidenceScore,
              },
            });

            if (resolvedItems.length) {
              await db.rFQItem.createMany({
                data: resolvedItems.map((item) => ({
                  rfq_id: existingRfq.id,
                  product_id: item.product_id,
                  product_name: item.product_name,
                  quantity: Number(item.quantity),
                  unit: item.unit,
                  notes: item.notes,
                })),
              });
            }

            const updatedRfq = await db.rFQ.findFirst({
              where: { id: existingRfq.id },
              include: { client: true, items: true, quotation: true },
            });

            // if there was an existing quotation created from this RFQ, delete it and recreate
            if (existingQuotationId) {
              const existingQuotation = await db.quotation.findFirst({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                where: { id: existingQuotationId, tenant_id: tenantId },
              });

              if (existingQuotation) {
                await db.quotationItem.deleteMany({
                  where: { quotation_id: existingQuotation.id },
                });
                await db.quotation.delete({
                  where: { id: existingQuotation.id },
                });
              }
            }

            const newQuotation = await this.convertToQuotationWithDb(
              db,
              updatedRfq as unknown as RfqWithRelations,
              tenantId,
            );

            return { createdRfq: updatedRfq, createdQuotation: newQuotation };
          }
        }

        // default: create new RFQ+Quotation
        const createdRfq = await this.createWithDb(db, tenantId, {
          client_id: client.id,
          channel: 'email',
          priority: 'medium',
          status: 'pending',
          confidence_score: confidenceScore,
          items: resolvedItems,
        });

        const createdQuotation = await this.convertToQuotationWithDb(
          db,
          createdRfq,
          tenantId,
        );

        return { createdRfq, createdQuotation };
      },
    );

    // update source message payload to reflect parsing outcome and links
    try {
      const payload =
        sourceMessage.raw_payload &&
        typeof sourceMessage.raw_payload === 'object'
          ? (sourceMessage.raw_payload as Record<string, unknown>)
          : {};

      const getStringProp = (obj: unknown, key: string): string | null => {
        if (!obj || typeof obj !== 'object') return null;
        const val = (obj as Record<string, unknown>)[key];
        return typeof val === 'string' ? val : null;
      };

      const getDatePropIso = (obj: unknown, key: string): string => {
        if (!obj || typeof obj !== 'object') return new Date().toISOString();
        const val = (obj as Record<string, unknown>)[key];
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'string') return val;
        return new Date().toISOString();
      };

      await this.prisma.message.update({
        where: { id: sourceMessage.id },
        data: {
          processing_status: 'parsed',
          is_processed: true,
          raw_payload: {
            ...payload,
            parsed_items: body.items,
            rejected_items: rejectedItems,
            matched_items_count: resolvedItems.length,
            parsing_source: body.parsing_source || 'rfq_workflow',
            ...(body.parsing_confidence
              ? { parsing_confidence: body.parsing_confidence }
              : {}),
            auto_rfq_created: true,
            rfq_id: getStringProp(createdRfq, 'id'),
            rfq_created_at: getDatePropIso(createdRfq, 'created_at'),
            auto_quotation_created: true,
            quotation_id: getStringProp(createdQuotation, 'id'),
            quotation_created_at: getDatePropIso(
              createdQuotation,
              'created_at',
            ),
          } as unknown as Prisma.InputJsonValue,
          updated_at: new Date(),
        },
      });
    } catch (err) {
      // best-effort: continue even if message update fails
      this.logger.warn(`Failed to update source message payload: ${(err as Error).message}`);
    }

    await this.recordParseRun({
      tenantId,
      messageId: body.message_id,
      clientEmail: body.client_email,
      stage: 'create',
      status: rejectedItems.length > 0 ? 'partial' : 'success',
      source: body.parsing_source,
      inputItems: body.items,
      matchedItems: resolvedItems,
      unmatchedItems: rejectedItems,
    });

    return {
      ...createdRfq,
      quotation_id: createdQuotation.id,
    };
  }

  async update(
    id: string,
    tenantId: string,
    body: Partial<{
      client_id: string;
      channel: string;
      priority: string;
      status: string;
      confidence_score: number;
      due_date: string;
      items: RfqItemInput[];
    }>,
  ) {
    await this.findOne(id, tenantId);

    if (body.items) {
      await this.prisma.rFQItem.deleteMany({ where: { rfq_id: id } });
    }

    return this.prisma.rFQ.update({
      where: { id },
      data: {
        ...(body.client_id ? { client_id: body.client_id } : {}),
        ...(body.channel ? { channel: body.channel } : {}),
        ...(body.priority ? { priority: body.priority } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.confidence_score !== undefined
          ? { confidence_score: Number(body.confidence_score) }
          : {}),
        ...(body.due_date !== undefined
          ? { due_date: body.due_date ? new Date(body.due_date) : null }
          : {}),
        ...(body.items
          ? {
              items: {
                createMany: {
                  data: body.items.map((item) => ({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: Number(item.quantity),
                    unit: item.unit,
                    notes: item.notes,
                  })),
                },
              },
            }
          : {}),
      },
      include: { client: true, items: true, quotation: true },
    });
  }

  async remove(
    id: string,
    tenantId: string,
    options?: { forceDeleteLinkedQuotation?: boolean },
  ) {
    const rfq = await this.findOne(id, tenantId);

    // quotation_id may be added in DB schema but TS types may not reflect it yet; use any guard
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const linkedQuotationId = (rfq as any)?.quotation_id;
    if (linkedQuotationId && !options?.forceDeleteLinkedQuotation) {
      throw new BadRequestException(
        `RFQ has a linked Quotation (${linkedQuotationId}). To delete both, call remove with { forceDeleteLinkedQuotation: true }`,
      );
    }

    if (linkedQuotationId && options?.forceDeleteLinkedQuotation) {
      try {
        await this.prisma.quotation.update({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: { id: linkedQuotationId },
          data: { deleted_at: new Date() },
        });
      } catch (err) {
        // proceed even if soft-deletion of quotation fails
        this.logger.warn(`Failed to soft-delete linked quotation: ${(err as Error).message}`);
      }
    }

    await this.prisma.rFQ.update({ where: { id }, data: { deleted_at: new Date() } });
    return { message: 'RFQ deleted successfully' };
  }

  async forceDelete(
    id: string,
    tenantId: string,
    options?: { forceDeleteLinkedQuotation?: boolean },
  ) {
    const rfq = await this.prisma.rFQ.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!rfq) {
      throw new NotFoundException(`RFQ ${id} not found`);
    }

    const linkedQuotationId = (rfq as any)?.quotation_id;
    if (linkedQuotationId && options?.forceDeleteLinkedQuotation) {
      await this.prisma.quotationItem.deleteMany({ where: { quotation_id: linkedQuotationId } });
      await this.prisma.quotationVersion.deleteMany({ where: { quotation_id: linkedQuotationId } });
      await this.prisma.quotation.delete({ where: { id: linkedQuotationId } }).catch(() => {});
    }

    await this.prisma.rFQItem.deleteMany({ where: { rfq_id: id } });
    await this.prisma.rFQ.delete({ where: { id } });
    return { message: 'RFQ permanently deleted' };
  }

  async updateStatus(id: string, tenantId: string, status: string) {
    return this.update(id, tenantId, { status });
  }

  async sendByEmail(
    id: string,
    tenantId: string,
    payload: {
      to?: string[];
      cc?: string[];
      email_account_id?: string;
      subject?: string;
      message?: string;
    },
  ) {
    const rfq = await this.findOne(id, tenantId);

    const recipients =
      payload.to?.filter((email) => email && email.trim().length > 0) ||
      (rfq.client.email ? [rfq.client.email] : []);

    if (recipients.length === 0) {
      throw new BadRequestException('No recipient email found for RFQ client');
    }

    const selectedAccount = payload.email_account_id
      ? await this.prisma.emailAccount.findFirst({
          where: {
            id: payload.email_account_id,
            tenant_id: tenantId,
            is_active: true,
          },
          select: { id: true },
        })
      : await this.prisma.emailAccount.findFirst({
          where: { tenant_id: tenantId, is_active: true },
          orderBy: { created_at: 'asc' },
          select: { id: true },
        });

    if (!selectedAccount) {
      throw new BadRequestException(
        'No active email account available to send RFQ email',
      );
    }

    const subject = payload.subject?.trim() || `Regarding RFQ ${rfq.number}`;
    const stockWarnings = this.collectStockWarningNotes(rfq.items);
    const stockWarningSection = stockWarnings.length
      ? [
          '',
          'Stock / fulfillment notes:',
          '',
          ...stockWarnings.map((note) => `- ${note}`),
          '',
        ]
      : [];
    const customMessage = payload.message?.trim() || '';
    const body = customMessage
      ? [
          `Dear ${rfq.client.name},`,
          '',
          customMessage,
          ...(stockWarningSection.length ? stockWarningSection : []),
          'Best regards,',
          'Quotebot Sales Team',
        ].join('\n')
      : `Dear ${rfq.client.name},\n\nRegarding your RFQ ${rfq.number}, we will share an update shortly.${stockWarningSection.length ? `\n\n${stockWarningSection.join('\n')}` : ''}\n\nBest regards,\nQuotebot Sales Team`;

    const queued = await this.emailService.createOutboundEmail(tenantId, {
      email_account_id: selectedAccount.id,
      to: recipients,
      cc: payload.cc,
      subject,
      body,
    });

    return {
      queued: true,
      outbound_email_id: queued.id,
      to: queued.to,
      cc: queued.cc,
      subject: queued.subject,
      status: queued.status,
    };
  }

  private async convertToQuotationWithDb(
    db: RfqDbClient,
    rfq: RfqWithRelations,
    tenantId: string,
  ) {
    if (rfq.status === 'converted') {
      throw new BadRequestException('RFQ is already converted to quotation');
    }

    const quotationNumber = this.generateQuotationNumber();

    const productIds = Array.from(
      new Set(rfq.items.map((item) => item.product_id).filter(Boolean)),
    );
    const products = productIds.length
      ? await db.product.findMany({
          where: {
            tenant_id: tenantId,
            id: { in: productIds },
          },
          select: {
            id: true,
            price: true,
            gst_percent: true,
            stock: true,
          },
        })
      : [];

    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );

    const quotationItems = rfq.items.map((item) => {
      const matchedProduct = productMap.get(item.product_id);
      const unitPrice = Number(matchedProduct?.price ?? 0);
      const taxPercent = Number(matchedProduct?.gst_percent ?? 18);
      const availableStock = matchedProduct?.stock ?? 0;
      const qty = Number(item.quantity);
      const lineSubtotal = qty * unitPrice;
      const lineTax = (lineSubtotal * taxPercent) / 100;
      const lineTotal = lineSubtotal + lineTax;

      // determine availability flag per item
      let availability: string | undefined = undefined;
      let available_quantity: number | undefined = undefined;
      if (availableStock <= 0) {
        availability = 'out_of_stock';
        available_quantity = 0;
      } else if (qty > availableStock) {
        availability = 'insufficient_stock';
        available_quantity = availableStock;
      } else {
        availability = 'available';
        available_quantity = availableStock;
      }

      return {
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: qty,
        unit: item.unit,
        unit_price: unitPrice,
        tax_percent: taxPercent,
        total: Number(lineTotal.toFixed(2)),
        notes: item.notes ?? undefined,
        availability,
        available_quantity,
      };
    });

    const stockWarnings = this.collectStockWarningNotes(rfq.items);
    const quotationTermsConditions = stockWarnings.length
      ? stockWarnings.join('\n')
      : undefined;

    const subtotal = Number(
      quotationItems
        .reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
        .toFixed(2),
    );
    const tax = Number(
      quotationItems
        .reduce(
          (sum, item) =>
            sum + (item.quantity * item.unit_price * item.tax_percent) / 100,
          0,
        )
        .toFixed(2),
    );
    const total = Number((subtotal + tax).toFixed(2));

    const quotation = await db.quotation.create({
      data: {
        tenant_id: tenantId,
        number: quotationNumber,
        client_id: rfq.client_id,
        display_name: this.buildDisplayAndTokens(
          'QT',
          rfq.client?.name || '',
          rfq.items.map((i) => i.product_name),
        ).display,
        search_tokens: this.buildDisplayAndTokens(
          'QT',
          rfq.client?.name || '',
          rfq.items.map((i) => i.product_name),
        ).tokens as unknown as Prisma.InputJsonValue,
        date: new Date(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'draft',
        terms_conditions: quotationTermsConditions,
        subtotal,
        tax,
        total,
        items: {
          createMany: {
            data: quotationItems,
          },
        },
      },
      include: { items: true, client: true },
    });

    // link RFQ -> Quotation and mark converted
    await db.rFQ.update({
      where: { id: rfq.id },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: { status: 'converted', quotation_id: quotation.id } as any,
    });

    return quotation;
  }

  convertToQuotation(id: string, tenantId: string) {
    return this.runInTransaction(async (db) => {
      const rfq = await db.rFQ.findFirst({
        where: { id, tenant_id: tenantId },
        include: { client: true, items: true, quotation: true },
      });

      if (!rfq) {
        throw new NotFoundException('RFQ not found');
      }

      return this.convertToQuotationWithDb(db, rfq, tenantId);
    });
  }

  async exportCsv(
    tenantId: string,
    query: {
      search?: string;
      status?: string;
      channel?: string;
      limit?: number;
    },
  ) {
    const result = await this.findAll(tenantId, { ...query, pageSize: 10000 });

    return recordsToCsv(
      result.data.map((rfq: any) => ({
        number: rfq.number,
        client: rfq.client.name,
        channel: rfq.channel,
        priority: rfq.priority,
        status: rfq.status,
        confidence_score: rfq.confidence_score,
        due_date: rfq.due_date?.toISOString() ?? '',
        item_count: rfq.items.length,
        created_at: rfq.created_at.toISOString(),
      })),
    );
  }
}
