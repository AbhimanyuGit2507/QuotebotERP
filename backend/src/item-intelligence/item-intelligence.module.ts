import { Module } from '@nestjs/common';
import { ItemIntelligenceService } from './item-intelligence.service';
import { AliasProposalService } from './alias-proposal.service';
import { ItemIntelligenceController } from './item-intelligence.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [ItemIntelligenceService, AliasProposalService, PrismaService],
  controllers: [ItemIntelligenceController],
  exports: [ItemIntelligenceService, AliasProposalService],
})
export class ItemIntelligenceModule {}
