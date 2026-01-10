import {
  IsString,
  IsDateString,
  IsOptional,
  MinLength,
} from 'class-validator';

export class UpdateAttendanceAdjustmentDto {
  @IsOptional()
  @IsDateString()
  clockIn?: string;

  @IsOptional()
  @IsDateString()
  clockOut?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  reason?: string;
}


