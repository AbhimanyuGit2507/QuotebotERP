import { Module } from '@nestjs/common';
import { RfqsController } from './rfqs.controller';
import { RfqsService } from './rfqs.service';
import { PrismaService } from '../prisma.service';
import { EmailModule } from '../email/email.module';
import { ItemIntelligenceModule } from '../item-intelligence/item-intelligence.module';

@Module({
  imports: [EmailModule, ItemIntelligenceModule],
  controllers: [RfqsController],
  providers: [RfqsService, PrismaService],
  exports: [RfqsService],
})
export class RfqsModule {}
