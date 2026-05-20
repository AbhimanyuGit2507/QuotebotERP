import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NormalisedWhatsAppMessage } from './whatsapp.types';
import { EmailClassifierService } from '../email-classifier/email-classifier.service';

@Injectable()
export class WhatsAppProcessorService {
  private readonly logger = new Logger(WhatsAppProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly classifier: EmailClassifierService,
  ) {}

  async process(msg: NormalisedWhatsAppMessage): Promise<void> {
    try {
      // Persist WhatsAppMessage record
      let waMessage = await this.prisma.whatsAppMessage.findFirst({
        where: {
          account_id: msg.accountId,
          external_id: msg.externalId || null,
        },
      });

      if (!waMessage) {
        waMessage = await this.prisma.whatsAppMessage.create({
          data: {
            account_id: msg.accountId,
            tenant_id: msg.tenantId,
            external_id: msg.externalId,
            from_number: msg.fromNumber,
            to_number: msg.toNumber,
            body: msg.body,
            media_url: msg.mediaUrl,
            media_type: msg.mediaType,
            direction: msg.direction,
            raw_payload: msg.rawPayload ? (msg.rawPayload as Prisma.InputJsonValue) : undefined,
          },
        });
      }

      // Use classifier to detect bill / RFQ
      const billDetection = this.classifier.detectBill('', msg.body);
      const isLikelyRfq = this.isRfqText(msg.body);

      this.logger.log(
        `WhatsApp message from ${msg.fromNumber}: isRfq=${isLikelyRfq}, isBill=${!!billDetection}`,
      );

      // Mark processed
      await this.prisma.whatsAppMessage.update({
        where: { id: waMessage.id },
        data: { is_processed: true },
      });

      // TODO: feed into full RFQ pipeline via a shared inbound handler
      // For now, just log the classification result
    } catch (err) {
      this.logger.error(`WhatsApp processor error: ${(err as Error).message}`);
    }
  }

  private isRfqText(text: string): boolean {
    const lower = text.toLowerCase();
    const rfqKeywords = [
      'quote', 'quotation', 'rfq', 'price', 'pricing', 'rate', 'rates',
      'how much', 'cost', 'inquiry', 'enquiry', 'purchase', 'order',
      'need', 'require', 'supply', 'supplier', 'pieces', 'units', 'qty',
    ];
    return rfqKeywords.some((kw) => lower.includes(kw));
  }
}
