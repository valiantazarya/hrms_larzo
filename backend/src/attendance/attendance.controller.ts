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
  ForbiddenException,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../types/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IpAddress } from '../common/decorators/ip-address.decorator';
import { UserAgent } from '../common/decorators/user-agent.decorator';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { CreateAttendanceAdjustmentDto } from './dto/create-adjustment.dto';
import { UpdateAttendanceAdjustmentDto } from './dto/update-adjustment.dto';
import { normalizeDateForDatabase } from '../common/utils/date-helper';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  async getMyAttendance(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const employeeId = user.employee?.id;
    if (!employeeId) {
      throw new Error('Employee not found');
    }

    if (startDate && endDate) {
      return this.attendanceService.getAttendanceList(
        employeeId,
        normalizeDateForDatabase(startDate),
        normalizeDateForDatabase(endDate),
      );
    }

    return this.attendanceService.getTodayAttendance(employeeId);
  }

  @Get('team')
  @Roles(Role.MANAGER, Role.OWNER, Role.STOCK_MANAGER, Role.SUPERVISOR)
  @UseGuards(RolesGuard)
  async getTeamAttendance(
    @CurrentUser() user: any,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const targetEmployeeId = employeeId || user.employee?.id;
    if (!targetEmployeeId) {
      throw new Error('Employee not found');
    }

    // Validate access permissions
    if (user.role === Role.MANAGER) {
      // Managers can only access their own attendance or their direct reports
      if (targetEmployeeId !== user.employee?.id) {
        const employee = await this.attendanceService.getEmployeeById(targetEmployeeId);
        if (employee.managerId !== user.employee?.id) {
          throw new ForbiddenException('Access denied: Can only view attendance for yourself or your direct reports');
        }
      }
    } else if (user.role === Role.STOCK_MANAGER || user.role === Role.SUPERVISOR) {
      // Stock Managers and Supervisors can only access their own attendance
      if (targetEmployeeId !== user.employee?.id) {
        throw new ForbiddenException('Access denied: Can only view your own attendance');
      }
    }

    if (startDate && endDate) {
      return this.attendanceService.getAttendanceList(
        targetEmployeeId,
        normalizeDateForDatabase(startDate),
        normalizeDateForDatabase(endDate),
      );
    }

    return this.attendanceService.getTodayAttendance(targetEmployeeId);
  }

  @Post('clock-in')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.STOCK_MANAGER, Role.SUPERVISOR, Role.OWNER)
  @UseGuards(RolesGuard)
  async clockIn(@CurrentUser() user: any, @Body() clockInDto: ClockInDto) {
    const employeeId = user.employee?.id;
    if (!employeeId) {
      throw new Error('Employee not found');
    }
    return this.attendanceService.clockIn(
      employeeId,
      user.role,
      clockInDto.notes,
      clockInDto.latitude,
      clockInDto.longitude,
    );
  }

  @Post('clock-out')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.STOCK_MANAGER, Role.SUPERVISOR, Role.OWNER)
  @UseGuards(RolesGuard)
  async clockOut(@CurrentUser() user: any, @Body() clockOutDto: ClockOutDto) {
    const employeeId = user.employee?.id;
    if (!employeeId) {
      throw new Error('Employee not found');
    }
    return this.attendanceService.clockOut(
      employeeId,
      user.role,
      clockOutDto.notes,
      clockOutDto.latitude,
      clockOutDto.longitude,
    );
  }

  @Get('adjustments')
  async getAdjustments(
    @CurrentUser() user: any,
    @Query('employeeId') employeeId?: string,
  ) {
    const targetEmployeeId = employeeId || user.employee?.id;
    if (!targetEmployeeId) {
      throw new Error('Employee not found');
    }
    return this.attendanceService.getAdjustments(targetEmployeeId, user);
  }

  @Post('adjustments')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.STOCK_MANAGER, Role.SUPERVISOR)
  @UseGuards(RolesGuard)
  async requestAdjustment(
    @CurrentUser() user: any,
    @Body() createAdjustmentDto: CreateAttendanceAdjustmentDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const employeeId = user.employee?.id;
    if (!employeeId) {
      throw new Error('Employee not found');
    }
    return this.attendanceService.requestAdjustment(
      employeeId,
      user.id,
      user,
      createAdjustmentDto,
      ipAddress,
      userAgent,
    );
  }

  @Put('adjustments/:id/approve')
  @Roles(Role.MANAGER, Role.OWNER)
  @UseGuards(RolesGuard)
  async approveAdjustment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.attendanceService.approveAdjustment(id, user.id, user, ipAddress, userAgent);
  }

  @Put('adjustments/:id/reject')
  @Roles(Role.MANAGER, Role.OWNER)
  @UseGuards(RolesGuard)
  async rejectAdjustment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { reason: string },
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.attendanceService.rejectAdjustment(id, user.id, body.reason, user, ipAddress, userAgent);
  }

  @Put('adjustments/:id')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.STOCK_MANAGER, Role.SUPERVISOR)
  @UseGuards(RolesGuard)
  async updateAdjustment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateAttendanceAdjustmentDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const employeeId = user.employee?.id;
    if (!employeeId) {
      throw new Error('Employee not found');
    }
    return this.attendanceService.updateAdjustment(id, employeeId, user.id, updateDto, ipAddress, userAgent);
  }

  @Delete('adjustments/:id')
  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.STOCK_MANAGER, Role.SUPERVISOR)
  @UseGuards(RolesGuard)
  async deleteAdjustment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const employeeId = user.employee?.id;
    if (!employeeId) {
      throw new Error('Employee not found');
    }
    return this.attendanceService.deleteAdjustment(id, employeeId, user.id, ipAddress, userAgent);
  }
}

