import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [PaymentsService, PrismaService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
