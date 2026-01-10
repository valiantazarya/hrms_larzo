import { IsObject, IsBoolean, IsOptional } from 'class-validator';

export class UpdatePolicyDto {
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}


