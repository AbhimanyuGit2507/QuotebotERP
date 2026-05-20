import { Controller, Get, Put, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin Settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getNamespace(
    @CurrentUser() user: AuthenticatedUser,
    @Query('tenantId') tenantId: string | undefined,
    @Query('namespace') namespace: string,
  ) {
    const tid = user.role === 'superadmin' ? tenantId ?? user.tenant_id : user.tenant_id;
    return this.settingsService.getNamespace(tid, namespace);
  }

  @Put()
  async upsertNamespace(
    @CurrentUser() user: AuthenticatedUser,
    @Query('tenantId') tenantId: string | undefined,
    @Query('namespace') namespace: string,
    @Body() payload: Record<string, any>,
  ) {
    const tid = user.role === 'superadmin' ? tenantId ?? user.tenant_id : user.tenant_id;
    return this.settingsService.upsertNamespace(tid, namespace, payload, user.id);
  }
}
