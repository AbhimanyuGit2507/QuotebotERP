import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { InternalKeyAuthGuard } from '../common/guards/internal-key-auth.guard';
import { ParseRunsService } from './parse-runs.service';

@UseGuards(InternalKeyAuthGuard)
@Controller('internal/parse-runs')
export class ParseRunsController {
  constructor(private readonly parseRunsService: ParseRunsService) {}

  private getTenantId(req: Request): string {
    const tenantId = req['tenantId'] as string | undefined;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID not found in request');
    }
    return tenantId;
  }

  @Get()
  findAll(
    @Req() req: Request,
    @Query('stage') stage?: string,
    @Query('status') status?: string,
    @Query('message_id') messageId?: string,
    @Query('source') source?: string,
    @Query('limit') limit?: string,
  ) {
    return this.parseRunsService.findAll(this.getTenantId(req), {
      stage,
      status,
      message_id: messageId,
      source,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('summary')
  summary(@Req() req: Request, @Query('lookback_days') lookbackDays?: string) {
    return this.parseRunsService.summary(
      this.getTenantId(req),
      lookbackDays ? Number(lookbackDays) : undefined,
    );
  }

  @Post('cleanup')
  cleanup(@Req() req: Request, @Body() body: { keep_days?: number }) {
    return this.parseRunsService.cleanupOldRuns(
      this.getTenantId(req),
      body?.keep_days,
    );
  }
}
