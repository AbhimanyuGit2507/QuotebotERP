import { Module } from '@nestjs/common';
import { ItemIntelligenceService } from './item-intelligence.service';
import { ItemIntelligenceController } from './item-intelligence.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [ItemIntelligenceService, PrismaService],
  controllers: [ItemIntelligenceController],
  exports: [ItemIntelligenceService],
})
export class ItemIntelligenceModule {}
