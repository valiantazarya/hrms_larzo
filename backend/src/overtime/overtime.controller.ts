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
import { OvertimeService } from './overtime.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../types/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IpAddress } from '../common/decorators/ip-address.decorator';
import { UserAgent } from '../common/decorators/user-agent.decorator';
import { CreateOvertimeRequestDto } from './dto/create-overtime-request.dto';
import { UpdateOvertimeRequestDto } from './dto/update-overtime-request.dto';

@Controller('overtime')
@UseGuards(JwtAuthGuard)
export class OvertimeController {
  constructor(private readonly overtimeService: OvertimeService) {}

  @Get('requests')
  async getOvertimeRequests(
    @CurrentUser() user: any,
    @Query('employeeId') employeeId?: string,
  ) {
    const targetEmployeeId = employeeId || user.employee?.id;
    if (!targetEmployeeId) {
      throw new BadRequestException('Employee not found');
    }
    return this.overtimeService.getOvertimeRequests(targetEmployeeId, user);
  }

  @Post('requests')
  @Roles(Role.EMPLOYEE)
  @UseGuards(RolesGuard)
  async createOvertimeRequest(
    @CurrentUser() user: any,
    @Body() createOvertimeRequestDto: CreateOvertimeRequestDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const employeeId = user.employee?.id;
    if (!employeeId) {
      throw new BadRequestException('Employee not found');
    }
    return this.overtimeService.createOvertimeRequest(employeeId, createOvertimeRequestDto, user.id, ipAddress, userAgent);
  }

  @Put('requests/:id/approve')
  @Roles(Role.MANAGER, Role.OWNER)
  @UseGuards(RolesGuard)
  async approveOvertimeRequest(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.overtimeService.approveOvertimeRequest(id, user.id, user, ipAddress, userAgent);
  }

  @Put('requests/:id/reject')
  @Roles(Role.MANAGER, Role.OWNER)
  @UseGuards(RolesGuard)
  async rejectOvertimeRequest(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { reason: string },
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.overtimeService.rejectOvertimeRequest(id, user.id, body.reason, user, ipAddress, userAgent);
  }

  @Put('requests/:id')
  @Roles(Role.EMPLOYEE)
  @UseGuards(RolesGuard)
  async updateOvertimeRequest(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateDto: UpdateOvertimeRequestDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const employeeId = user.employee?.id;
    if (!employeeId) {
      throw new BadRequestException('Employee not found');
    }
    return this.overtimeService.updateOvertimeRequest(id, employeeId, updateDto, user.id, ipAddress, userAgent);
  }

  @Delete('requests/:id')
  @Roles(Role.EMPLOYEE)
  @UseGuards(RolesGuard)
  async deleteOvertimeRequest(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const employeeId = user.employee?.id;
    if (!employeeId) {
      throw new BadRequestException('Employee not found');
    }
    return this.overtimeService.deleteOvertimeRequest(id, employeeId, user.id, ipAddress, userAgent);
  }
}

