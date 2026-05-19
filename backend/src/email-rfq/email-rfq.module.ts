import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RfqsModule } from '../rfqs/rfqs.module';
import { QuotationsModule } from '../quotations/quotations.module';
import { EmailModule } from '../email/email.module';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';
import { BillsModule } from '../bills/bills.module';
import { EmailClassifierService } from '../email-classifier/email-classifier.service';
import { ItemIntelligenceModule } from '../item-intelligence/item-intelligence.module';
import { EmailRfqController } from './email-rfq.controller';
import { EmailRfqService } from './email-rfq.service';
import { ThreadResolverService } from './thread-resolver.service';
import { PoMatcherService } from './po-matcher.service';

@Module({
  imports: [
    RfqsModule,
    QuotationsModule,
    EmailModule,
    EmailTemplatesModule,
    BillsModule,
    ItemIntelligenceModule,
  ],
  controllers: [EmailRfqController],
  providers: [
    EmailRfqService,
    PrismaService,
    ThreadResolverService,
    PoMatcherService,
    EmailClassifierService,
  ],
  exports: [EmailRfqService, ThreadResolverService, PoMatcherService],
})
export class EmailRfqModule {}
