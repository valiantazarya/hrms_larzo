import {
  IsDateString,
  IsNumber,
  IsString,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOvertimeRequestDto {
  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  duration: number; // in minutes

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}


