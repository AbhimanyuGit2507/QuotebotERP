import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AdminService } from './admin.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
