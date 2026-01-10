import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { EmploymentType } from '../../types/enums';
import { Type } from 'class-transformer';

export class CreateEmploymentDto {
  @IsOptional()
  @IsEnum(EmploymentType)
  type?: EmploymentType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseSalary?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyRate?: number;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @IsOptional()
  @IsString()
  npwp?: string;

  @IsOptional()
  @IsString()
  bpjsKesehatan?: string;

  @IsOptional()
  @IsString()
  bpjsKetenagakerjaan?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasBPJS?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  transportBonus?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lunchBonus?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  thr?: number;
}

