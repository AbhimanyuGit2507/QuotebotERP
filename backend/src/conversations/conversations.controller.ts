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
import { ConversationsService } from './conversations.service';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async list(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('stage') stage?: string,
    @Query('assigned_to') assignedTo?: string,
  ) {
    const tenantId = req.user?.tenant_id;
    return this.conversationsService.list(tenantId, {
      status,
      stage: stage as any,
      assigned_to: assignedTo,
    });
  }

  @Get(':id')
  async getById(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenant_id;
    return this.conversationsService.getById(tenantId, id);
  }

  @Patch(':id/close')
  async closeConversation(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const tenantId = req.user?.tenant_id;
    return this.conversationsService.close(tenantId, id, body.reason);
  }

  @Patch(':id/reopen')
  async reopenConversation(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenant_id;
    return this.conversationsService.reopen(tenantId, id);
  }
}
