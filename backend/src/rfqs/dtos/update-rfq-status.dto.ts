import { IsIn } from 'class-validator';

export class UpdateRfqStatusDto {
  @IsIn(['pending', 'quoted', 'converted', 'expired', 'spam'])
  status!: string;
}
