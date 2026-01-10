import { IsEnum, IsObject, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';
import { PolicyType } from '../../types/enums';

export class CreatePolicyDto {
  @IsEnum(PolicyType)
  type: PolicyType;

  @IsObject()
  config: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

