import {
  IsUUID,
  IsDateString,
  IsString,
  IsOptional,
} from 'class-validator';

export class UpdateLeaveRequestDto {
  @IsOptional()
  @IsUUID()
  leaveTypeId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}


