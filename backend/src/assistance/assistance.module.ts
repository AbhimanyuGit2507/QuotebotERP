import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AssistanceController } from './assistance.controller';
import { AssistanceService } from './assistance.service';

@Module({
  controllers: [AssistanceController],
  providers: [AssistanceService, PrismaService],
  exports: [AssistanceService],
})
export class AssistanceModule {}
