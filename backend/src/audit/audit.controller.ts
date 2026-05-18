import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('Audit')
@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.auditService.findAll(user.tenant_id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      entityType,
      action,
      userId,
      dateFrom,
      dateTo,
    });
  }

  @Get(':entityType/:entityId')
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditService.findByEntity(user.tenant_id, entityType, entityId);
  }
}
