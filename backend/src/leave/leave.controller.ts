import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Delete,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../types/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IpAddress } from '../common/decorators/ip-address.decorator';
import { UserAgent } from '../common/decorators/user-agent.decorator';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
import { SetManualQuotaDto } from './dto/set-manual-quota.dto';

@Controller('leave')
@UseGuards(JwtAuthGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get('types')
  async getLeaveTypes(
    @CurrentUser() user: any,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    return this.leaveService.getLeaveTypes(companyId, includeInactive === 'true');
  }

  @Put('types/:id')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async updateLeaveType(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateLeaveTypeDto,
  ) {
    const companyId = user.employee?.companyId;
    if (!companyId) {
      throw new BadRequestException('Company not found');
    }
    return this.leaveService.updateLeaveType(id, companyId, updateDto);
  }

  @Get('balance')
  async getMyBalance(
    @CurrentUser() user: any,
    @Query('leaveTypeId') leaveTypeId: string,
  ) {
    const employeeId = user.employee?.id;
    if (!employeeId) {
      throw new BadRequestException('Employee not found');
    }
    return this.leaveService.getLeaveBalance(employeeId, leaveTypeId);
  }

  @Get('balance/:employeeId')
  @Roles(Role.MANAGER, Role.OWNER)
  @UseGuards(RolesGuard)
  async getEmployeeBalance(
    @Param('employeeId') employeeId: string,
    @Query('leaveTypeId') leaveTypeId: string,
    @CurrentUser() user: any,
  ) {
    return this.leaveService.getLeaveBalance(employeeId, leaveTypeId);
  }

  @Get('balances/all')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async getAllBalances(@CurrentUser() user: any) {
    const companyId = user.employee?.companyId;
    if (!companyId) {
      throw new BadRequestException('Company not found');
    }
    return this.leaveService.getAllBalancesForCompany(companyId);
  }

  @Get('requests')
  async getLeaveRequests(
    @CurrentUser() user: any,
    @Query('employeeId') employeeId?: string,
  ) {
    const targetEmployeeId = employeeId || user.employee?.id;
    if (!targetEmployeeId) {
      throw new BadRequestException('Employee not found');
    }
    return this.leaveService.getLeaveRequests(targetEmployeeId, user);
  }

  @Post('requests')
  @Roles(Role.EMPLOYEE, Role.STOCK_MANAGER, Role.SUPERVISOR)
  @UseGuards(RolesGuard)
  async createLeaveRequest(
    @CurrentUser() user: any,
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const employeeId = user.employee?.id;
    if (!employeeId) {
      throw new BadRequestException('Employee not found');
    }
    return this.leaveService.createLeaveRequest(employeeId, createLeaveRequestDto, user.id, ipAddress, userAgent);
  }

  @Put('requests/:id/approve')
  @Roles(Role.MANAGER, Role.OWNER)
  @UseGuards(RolesGuard)
  async approveLeaveRequest(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.leaveService.approveLeaveRequest(id, user.id, user, ipAddress, userAgent);
  }

  @Put('requests/:id/reject')
  @Roles(Role.MANAGER, Role.OWNER)
  @UseGuards(RolesGuard)
  async rejectLeaveRequest(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { reason: string },
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.leaveService.rejectLeaveRequest(id, user.id, body.reason, user, ipAddress, userAgent);
  }

  @Put('requests/:id')
  @Roles(Role.EMPLOYEE, Role.STOCK_MANAGER, Role.SUPERVISOR)
  @UseGuards(RolesGuard)
  async updateLeaveRequest(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateLeaveRequestDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const employeeId = user.employee?.id;
    if (!employeeId) {
      throw new BadRequestException('Employee not found');
    }
    return this.leaveService.updateLeaveRequest(id, employeeId, updateDto, user.id, ipAddress, userAgent);
  }

  @Delete('requests/:id')
  @Roles(Role.EMPLOYEE, Role.STOCK_MANAGER, Role.SUPERVISOR)
  @UseGuards(RolesGuard)
  async deleteLeaveRequest(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const employeeId = user.employee?.id;
    if (!employeeId) {
      throw new BadRequestException('Employee not found');
    }
    return this.leaveService.deleteLeaveRequest(id, employeeId, user.id, ipAddress, userAgent);
  }

  @Post('quota/manual')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async setManualQuota(
    @CurrentUser() user: any,
    @Body() setQuotaDto: SetManualQuotaDto,
  ) {
    const companyId = user.employee?.companyId;
    if (!companyId) {
      throw new BadRequestException('Company not found');
    }
    return this.leaveService.setManualQuota(
      setQuotaDto.employeeId,
      setQuotaDto.leaveTypeId,
      setQuotaDto.balance,
      user.id,
      companyId,
    );
  }
}

