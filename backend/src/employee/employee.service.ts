import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role, EmployeeStatus } from '../types/enums';
import * as bcrypt from 'bcrypt';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateEmploymentDto } from './dto/create-employment.dto';
import { logAuditEvent } from '../common/utils/audit-helper';

@Injectable()
export class EmployeeService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(user: any, companyId: string) {
    // Owner: see all, Manager: see direct reports, Stock Manager: see all except managers and owners, Employee: see self
    if (user.role === Role.OWNER) {
      return this.prisma.employee.findMany({
        where: { companyId },
        include: {
          user: {
            select: { id: true, email: true, role: true, isActive: true },
          },
          employment: true,
          manager: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { employeeCode: 'asc' },
      });
    }

    if (user.role === Role.MANAGER) {
      // Get direct reports
      return this.prisma.employee.findMany({
        where: {
          companyId,
          managerId: user.employee?.id,
        },
        include: {
          user: {
            select: { id: true, email: true, role: true, isActive: true },
          },
          employment: true,
        },
        orderBy: { employeeCode: 'asc' },
      });
    }

    if (user.role === Role.STOCK_MANAGER) {
      // Stock Manager: see all employees except managers and owners
      // Include employees that either don't have a user OR have a user with role not MANAGER/OWNER
      return this.prisma.employee.findMany({
        where: {
          companyId,
          OR: [
            { userId: null },
            {
              user: {
                role: {
                  notIn: [Role.MANAGER, Role.OWNER],
                },
              },
            },
          ],
        },
        include: {
          user: {
            select: { id: true, email: true, role: true, isActive: true },
          },
          employment: true,
          manager: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { employeeCode: 'asc' },
      });
    }

    // Employee: only self
    if (user.employee?.id) {
      return this.prisma.employee.findMany({
        where: { id: user.employee.id },
        include: {
          user: {
            select: { id: true, email: true, role: true, isActive: true },
          },
          employment: true,
          manager: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }

    return [];
  }

  async findOne(id: string, user: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, role: true, isActive: true },
        },
        employment: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
        company: {
          select: { id: true, name: true },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check permissions
    if (user.role === Role.EMPLOYEE && employee.id !== user.employee?.id) {
      throw new ForbiddenException('Access denied');
    }

    if (user.role === Role.MANAGER) {
      if (employee.managerId !== user.employee?.id && employee.id !== user.employee?.id) {
        throw new ForbiddenException('Access denied');
      }
    }

    return employee;
  }

  async create(
    companyId: string,
    createEmployeeDto: CreateEmployeeDto,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Check if employee code exists
    const existing = await this.prisma.employee.findUnique({
      where: {
        companyId_employeeCode: {
          companyId,
          employeeCode: createEmployeeDto.employeeCode,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Employee code already exists');
    }

    // Check if email exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createEmployeeDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    // Create user
    const passwordHash = await bcrypt.hash(createEmployeeDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: createEmployeeDto.email,
        passwordHash,
        role: createEmployeeDto.role,
        isActive: true,
      },
    });

    // If role is MANAGER, clear managerId (managers can't have managers)
    // Stock managers can have managers
    const managerId = createEmployeeDto.role === Role.MANAGER ? null : createEmployeeDto.managerId;

    // Create employee
    const employee = await this.prisma.employee.create({
      data: {
        userId: user.id,
        division: createEmployeeDto.division,
        companyId,
        employeeCode: createEmployeeDto.employeeCode,
        firstName: createEmployeeDto.firstName,
        lastName: createEmployeeDto.lastName,
        nik: createEmployeeDto.nik,
        phone: createEmployeeDto.phone,
        address: createEmployeeDto.address,
        joinDate: new Date(createEmployeeDto.joinDate),
        status: createEmployeeDto.status || EmployeeStatus.ACTIVE,
        managerId,
      } as any,
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'CREATE',
      entityType: 'Employee',
      entityId: employee.id,
      actorId,
      after: {
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: createEmployeeDto.role,
        status: employee.status,
      },
      ipAddress,
      userAgent,
    });

    return employee;
  }

  async update(
    id: string,
    user: any,
    updateEmployeeDto: UpdateEmployeeDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const employee = await this.findOne(id, user);

    // Store before state for audit
    const before = {
      firstName: employee.firstName,
      lastName: employee.lastName,
      nik: employee.nik,
      phone: employee.phone,
      address: employee.address,
      division: (employee as any).division,
      employeeCode: employee.employeeCode,
      joinDate: employee.joinDate,
      status: employee.status,
      role: employee.user?.role,
      email: employee.user?.email,
      managerId: employee.managerId,
    };

    // Check permissions
    if (user.role === Role.EMPLOYEE && employee.id !== user.employee?.id) {
      throw new ForbiddenException('Can only update your own profile');
    }

    if (user.role === Role.MANAGER) {
      if (employee.managerId !== user.employee?.id && employee.id !== user.employee?.id) {
        throw new ForbiddenException('Can only update your direct reports');
      }
    }

    // Owner can update any employee data including email, employeeCode, and joinDate
    // No restrictions for owner when updating other employees

    // Only owner can change role
    if (updateEmployeeDto.role && user.role !== Role.OWNER) {
      throw new ForbiddenException('Only owner can change employee role');
    }

    // Prevent changing owner role
    if (updateEmployeeDto.role && employee.user?.role === Role.OWNER && updateEmployeeDto.role !== Role.OWNER) {
      throw new BadRequestException('Cannot change owner role');
    }

    // Extract role, email, employeeCode, and joinDate from DTO if present
    const { role, email, employeeCode, joinDate, ...employeeData } = updateEmployeeDto;

    // Only owner can update employeeCode and joinDate
    if ((employeeCode !== undefined || joinDate !== undefined) && user.role !== Role.OWNER) {
      throw new ForbiddenException('Only owner can update employee code and join date');
    }

    // Validate employeeCode if being changed (must be unique within company)
    if (employeeCode !== undefined) {
      const existingEmployee = await this.prisma.employee.findFirst({
        where: {
          companyId: employee.companyId,
          employeeCode,
          id: { not: id },
        },
      });

      if (existingEmployee) {
        throw new BadRequestException('Employee code already exists in this company');
      }
      (employeeData as any).employeeCode = employeeCode;
    }

    // Handle joinDate if being changed
    if (joinDate !== undefined) {
      (employeeData as any).joinDate = new Date(joinDate);
    }

    // Validate email if being changed
    if (email && employee.userId) {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Check if email already exists (excluding current user)
      const existingUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser && existingUser.id !== employee.userId) {
        throw new BadRequestException('Email already exists');
      }
    }

    // If role is being changed to MANAGER, clear managerId (managers can't have managers)
    // Stock managers can have managers, so we don't clear it for them
    if (role === Role.MANAGER) {
      employeeData.managerId = null;
    }

    // Update employee
    const updatedEmployee = await this.prisma.employee.update({
      where: { id },
      data: {
        ...employeeData,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
        employment: true,
      },
    });

    // Update user email and/or role if provided
    let finalEmployee = updatedEmployee;
    if ((email || role) && employee.userId) {
      const userUpdateData: any = {};
      if (email) {
        userUpdateData.email = email.trim().toLowerCase();
      }
      if (role) {
        userUpdateData.role = role;
      }

      await this.prisma.user.update({
        where: { id: employee.userId },
        data: userUpdateData,
      });
      
      // Reload employee to get updated email and role
      finalEmployee = await this.prisma.employee.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true, email: true, role: true },
          },
          employment: true,
        },
      });
    }

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'UPDATE',
      entityType: 'Employee',
      entityId: id,
      actorId: user.id,
      before,
      after: {
        firstName: finalEmployee.firstName,
        lastName: finalEmployee.lastName,
        nik: finalEmployee.nik,
        phone: finalEmployee.phone,
        address: finalEmployee.address,
        division: (finalEmployee as any).division,
        employeeCode: finalEmployee.employeeCode,
        joinDate: finalEmployee.joinDate,
        status: finalEmployee.status,
        role: finalEmployee.user?.role,
        email: finalEmployee.user?.email,
        managerId: finalEmployee.managerId,
      },
      ipAddress,
      userAgent,
    });

    return finalEmployee;
  }

  async createOrUpdateEmployment(
    employeeId: string,
    user: any,
    createEmploymentDto: CreateEmploymentDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Check permissions - only owner can set employment
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Only owner can manage employment details');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { employment: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const before = employee.employment ? {
      type: employee.employment.type,
      baseSalary: employee.employment.baseSalary,
      hourlyRate: employee.employment.hourlyRate,
      dailyRate: employee.employment.dailyRate,
      hasBPJS: employee.employment.hasBPJS,
      transportBonus: employee.employment.transportBonus,
      lunchBonus: employee.employment.lunchBonus,
      thr: employee.employment.thr,
    } : null;

    const employment = await this.prisma.employment.upsert({
      where: { employeeId },
      update: {
        type: createEmploymentDto.type ?? undefined,
        baseSalary: createEmploymentDto.baseSalary,
        hourlyRate: createEmploymentDto.hourlyRate,
        dailyRate: createEmploymentDto.dailyRate,
        bankName: createEmploymentDto.bankName,
        bankAccount: createEmploymentDto.bankAccount,
        bankAccountName: createEmploymentDto.bankAccountName,
        npwp: createEmploymentDto.npwp,
        bpjsKesehatan: createEmploymentDto.bpjsKesehatan,
        bpjsKetenagakerjaan: createEmploymentDto.bpjsKetenagakerjaan,
        hasBPJS: createEmploymentDto.hasBPJS ?? false,
        transportBonus: createEmploymentDto.transportBonus,
        lunchBonus: createEmploymentDto.lunchBonus,
        thr: createEmploymentDto.thr,
        updatedAt: new Date(),
      },
      create: {
        employeeId,
        type: createEmploymentDto.type ?? null, // Optional - can be null
        baseSalary: createEmploymentDto.baseSalary,
        hourlyRate: createEmploymentDto.hourlyRate,
        dailyRate: createEmploymentDto.dailyRate,
        bankName: createEmploymentDto.bankName,
        bankAccount: createEmploymentDto.bankAccount,
        bankAccountName: createEmploymentDto.bankAccountName,
        npwp: createEmploymentDto.npwp,
        bpjsKesehatan: createEmploymentDto.bpjsKesehatan,
        bpjsKetenagakerjaan: createEmploymentDto.bpjsKetenagakerjaan,
        hasBPJS: createEmploymentDto.hasBPJS ?? false,
        transportBonus: createEmploymentDto.transportBonus,
        lunchBonus: createEmploymentDto.lunchBonus,
        thr: createEmploymentDto.thr,
      },
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: before ? 'UPDATE' : 'CREATE',
      entityType: 'Employment',
      entityId: employment.id,
      actorId: user.id,
      before,
      after: {
        type: employment.type,
        baseSalary: employment.baseSalary,
        hourlyRate: employment.hourlyRate,
        dailyRate: employment.dailyRate,
        hasBPJS: employment.hasBPJS,
        transportBonus: employment.transportBonus,
        lunchBonus: employment.lunchBonus,
        thr: employment.thr,
      },
      ipAddress,
      userAgent,
    });

    return employment;
  }

  async getDirectReports(managerId: string) {
    return this.prisma.employee.findMany({
      where: { managerId },
      include: {
        user: {
          select: { id: true, email: true, role: true },
        },
        employment: true,
      },
      orderBy: { employeeCode: 'asc' },
    });
  }

  async getDocuments(employeeId: string, user: any) {
    const employee = await this.findOne(employeeId, user);
    return this.prisma.document.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDocument(
    employeeId: string,
    user: any,
    fileUrl: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
    type: string,
  ) {
    const employee = await this.findOne(employeeId, user);

    // Check permissions
    if (user.role === Role.EMPLOYEE && employee.id !== user.employee?.id) {
      throw new ForbiddenException('Can only upload documents for yourself');
    }

    // Get latest version
    const latest = await this.prisma.document.findFirst({
      where: {
        employeeId,
        type: type as any,
      },
      orderBy: { version: 'desc' },
    });

    const newVersion = latest ? latest.version + 1 : 1;

    return this.prisma.document.create({
      data: {
        employeeId,
        type: type as any,
        fileName,
        fileUrl,
        fileSize,
        mimeType,
        version: newVersion,
        uploadedBy: user.id,
      },
    });
  }

  async deleteDocument(documentId: string, user: any) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { employee: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Only owner can delete
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Only owner can delete documents');
    }

    return this.prisma.document.delete({
      where: { id: documentId },
    });
  }
}

