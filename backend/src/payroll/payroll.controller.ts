import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../types/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IpAddress } from '../common/decorators/ip-address.decorator';
import { UserAgent } from '../common/decorators/user-agent.decorator';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { UpdatePayrollItemDto } from './dto/update-payroll-item.dto';
import { UpdatePayrollRunDto } from './dto/update-payroll-run.dto';

@Controller('payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('runs')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async getPayrollRuns(@CurrentUser() user: any) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    return this.payrollService.getPayrollRuns(companyId);
  }

  @Get('runs/:id')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async getPayrollRun(@Param('id') id: string, @CurrentUser() user: any) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    return this.payrollService.getPayrollRun(id, companyId);
  }

  @Post('runs')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async createPayrollRun(
    @CurrentUser() user: any,
    @Body() createPayrollRunDto: CreatePayrollRunDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    return this.payrollService.createPayrollRun(companyId, user.id, createPayrollRunDto, ipAddress, userAgent);
  }

  @Put('runs/:id/recalculate')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async recalculateTotal(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    return this.payrollService.recalculateTotal(id, companyId);
  }

  @Put('runs/:id/lock')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async lockPayrollRun(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    return this.payrollService.lockPayrollRun(id, companyId, user.id, ipAddress, userAgent);
  }

  @Put('runs/:id')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async updatePayrollRun(
    @Param('id') id: string,
    @Body() updatePayrollRunDto: UpdatePayrollRunDto,
    @CurrentUser() user: any,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    return this.payrollService.updatePayrollRun(id, companyId, updatePayrollRunDto, user.id, ipAddress, userAgent);
  }

  @Delete('runs/:id')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async deletePayrollRun(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    return this.payrollService.deletePayrollRun(id, companyId);
  }

  @Put('items/:itemId')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async updatePayrollItem(
    @Param('itemId') itemId: string,
    @Body() updatePayrollItemDto: UpdatePayrollItemDto,
    @Query('payrollRunId') payrollRunId: string,
    @CurrentUser() user: any,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    return this.payrollService.updatePayrollItem(itemId, payrollRunId, companyId, updatePayrollItemDto, user.id, ipAddress, userAgent);
  }

  @Get('payslips')
  async getMyPayslips(@CurrentUser() user: any) {
    const employeeId = user.employee?.id;
    if (!employeeId) {
      throw new Error('Employee not found');
    }
    return this.payrollService.getEmployeePayslips(employeeId, user);
  }

  @Get('payslips/:payrollRunId')
  async getPayslip(
    @Param('payrollRunId') payrollRunId: string,
    @CurrentUser() user: any,
  ) {
    const employeeId = user.employee?.id;
    if (!employeeId) {
      throw new BadRequestException('Employee not found');
    }
    return this.payrollService.getPayslip(employeeId, payrollRunId, user);
  }
}

