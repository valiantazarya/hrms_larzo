import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePayrollRunDto {
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  periodYear: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth: number;

  @IsOptional()
  @IsString()
  notes?: string;
}


