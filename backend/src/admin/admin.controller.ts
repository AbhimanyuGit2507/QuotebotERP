import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AdminService } from './admin.service';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma.service';
import { UpdateProcessingSettingsDto } from './dtos/update-processing-settings.dto';
import * as os from 'os';
import Redis from 'ioredis';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly eventsService: EventsService,
    private readonly prisma: PrismaService,
    @InjectQueue('email-sync') private readonly emailSyncQueue: Queue,
  ) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.overview(user.tenant_id);
  }

  @Get('users')
  users(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.users(user.tenant_id);
  }

  @Get('logs')
  logs(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.logs(user.tenant_id);
  }

  @Get('llms')
  llms(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.llms(user.tenant_id);
  }

  @Get('processing-settings')
  processingSettings() {
    return this.adminService.processingSettings();
  }

  @Put('processing-settings')
  updateProcessingSettings(@Body() body: UpdateProcessingSettingsDto) {
    return this.adminService.updateProcessingSettings(body);
  }

  @Get('health')
  async health() {
    let dbStatus: 'ok' | 'error' = 'error';
    let redisStatus: 'ok' | 'error' = 'error';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'ok';
    } catch {
      /* noop */
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const redis = new Redis(redisUrl);
      const pong = await redis.ping();
      if (pong === 'PONG') redisStatus = 'ok';
      await redis.quit();
    } catch {
      /* noop */
    }

    return {
      uptime: os.uptime(),
      processUptime: process.uptime(),
      db: dbStatus,
      redis: redisStatus,
      wsConnections: this.eventsService.getConnectionCount(),
      memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    };
  }

  @Get('queue/stats')
  async queueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.emailSyncQueue.getWaitingCount(),
      this.emailSyncQueue.getActiveCount(),
      this.emailSyncQueue.getCompletedCount(),
      this.emailSyncQueue.getFailedCount(),
      this.emailSyncQueue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }

  @Post('queue/retry-failed')
  async retryFailed() {
    const failed = await this.emailSyncQueue.getFailed();
    let retried = 0;
    for (const job of failed) {
      await job.retry();
      retried++;
    }
    return { retried };
  }
}
