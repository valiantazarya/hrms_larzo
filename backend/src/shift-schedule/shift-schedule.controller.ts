import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ShiftScheduleService } from './shift-schedule.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../types/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateShiftScheduleDto } from './dto/create-shift-schedule.dto';
import { UpdateShiftScheduleDto } from './dto/update-shift-schedule.dto';

@Controller('shift-schedules')
@UseGuards(JwtAuthGuard)
export class ShiftScheduleController {
  constructor(
    private readonly shiftScheduleService: ShiftScheduleService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.STOCK_MANAGER)
  @UseGuards(RolesGuard)
  async create(
    @CurrentUser() user: any,
    @Body() createDto: CreateShiftScheduleDto,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    
    // Managers can only create schedules for their direct reports
    if (user.role === Role.MANAGER) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: createDto.employeeId },
      });
      
      if (!employee || employee.managerId !== user.employee?.id) {
        throw new ForbiddenException('Can only create schedules for direct reports');
      }
    }
    
    // Stock Managers can only create schedules for themselves
    if (user.role === Role.STOCK_MANAGER) {
      if (createDto.employeeId !== user.employee?.id) {
        throw new ForbiddenException('Can only create schedules for yourself');
      }
    }
    
    return this.shiftScheduleService.create(companyId, user.id, createDto);
  }

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE, Role.SUPERVISOR, Role.STOCK_MANAGER)
  @UseGuards(RolesGuard)
  async findAll(
    @CurrentUser() user: any,
    @Query('employeeId') employeeId?: string,
    @Query('weekStartDate') weekStartDate?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    
    // Employees and Supervisors can only see their own schedules
    if (user.role === Role.EMPLOYEE || user.role === Role.SUPERVISOR) {
      employeeId = user.employee?.id;
    }
    
    // Stock Managers can only see their own schedules (they don't have direct reports)
    if (user.role === Role.STOCK_MANAGER) {
      employeeId = user.employee?.id;
    }
    
    // Managers can see their own and direct reports' schedules
    if (user.role === Role.MANAGER && employeeId) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
      });
      
      if (employee && employee.managerId !== user.employee?.id && employeeId !== user.employee?.id) {
        throw new ForbiddenException('Can only view schedules for yourself or direct reports');
      }
    }
    
    return this.shiftScheduleService.findAll(companyId, employeeId, weekStartDate, startDate, endDate);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE, Role.SUPERVISOR, Role.STOCK_MANAGER)
  @UseGuards(RolesGuard)
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    const schedule = await this.shiftScheduleService.findOne(id, companyId);
    
    // Employees, Supervisors, and Stock Managers can only see their own schedules
    if ((user.role === Role.EMPLOYEE || user.role === Role.SUPERVISOR || user.role === Role.STOCK_MANAGER) 
        && schedule.employeeId !== user.employee?.id) {
      throw new ForbiddenException('Access denied');
    }
    
    return schedule;
  }

  @Put(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.STOCK_MANAGER)
  @UseGuards(RolesGuard)
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateShiftScheduleDto,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    const schedule = await this.shiftScheduleService.findOne(id, companyId);
    
    // Managers can only update schedules for their direct reports
    if (user.role === Role.MANAGER) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: schedule.employeeId },
      });
      
      if (!employee || employee.managerId !== user.employee?.id) {
        throw new ForbiddenException('Can only update schedules for direct reports');
      }
    }
    
    // Stock Managers can only update their own schedules
    if (user.role === Role.STOCK_MANAGER && schedule.employeeId !== user.employee?.id) {
      throw new ForbiddenException('Can only update your own schedules');
    }
    
    return this.shiftScheduleService.update(id, companyId, user.id, updateDto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.STOCK_MANAGER)
  @UseGuards(RolesGuard)
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    const schedule = await this.shiftScheduleService.findOne(id, companyId);
    
    // Managers can only delete schedules for their direct reports
    if (user.role === Role.MANAGER) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: schedule.employeeId },
      });
      
      if (!employee || employee.managerId !== user.employee?.id) {
        throw new ForbiddenException('Can only delete schedules for direct reports');
      }
    }
    
    // Stock Managers can only delete their own schedules
    if (user.role === Role.STOCK_MANAGER && schedule.employeeId !== user.employee?.id) {
      throw new ForbiddenException('Can only delete your own schedules');
    }
    
    return this.shiftScheduleService.remove(id, companyId);
  }
}
