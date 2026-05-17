import { IsIn } from 'class-validator';

export class UpdateQuotationStatusDto {
  @IsIn(['draft', 'sent', 'accepted', 'declined'])
  status!: string;
}
