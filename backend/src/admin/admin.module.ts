import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CommonModule } from '../common/common.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EventsModule } from '../events/events.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    CommonModule,
    EventsModule,
    BullModule.registerQueue({ name: 'email-sync' }),
  ],
  controllers: [AdminController],
  providers: [AdminService, PrismaService],
})
export class AdminModule {}
