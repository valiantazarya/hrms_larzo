import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePayrollItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  allowances?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bonuses?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deductions?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pph21?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  transportBonus?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lunchBonus?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  thr?: number;
}

