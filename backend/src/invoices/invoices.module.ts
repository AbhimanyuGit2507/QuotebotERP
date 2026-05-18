import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PrismaService } from '../prisma.service';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  providers: [InvoicesService, PrismaService],
  controllers: [InvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}

export default InvoicesModule;
