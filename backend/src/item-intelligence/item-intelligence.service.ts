import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { randomUUID } from 'crypto';
import {
  ItemIntelligenceFeedbackRequest,
  ItemIntelligenceFeedbackResponse,
  ItemIntelligenceMatchRequest,
  ItemIntelligenceMatchResponse,
} from './item-intelligence.types';

type SidecarCallOptions = {
  tenantId: string;
  endpoint: string;
  body: unknown;
};

@Injectable()
export class ItemIntelligenceService {
  private readonly logger = new Logger(ItemIntelligenceService.name);
  private readonly enabled =
    process.env.ITEM_INTELLIGENCE_ENABLED !== 'false';
  private readonly baseUrl =
    process.env.ITEM_INTELLIGENCE_BASE_URL || 'http://127.0.0.1:3801';
  private readonly timeoutMs = Math.min(
    Math.max(Number(process.env.ITEM_INTELLIGENCE_TIMEOUT_MS || 1500), 200),
    15000,
  );
  private readonly maxRetries = Math.min(
    Math.max(Number(process.env.ITEM_INTELLIGENCE_MAX_RETRIES || 2), 0),
    6,
  );
  private readonly retryBaseMs = Math.min(
    Math.max(Number(process.env.ITEM_INTELLIGENCE_RETRY_BASE_MS || 300), 50),
    5000,
  );

  constructor(private readonly prisma: PrismaService) {}

  isEnabled() {
    return this.enabled;
  }

  async matchItems(
    request: ItemIntelligenceMatchRequest,
  ): Promise<ItemIntelligenceMatchResponse | null> {
    if (!this.enabled) {
      return null;
    }

    const resp = await this.callWithRetry<ItemIntelligenceMatchResponse>({
      tenantId: request.tenant_id,
      endpoint: '/item-intelligence/match',
      body: request,
    });

    // persist run and candidates to DB if available
    try {
      if (resp) {
        const runId = resp.run_id || randomUUID();
        // create ItemMatchRun
        await this.prisma.itemMatchRun.create({
          data: {
            id: runId,
            item_id: request.item_id || null,
            tenant_id: request.tenant_id,
            input_text: (request.extracted_items || []).map((i) => i.product_name || '').join('; '),
            stage_used: resp.mode || 'manual',
            best_match_id: resp.items?.[0]?.best_match?.candidate_id || null,
            confidence: resp.items?.[0]?.confidence ?? null,
            auto_applied: resp.items?.[0]?.decision === 'auto_accept',
          },
        });

        // create candidates
        if (resp.items && resp.items.length) {
          for (const itm of resp.items) {
            let rank = 1;
            for (const s of itm.suggestions || []) {
              await this.prisma.itemMatchCandidate.create({
                data: {
                  id: randomUUID(),
                  run_id: runId,
                  product_id: s.candidate_id || null,
                  score: s.confidence ?? 0,
                  rank,
                  reason_json: s.metadata || {},
                },
              });
              rank += 1;
            }
          }
        }
      }
    } catch (e) {
      this.logger.warn('Failed to persist item intelligence run: ' + (e as Error).message);
    }

    return resp;
  }

  async storeFeedback(
    tenantId: string,
    request: ItemIntelligenceFeedbackRequest,
  ): Promise<ItemIntelligenceFeedbackResponse | null> {
    if (!this.enabled) {
      return null;
    }

    const resp = await this.callWithRetry<ItemIntelligenceFeedbackResponse>({
      tenantId,
      endpoint: '/item-intelligence/feedback',
      body: request,
    });

    try {
      // persist feedback locally
      await this.prisma.itemMatchFeedback.create({
        data: {
          id: randomUUID(),
          run_id: request.run_id,
          selected_product_id: request.selected_product_id || null,
          reviewer_id: request.reviewer_id || null,
          action: request.action,
          notes: request.notes || null,
        },
      });
      // Optionally update alias weights / suggestions (simple heuristic)
      if (request.action === 'accept' && request.selected_product_id && request.reviewer_id) {
        // Suggest alias creation could be queued; for now, create a low-weight alias record for later review
        // Do nothing aggressive here.
      }
    } catch (e) {
      this.logger.warn('Failed to persist item intelligence feedback: ' + (e as Error).message);
    }

    return resp;
  }

  private async callWithRetry<T>(options: SidecarCallOptions): Promise<T | null> {
    const internalKey = process.env.INTERNAL_API_KEY || '';
    if (!internalKey) {
      this.logger.warn(
        'Skipping item intelligence call because INTERNAL_API_KEY is not set.',
      );
      return null;
    }

    let lastError = 'Unknown sidecar error';

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const result = await this.callSidecar<T>(options, internalKey);
        if (attempt > 0) {
          this.logger.log(
            `Item intelligence request succeeded on retry ${attempt}.`,
          );
        }
        return result;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error.message : String(error);
        const isLast = attempt >= this.maxRetries;
        if (isLast) {
          break;
        }

        const delayMs = this.retryBaseMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    this.logger.warn(`Item intelligence call failed: ${lastError}`);
    return null;
  }

  private async callSidecar<T>(
    options: SidecarCallOptions,
    internalKey: string,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${this.baseUrl}${options.endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-key': internalKey,
          'x-tenant-id': options.tenantId,
        },
        body: JSON.stringify(options.body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Item intelligence HTTP ${response.status}: ${text.slice(0, 300)}`,
        );
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
