import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BillsService } from './bills.service';
import { BillsController } from './bills.controller';
import { EmailClassifierService } from '../email-classifier/email-classifier.service';

@Module({
  imports: [],
  controllers: [BillsController],
  providers: [BillsService, PrismaService, EmailClassifierService],
  exports: [BillsService],
})
export class BillsModule {}
