import { IsString, IsOptional, IsEmail, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  npwp?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  geofencingEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  geofencingLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  geofencingLongitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  geofencingRadius?: number;
}
