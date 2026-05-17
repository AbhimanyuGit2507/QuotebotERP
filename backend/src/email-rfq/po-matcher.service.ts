import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PoMatcherService {
  constructor(private readonly prisma: PrismaService) {}

  private normalize(text: string) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  async scorePurchaseOrder(params: {
    tenantId: string;
    conversationId: string;
    messageBody: string;
    messageSubject?: string;
    poRecordId?: string;
    quotationId?: string | null;
  }) {
    const {
      tenantId,
      conversationId,
      messageBody,
      messageSubject,
      poRecordId,
      quotationId,
    } = params;

    // Weights (sum=100)
    const weights = {
      thread_match: 30,
      quote_number_match: 25,
      customer_match: 15,
      sku_match: 15,
      amount_match: 10,
      domain_match: 5,
    } as const;

    // Baseline components
    let threadMatch = 0;
    let quoteNumberMatch = 0;
    let customerMatch = 0;
    let skuMatch = 0;
    let amountMatch = 0;
    let domainMatch = 0;

    // Thread match: check if conversation is linked to the quotation (if quotationId provided)
    if (quotationId) {
      const quotation = await this.prisma.quotation.findFirst({
        where: { tenant_id: tenantId, id: quotationId },
        select: {
          conversation_id: true,
          client_id: true,
          total: true,
          items: true,
        },
      });
      if (
        quotation?.conversation_id &&
        quotation.conversation_id === conversationId
      ) {
        threadMatch = 1;
      }

      // customer match: compare client email domain if available
      if (quotation?.client_id) {
        const client = await this.prisma.client.findFirst({
          where: { tenant_id: tenantId, id: quotation.client_id },
          select: { email: true },
        });
        if (client?.email) {
          const cDomain = String(client.email).split('@').pop() || '';
          const msgDomain =
            String(messageBody).match(/@([a-z0-9.-]+)\b/i)?.[1] ||
            String(messageSubject || '').match(/@([a-z0-9.-]+)\b/i)?.[1] ||
            '';
          if (cDomain && msgDomain && cDomain === msgDomain) domainMatch = 1;
        }
      }

      // SKU match: look for quotation item names present in body
      if (
        quotation?.items &&
        Array.isArray(quotation.items) &&
        quotation.items.length > 0
      ) {
        const bodyNorm = this.normalize(messageBody);
        let hits = 0;
        for (const it of quotation.items) {
          const name = String(
            (it as any).product_name || (it as any).name || '',
          ).trim();
          if (!name) continue;
          const nname = this.normalize(name);
          if (nname.length > 2 && bodyNorm.includes(nname)) hits += 1;
        }
        skuMatch = Math.min(1, hits / Math.max(quotation.items.length, 1));
      }

      // amount match: extract numeric amounts from message and compare with quotation.total
      if (quotation?.total) {
        const numbers = Array.from(
          String(messageBody || '').matchAll(
            /\b(\d{1,3}(?:[,\d]{0,}|)\.?\d{0,2})\b/g,
          ),
        )
          .map((m) => parseFloat((m[1] || '').replace(/,/g, '')))
          .filter((n) => Number.isFinite(n) && n > 0);
        if (numbers.length > 0) {
          // take largest number as candidate
          const candidate = Math.max(...numbers);
          const diff = Math.abs(candidate - (quotation.total || 0));
          const rel =
            (quotation.total || 1) > 0 ? diff / (quotation.total || 1) : 1;
          amountMatch = rel <= 0.02 ? 1 : rel <= 0.1 ? 0.6 : 0;
        }
      }

      // quote number match: look for exact match between PO number and quotation number if poRecordId provided
      if (poRecordId) {
        const po = await this.prisma.assistancePurchaseOrder.findFirst({
          where: { id: poRecordId, tenant_id: tenantId },
          select: { po_number: true },
        });
        if (po?.po_number && quotationId) {
          const quotationRec = await this.prisma.quotation.findFirst({
            where: { tenant_id: tenantId, id: quotationId },
            select: { number: true },
          });
          if (quotationRec?.number && po.po_number === quotationRec.number)
            quoteNumberMatch = 1;
        }
      }
    }

    // customer match fallback: check if message contains client email local-part or exact email
    if (!customerMatch && quotationId) {
      const quotation = await this.prisma.quotation.findFirst({
        where: { tenant_id: tenantId, id: quotationId },
        select: { client_id: true },
      });
      if (quotation?.client_id) {
        const client = await this.prisma.client.findFirst({
          where: { tenant_id: tenantId, id: quotation.client_id },
          select: { email: true },
        });
        if (client?.email) {
          const email = String(client.email).toLowerCase();
          if (
            String(messageBody || '')
              .toLowerCase()
              .includes(email) ||
            String(messageSubject || '')
              .toLowerCase()
              .includes(email)
          ) {
            customerMatch = 1;
          }
        }
      }
    }

    // compute weighted score
    const scoreRaw =
      threadMatch * weights.thread_match +
      quoteNumberMatch * weights.quote_number_match +
      customerMatch * weights.customer_match +
      skuMatch * weights.sku_match +
      amountMatch * weights.amount_match +
      domainMatch * weights.domain_match;

    const percent = Math.round((scoreRaw / 100) * 100);

    return {
      percent,
      components: {
        threadMatch,
        quoteNumberMatch,
        customerMatch,
        skuMatch,
        amountMatch,
        domainMatch,
      },
    };
  }
}
