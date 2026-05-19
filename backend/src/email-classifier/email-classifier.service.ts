import { Injectable, Logger } from '@nestjs/common';

type BillDetection = {
  type: 'invoice' | 'receipt' | 'payment_reminder' | 'other';
  confidence: number; // 0..1
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  dueDate?: string;
  raw: Record<string, unknown>;
};

@Injectable()
export class EmailClassifierService {
  private readonly logger = new Logger(EmailClassifierService.name);

  detectBill(subject: string, body: string): BillDetection | null {
    const text = `${subject || ''}\n${body || ''}`.toLowerCase();

    // Quick heuristic checks
    const hasInvoiceKeywords = /\binvoice\b|\bbill\b|\bamount due\b|\bdue date\b|\binvoice no\b|\binv[:#]/i.test(text);
    const hasAmount = /(?:amount\s*(?:due|:)?\s*[₹$€£]?\s?\d+[\d,.]*)|(?:total[:\s]*[₹$€£]?\s?\d+[\d,.]*)/i.test(text);
    const invoiceMatch = text.match(/\b(inv(?:oice)?\s*(?:no\.?|number|#)?\s*[:#]?\s*([a-z0-9\-\/]{4,}))\b/i);
    const invoiceNumber = invoiceMatch ? invoiceMatch[2] : undefined;

    const amountMatch = text.match(/(?:amount (?:due|:)?\s*[₹$€£]?\s?([0-9,.]+))|(?:total[:\s]*[₹$€£]?\s?([0-9,.]+))/i);
    const amountStr = amountMatch ? (amountMatch[1] || amountMatch[2]) : undefined;
    const amount = amountStr ? Number(String(amountStr).replace(/[, ]+/g, '')) : undefined;

    if (!hasInvoiceKeywords && !hasAmount) {
      return null;
    }

    // Basic scoring
    let score = 0.2;
    if (hasInvoiceKeywords) score += 0.4;
    if (hasAmount) score += 0.25;
    if (invoiceNumber) score += 0.15;
    score = Math.min(1, score);

    const detection: BillDetection = {
      type: 'invoice',
      confidence: score,
      invoiceNumber,
      amount,
      currency: undefined,
      dueDate: undefined,
      raw: { hasInvoiceKeywords, hasAmount, invoiceMatch: invoiceMatch ? invoiceMatch[0] : null, amountMatch: amountMatch ? amountMatch[0] : null },
    };

    this.logger.debug(`Bill detection result: ${JSON.stringify(detection)}`);
    return detection;
  }
}

export type { BillDetection };
