import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { EmailTemplatesService } from './email-templates.service';
import { CreateEmailTemplateDto } from './dtos/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dtos/update-email-template.dto';
import { EmailTemplateType } from '@prisma/client';

@Controller('email-templates')
@UseGuards(JwtAuthGuard)
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Get()
  async findAll(@Req() req) {
    const tenantId = req.user.tenant_id;
    return this.emailTemplatesService.findAll(tenantId);
  }

  @Get('by-type/:type')
  async findByType(@Req() req, @Param('type') type: EmailTemplateType) {
    const tenantId = req.user.tenant_id;
    return this.emailTemplatesService.findByType(tenantId, type);
  }

  @Get('variables/:type')
  getAvailableVariables(@Param('type') type: EmailTemplateType) {
    return this.emailTemplatesService.getAvailableVariables(type);
  }

  @Post()
  async upsert(@Req() req, @Body() dto: CreateEmailTemplateDto) {
    const tenantId = req.user.tenant_id;
    return this.emailTemplatesService.upsert(tenantId, dto);
  }

  @Post('initialize')
  async initializeDefaults(@Req() req) {
    const tenantId = req.user.tenant_id;
    return this.emailTemplatesService.initializeDefaultTemplates(tenantId);
  }

  @Put(':id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    const tenantId = req.user.tenant_id;
    return this.emailTemplatesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  async delete(@Req() req, @Param('id') id: string) {
    const tenantId = req.user.tenant_id;
    return this.emailTemplatesService.delete(id, tenantId);
  }
}
