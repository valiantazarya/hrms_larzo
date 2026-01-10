import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role, EmployeeStatus } from '../types/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IpAddress } from '../common/decorators/ip-address.decorator';
import { UserAgent } from '../common/decorators/user-agent.decorator';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateEmploymentDto } from './dto/create-employment.dto';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get()
  async getEmployees(@CurrentUser() user: any) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    return this.employeeService.findAll(user, companyId);
  }

  @Get(':id')
  async getEmployee(@Param('id') id: string, @CurrentUser() user: any) {
    return this.employeeService.findOne(id, user);
  }

  @Post()
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async createEmployee(
    @CurrentUser() user: any,
    @Body() createEmployeeDto: CreateEmployeeDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    return this.employeeService.create(companyId, createEmployeeDto, user.id, ipAddress, userAgent);
  }

  @Put(':id')
  async updateEmployee(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.employeeService.update(id, user, updateEmployeeDto, ipAddress, userAgent);
  }

  @Put(':id/employment')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async updateEmployment(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() createEmploymentDto: CreateEmploymentDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.employeeService.createOrUpdateEmployment(id, user, createEmploymentDto, ipAddress, userAgent);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async deleteEmployee(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    // Soft delete - update status
    return this.employeeService.update(id, user, { status: EmployeeStatus.INACTIVE }, ipAddress, userAgent);
  }

  @Get(':id/documents')
  async getDocuments(@Param('id') id: string, @CurrentUser() user: any) {
    return this.employeeService.getDocuments(id, user);
  }

  @Post(':id/documents')
  async uploadDocument(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { fileUrl: string; fileName: string; mimeType: string; fileSize: number; type: string },
  ) {
    return this.employeeService.uploadDocument(
      id,
      user,
      body.fileUrl,
      body.fileName,
      body.mimeType,
      body.fileSize,
      body.type,
    );
  }

  @Delete(':id/documents/:docId')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async deleteDocument(
    @Param('docId') docId: string,
    @CurrentUser() user: any,
  ) {
    return this.employeeService.deleteDocument(docId, user);
  }
}

