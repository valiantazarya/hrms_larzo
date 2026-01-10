import { IsString, IsInt, IsBoolean, IsOptional, IsUUID, Min, Max, Matches, IsDateString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShiftScheduleDto {
  @IsUUID()
  employeeId: string;

  @ValidateIf(o => !o.date)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (for recurring schedules)

  @ValidateIf(o => !o.dayOfWeek)
  @IsDateString()
  date?: string; // Specific date (YYYY-MM-DD) for date-specific schedules

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format (e.g., 09:00)',
  })
  startTime: string; // HH:mm format

  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format (e.g., 17:00)',
  })
  endTime: string; // HH:mm format

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
