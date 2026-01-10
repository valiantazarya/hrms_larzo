import {
  IsString,
  IsDateString,
  IsOptional,
  MinLength,
  IsUUID,
} from 'class-validator';

export class CreateAttendanceAdjustmentDto {
  @IsUUID()
  attendanceId: string;

  @IsOptional()
  @IsDateString()
  clockIn?: string;

  @IsOptional()
  @IsDateString()
  clockOut?: string;

  @IsString()
  @MinLength(10)
  reason: string;
}


