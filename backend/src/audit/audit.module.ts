import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditEventsController } from './audit-events.controller';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [AuditController, AuditEventsController],
  providers: [AuditService, PrismaService],
  exports: [AuditService],
})
export class AuditModule {}
