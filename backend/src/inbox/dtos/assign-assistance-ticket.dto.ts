import { IsOptional, IsString } from 'class-validator';

export class AssignAssistanceTicketDto {
  @IsOptional()
  @IsString()
  assigned_to_id?: string;
}
