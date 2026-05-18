import { Module } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [AccountingService, PrismaService],
  controllers: [AccountingController],
  exports: [AccountingService],
})
export class AccountingModule {}
