import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { SuggestionsController } from './suggestions.controller';
import { SuggestionsService } from './suggestions.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [AnalyticsController, SuggestionsController],
  providers: [AnalyticsService, SuggestionsService, PrismaService],
})
export class AnalyticsModule {}
