import { IsEnum } from 'class-validator';
import { AssistanceTicketStatus } from '@prisma/client';

export class UpdateAssistanceTicketStatusDto {
  @IsEnum(AssistanceTicketStatus)
  status!: AssistanceTicketStatus;
}
