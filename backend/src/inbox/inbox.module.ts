import { Module } from '@nestjs/common';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [InboxController],
  providers: [InboxService, PrismaService],
})
export class InboxModule {}
