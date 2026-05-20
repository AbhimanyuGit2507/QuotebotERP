import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventsModule } from '../events/events.module';
import { WhatsAppProcessorService } from './whatsapp-processor.service';
import { BaileysService } from './baileys/baileys.service';
import { BaileysController } from './baileys/baileys.controller';
import { MetaWhatsAppService } from './meta/meta-whatsapp.service';
import { MetaWhatsAppController } from './meta/meta-whatsapp.controller';
import { EmailClassifierService } from '../email-classifier/email-classifier.service';

@Module({
  imports: [EventsModule],
  controllers: [BaileysController, MetaWhatsAppController],
  providers: [
    PrismaService,
    EmailClassifierService,
    WhatsAppProcessorService,
    BaileysService,
    MetaWhatsAppService,
  ],
  exports: [WhatsAppProcessorService, BaileysService, MetaWhatsAppService],
})
export class WhatsAppModule {}
