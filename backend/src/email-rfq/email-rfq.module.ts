import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RfqsModule } from '../rfqs/rfqs.module';
import { QuotationsModule } from '../quotations/quotations.module';
import { EmailModule } from '../email/email.module';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';
import { EmailRfqController } from './email-rfq.controller';
import { EmailRfqService } from './email-rfq.service';
import { ThreadResolverService } from './thread-resolver.service';
import { PoMatcherService } from './po-matcher.service';

@Module({
  imports: [RfqsModule, QuotationsModule, EmailModule, EmailTemplatesModule],
  controllers: [EmailRfqController],
  providers: [
    EmailRfqService,
    PrismaService,
    ThreadResolverService,
    PoMatcherService,
  ],
  exports: [EmailRfqService, ThreadResolverService, PoMatcherService],
})
export class EmailRfqModule {}
