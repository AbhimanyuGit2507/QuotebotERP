import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AssistanceService } from './assistance.service';

@UseGuards(JwtAuthGuard)
@Controller('assistance-tickets')
export class AssistanceController {
  constructor(private readonly assistanceService: AssistanceService) {}

  @Get()
  async list(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('assigned_to') assignedTo?: string,
  ) {
    const tenantId = req.user?.tenant_id;
    return this.assistanceService.list(tenantId, {
      status,
      type,
      assigned_to: assignedTo,
    });
  }

  @Get(':id')
  async getById(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenant_id;
    return this.assistanceService.getById(tenantId, id);
  }

  @Patch(':id/assign')
  async assign(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { user_id: string },
  ) {
    const tenantId = req.user?.tenant_id;
    return this.assistanceService.assign(tenantId, id, body.user_id);
  }

  @Patch(':id/resolve')
  async resolve(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    return this.assistanceService.resolve(tenantId, id, userId);
  }
}
