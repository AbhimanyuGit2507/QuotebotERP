import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InboxService } from './inbox.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UpdateMessageProcessingStatusDto } from './dtos/update-message-processing-status.dto';
import { RetryMessageDto } from './dtos/retry-message.dto';
import { InternalOrJwtAuthGuard } from '../common/guards/internal-or-jwt-auth.guard';
import {
  AssistanceTicketStatus,
  FollowupType,
  MessageClassification,
} from '@prisma/client';
import { AssignAssistanceTicketDto } from './dtos/assign-assistance-ticket.dto';
import { UpdateAssistanceTicketStatusDto } from './dtos/update-assistance-ticket-status.dto';

@UseGuards(InternalOrJwtAuthGuard)
@Controller('inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get('intelligence')
  getInboxIntelligence(
    @CurrentUser() user: AuthenticatedUser,
    @Query('classification') classification?: MessageClassification,
  ) {
    if (
      classification &&
      !Object.values(MessageClassification).includes(classification)
    ) {
      throw new BadRequestException('Invalid classification');
    }

    return this.inboxService.getInboxIntelligence(
      user.tenant_id,
      classification,
    );
  }

  @Get('assistance-queue')
  getManualAssistanceQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: AssistanceTicketStatus,
    @Query('type') type?: FollowupType,
  ) {
    const normalizedStatus = status || AssistanceTicketStatus.OPEN;
    if (!Object.values(AssistanceTicketStatus).includes(normalizedStatus)) {
      throw new BadRequestException('Invalid assistance status');
    }

    if (type && !Object.values(FollowupType).includes(type)) {
      throw new BadRequestException('Invalid followup type');
    }

    return this.inboxService.getManualAssistanceQueue(
      user.tenant_id,
      normalizedStatus,
      type,
    );
  }

  @Patch('assistance-queue/:id/assign')
  assignAssistanceTicket(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AssignAssistanceTicketDto,
  ) {
    return this.inboxService.assignAssistanceTicket(
      id,
      user.tenant_id,
      body.assigned_to_id,
    );
  }

  @Patch('assistance-queue/:id/status')
  updateAssistanceTicketStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateAssistanceTicketStatusDto,
  ) {
    return this.inboxService.updateAssistanceTicketStatus(
      id,
      user.tenant_id,
      body.status,
    );
  }

  @Get('messages')
  findMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Query('processing_status')
    processingStatus?: 'pending' | 'parsed' | 'failed',
  ) {
    if (processingStatus) {
      return this.inboxService.findMessagesForProcessing(
        user.tenant_id,
        processingStatus,
      );
    }

    return this.inboxService.findMessages(user.tenant_id);
  }

  @Get('messages/:id/thread')
  getMessageThread(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inboxService.getMessageThread(id, user.tenant_id);
  }

  @Patch('messages/:id')
  updateMessageProcessingStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateMessageProcessingStatusDto,
  ) {
    return this.inboxService.updateMessageProcessingStatus(
      id,
      user.tenant_id,
      body,
    );
  }

  @Post('messages/:id/retry')
  retryMessageParsing(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RetryMessageDto,
  ) {
    return this.inboxService.retryMessageParsing(id, user.tenant_id, body);
  }

  @Post('rfqs/:rfqId/retry')
  retryRfqSourceMessage(
    @Param('rfqId') rfqId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RetryMessageDto,
  ) {
    return this.inboxService.retrySourceMessageByRfqId(
      rfqId,
      user.tenant_id,
      body,
    );
  }
}
