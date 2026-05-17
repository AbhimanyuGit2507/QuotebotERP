import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ParseRunsController } from './parse-runs.controller';
import { ParseRunsService } from './parse-runs.service';

@Module({
  controllers: [ParseRunsController],
  providers: [ParseRunsService, PrismaService],
})
export class ParseRunsModule {}
