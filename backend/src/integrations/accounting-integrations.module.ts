import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AccountingIntegrationsService } from './accounting-integrations.service';
import { AccountingIntegrationsController } from './accounting-integrations.controller';

@Module({
  providers: [PrismaService, AccountingIntegrationsService],
  controllers: [AccountingIntegrationsController],
  exports: [AccountingIntegrationsService],
})
export class AccountingIntegrationsModule {}

export default AccountingIntegrationsModule;
