import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';

export class SetManualQuotaDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  leaveTypeId: string;

  @IsNumber()
  @Min(0)
  balance: number;
}
