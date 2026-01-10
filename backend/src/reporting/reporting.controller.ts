import {
  Controller,
  Get,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../types/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('attendance')
  async getAttendanceSummary(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('employeeId') employeeId?: string,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    
    // Check permissions
    if (user.role === Role.EMPLOYEE && employeeId && employeeId !== user.employee?.id) {
      throw new Error('Can only view your own attendance');
    }

    return this.reportingService.getAttendanceSummary(
      companyId,
      new Date(startDate),
      new Date(endDate),
      employeeId,
    );
  }

  @Get('leave')
  async getLeaveUsage(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('employeeId') employeeId?: string,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    
    // Check permissions
    if (user.role === Role.EMPLOYEE && employeeId && employeeId !== user.employee?.id) {
      throw new Error('Can only view your own leave usage');
    }

    return this.reportingService.getLeaveUsage(
      companyId,
      new Date(startDate),
      new Date(endDate),
      employeeId,
    );
  }

  @Get('overtime')
  async getOvertimeCost(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('employeeId') employeeId?: string,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    
    // Check permissions
    if (user.role === Role.EMPLOYEE && employeeId && employeeId !== user.employee?.id) {
      throw new Error('Can only view your own overtime');
    }

    return this.reportingService.getOvertimeCost(
      companyId,
      new Date(startDate),
      new Date(endDate),
      employeeId,
    );
  }

  @Get('payroll')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async getPayrollTotals(
    @CurrentUser() user: any,
    @Query('periodYear') periodYear?: string,
    @Query('periodMonth') periodMonth?: string,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    
    return this.reportingService.getPayrollTotals(
      companyId,
      periodYear ? parseInt(periodYear) : undefined,
      periodMonth ? parseInt(periodMonth) : undefined,
    );
  }
}

