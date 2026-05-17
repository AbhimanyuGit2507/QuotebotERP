import {
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

@UseGuards(InternalOrJwtAuthGuard)
@Controller('inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

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
