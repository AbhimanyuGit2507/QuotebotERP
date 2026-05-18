import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UpdateCompanySettingsDto } from './dtos/update-company-settings.dto';
import { UpdateNotificationSettingsDto } from './dtos/update-notification-settings.dto';
import { CreateTemplateDto } from './dtos/create-template.dto';
import { UpdateTemplateDto } from './dtos/update-template.dto';
import { CreateAutomationRuleDto } from './dtos/create-automation-rule.dto';
import { UpdateAutomationRuleDto } from './dtos/update-automation-rule.dto';

@ApiTags('Settings')
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('company')
  getCompany(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getCompany(user.tenant_id);
  }

  @Put('company')
  updateCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateCompanySettingsDto,
  ) {
    return this.settingsService.updateCompany(user.tenant_id, body);
  }

  @Get('notifications')
  getNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getNotifications(user.tenant_id);
  }

  @Put('notifications')
  updateNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateNotificationSettingsDto,
  ) {
    return this.settingsService.updateNotifications(user.tenant_id, body);
  }

  @Get('templates')
  getTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getTemplates(user.tenant_id);
  }

  @Post('templates')
  createTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateTemplateDto,
  ) {
    return this.settingsService.createTemplate(user.tenant_id, body);
  }

  @Put('templates/:id')
  updateTemplate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateTemplateDto,
  ) {
    return this.settingsService.updateTemplate(id, user.tenant_id, body);
  }

  @Delete('templates/:id')
  deleteTemplate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settingsService.deleteTemplate(id, user.tenant_id);
  }

  @Get('automation-rules')
  getAutomationRules(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getAutomationRules(user.tenant_id);
  }

  @Post('automation-rules')
  createAutomationRule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateAutomationRuleDto,
  ) {
    return this.settingsService.createAutomationRule(user.tenant_id, body);
  }

  @Put('automation-rules/:id')
  updateAutomationRule(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateAutomationRuleDto,
  ) {
    return this.settingsService.updateAutomationRule(id, user.tenant_id, body);
  }

  @Delete('automation-rules/:id')
  deleteAutomationRule(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.settingsService.deleteAutomationRule(id, user.tenant_id);
  }
}
