import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RfqsModule } from '../rfqs/rfqs.module';
import { EmailRfqController } from './email-rfq.controller';
import { EmailRfqService } from './email-rfq.service';

@Module({
  imports: [RfqsModule],
  controllers: [EmailRfqController],
  providers: [EmailRfqService, PrismaService],
  exports: [EmailRfqService],
})
export class EmailRfqModule {}
