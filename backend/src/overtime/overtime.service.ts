import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DateTime } from 'luxon';
import { normalizeDateForDatabase } from '../common/utils/date-helper';
import { ApprovalStatus, Role, EmploymentType } from '../types/enums';
import { CreateOvertimeRequestDto } from './dto/create-overtime-request.dto';
import { UpdateOvertimeRequestDto } from './dto/update-overtime-request.dto';
import {
  calculateOvertimePay,
  determineDayType,
  OvertimePolicy,
  DayType,
} from '../common/utils/overtime-calculator';
import { Decimal } from 'decimal.js';
import { logAuditEvent } from '../common/utils/audit-helper';

@Injectable()
export class OvertimeService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async createOvertimeRequest(
    employeeId: string,
    createOvertimeRequestDto: CreateOvertimeRequestDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const date = DateTime.fromISO(createOvertimeRequestDto.date).setZone('Asia/Jakarta');
    const today = DateTime.now().setZone('Asia/Jakarta');

    // Can't request overtime for future dates beyond today
    if (date > today.endOf('day')) {
      throw new BadRequestException('Cannot request overtime for future dates');
    }

    // Check if already has overtime request for this date
    const dateNormalized = normalizeDateForDatabase(date.toISODate() || '');
    const existing = await this.prisma.overtimeRequest.findFirst({
      where: {
        employeeId,
        date: dateNormalized,
        status: {
          in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED],
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Overtime request already exists for this date');
    }

    // Get employee and employment
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employment: true,
        company: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (!employee.employment) {
      throw new BadRequestException(
        'Employment information not found. Please contact administrator to set up your employment details.',
      );
    }

    // Get overtime policy
    const policy = await this.prisma.policy.findFirst({
      where: {
        companyId: employee.companyId,
        type: 'OVERTIME_POLICY',
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (!policy) {
      throw new NotFoundException('Overtime policy not found');
    }

    const overtimePolicy = JSON.parse(policy.config) as OvertimePolicy;

    // Check if holiday
    const isHoliday = await this.isHoliday(date.toJSDate(), employee.companyId);

    // Calculate start and end times
    const startTime = date.set({ hour: 17, minute: 0 }); // Default 5 PM
    const endTime = startTime.plus({ minutes: createOvertimeRequestDto.duration });

    // Calculate overtime pay
    const overtimePay = calculateOvertimePay(
      {
        id: '',
        employeeId,
        date: date.toJSDate(),
        startTime: startTime.toJSDate(),
        endTime: endTime.toJSDate(),
        duration: createOvertimeRequestDto.duration,
        reason: createOvertimeRequestDto.reason,
        compensationType: 'PAYOUT',
        status: ApprovalStatus.PENDING,
        requestedAt: new Date(),
        approvedBy: null,
        approvedAt: null,
        rejectedReason: null,
        calculatedAmount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        type: employee.employment.type as EmploymentType,
        baseSalary: employee.employment.baseSalary ? new Decimal(employee.employment.baseSalary) : null,
        hourlyRate: employee.employment.hourlyRate ? new Decimal(employee.employment.hourlyRate) : null,
        dailyRate: employee.employment.dailyRate ? new Decimal(employee.employment.dailyRate) : null,
      },
      overtimePolicy,
      isHoliday,
    );

    const overtimeRequest = await this.prisma.overtimeRequest.create({
      data: {
        employeeId,
        date: dateNormalized,
        startTime: startTime.toJSDate(),
        endTime: endTime.toJSDate(),
        duration: createOvertimeRequestDto.duration,
        reason: createOvertimeRequestDto.reason,
        calculatedAmount: overtimePay.toNumber(),
        status: ApprovalStatus.PENDING,
      },
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'CREATE',
      entityType: 'OvertimeRequest',
      entityId: overtimeRequest.id,
      actorId: userId,
      after: {
        date: overtimeRequest.date,
        duration: overtimeRequest.duration,
        reason: overtimeRequest.reason,
        calculatedAmount: overtimeRequest.calculatedAmount,
        status: overtimeRequest.status,
      },
      ipAddress,
      userAgent,
    });

    return overtimeRequest;
  }

  async getOvertimeRequests(employeeId: string, user: any) {
    // Owner: all, Manager: direct reports, Employee: own
    if (user.role === Role.OWNER) {
      const requests = await this.prisma.overtimeRequest.findMany({
        where: { employeeId },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
          },
        },
        orderBy: { requestedAt: 'desc' },
      });

      // Add approver information
      return Promise.all(
        requests.map(async (req) => {
          if (req.approvedBy) {
            const approver = await this.prisma.user.findUnique({
              where: { id: req.approvedBy },
              include: {
                employee: {
                  select: { id: true, firstName: true, lastName: true, employeeCode: true },
                },
              },
            });
            return {
              ...req,
              approver: approver
                ? {
                    id: approver.id,
                    email: approver.email,
                    role: approver.role,
                    name: approver.employee
                      ? `${approver.employee.firstName} ${approver.employee.lastName}`
                      : approver.email,
                  }
                : null,
            };
          }
          return { ...req, approver: null };
        }),
      );
    }

    if (user.role === Role.MANAGER) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
      });

      if (employee.managerId !== user.employee?.id) {
        throw new ForbiddenException('Access denied');
      }

      const requests = await this.prisma.overtimeRequest.findMany({
        where: { employeeId },
        orderBy: { requestedAt: 'desc' },
      });

      // Add approver information
      return Promise.all(
        requests.map(async (req) => {
          if (req.approvedBy) {
            const approver = await this.prisma.user.findUnique({
              where: { id: req.approvedBy },
              include: {
                employee: {
                  select: { id: true, firstName: true, lastName: true, employeeCode: true },
                },
              },
            });
            return {
              ...req,
              approver: approver
                ? {
                    id: approver.id,
                    email: approver.email,
                    role: approver.role,
                    name: approver.employee
                      ? `${approver.employee.firstName} ${approver.employee.lastName}`
                      : approver.email,
                  }
                : null,
            };
          }
          return { ...req, approver: null };
        }),
      );
    }

    // Employee: own only
    if (employeeId !== user.employee?.id) {
      throw new ForbiddenException('Access denied');
    }

    const requests = await this.prisma.overtimeRequest.findMany({
      where: { employeeId },
      orderBy: { requestedAt: 'desc' },
    });

    // Add approver information
    return Promise.all(
      requests.map(async (req) => {
        if (req.approvedBy) {
          const approver = await this.prisma.user.findUnique({
            where: { id: req.approvedBy },
            include: {
              employee: {
                select: { id: true, firstName: true, lastName: true, employeeCode: true },
              },
            },
          });
          return {
            ...req,
            approver: approver
              ? {
                  id: approver.id,
                  email: approver.email,
                  role: approver.role,
                  name: approver.employee
                    ? `${approver.employee.firstName} ${approver.employee.lastName}`
                    : approver.email,
                }
              : null,
          };
        }
        return { ...req, approver: null };
      }),
    );
  }

  async approveOvertimeRequest(
    requestId: string,
    userId: string,
    user: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const request = await this.prisma.overtimeRequest.findUnique({
      where: { id: requestId },
      include: {
        employee: {
          include: {
            employment: true,
            company: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Overtime request not found');
    }

    // Check permissions
    if (user.role === Role.MANAGER) {
      if (request.employee.managerId !== user.employee?.id) {
        throw new ForbiddenException('Can only approve overtime for direct reports');
      }
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Overtime request already processed');
    }

    // Recalculate pay (in case policy changed)
    const policy = await this.prisma.policy.findFirst({
      where: {
        companyId: request.employee.companyId,
        type: 'OVERTIME_POLICY',
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (policy) {
      const overtimePolicy = JSON.parse(policy.config) as OvertimePolicy;
      const date = DateTime.fromJSDate(request.date);
      const isHoliday = await this.isHoliday(request.date, request.employee.companyId);

      const overtimePay = calculateOvertimePay(
        request,
        {
          type: request.employee.employment.type as EmploymentType,
          baseSalary: request.employee.employment.baseSalary
            ? new Decimal(request.employee.employment.baseSalary)
            : null,
          hourlyRate: request.employee.employment.hourlyRate
            ? new Decimal(request.employee.employment.hourlyRate)
            : null,
          dailyRate: request.employee.employment.dailyRate
            ? new Decimal(request.employee.employment.dailyRate)
            : null,
        },
        overtimePolicy,
        isHoliday,
      );

      const approvedRequest = await this.prisma.overtimeRequest.update({
        where: { id: requestId },
        data: {
          status: ApprovalStatus.APPROVED,
          approvedBy: userId,
          approvedAt: new Date(),
          calculatedAmount: overtimePay.toNumber(),
        },
      });

      // Log audit event
      await logAuditEvent(this.auditService, {
        action: 'APPROVE',
        entityType: 'OvertimeRequest',
        entityId: requestId,
        actorId: userId,
        before: {
          status: request.status,
        },
        after: {
          status: ApprovalStatus.APPROVED,
          approvedBy: userId,
          approvedAt: new Date(),
          calculatedAmount: approvedRequest.calculatedAmount,
        },
        ipAddress,
        userAgent,
      });

      return approvedRequest;
    }

    const approvedRequest = await this.prisma.overtimeRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'APPROVE',
      entityType: 'OvertimeRequest',
      entityId: requestId,
      actorId: userId,
      before: {
        status: request.status,
      },
      after: {
        status: ApprovalStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date(),
      },
      ipAddress,
      userAgent,
    });

    return approvedRequest;
  }

  async rejectOvertimeRequest(
    requestId: string,
    userId: string,
    reason: string,
    user: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const request = await this.prisma.overtimeRequest.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });

    if (!request) {
      throw new NotFoundException('Overtime request not found');
    }

    // Check permissions
    if (user.role === Role.MANAGER) {
      if (request.employee.managerId !== user.employee?.id) {
        throw new ForbiddenException('Can only reject overtime for direct reports');
      }
    }

    const before = {
      status: request.status,
    };

    const rejectedRequest = await this.prisma.overtimeRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.REJECTED,
        approvedBy: userId,
        approvedAt: new Date(),
        rejectedReason: reason,
      },
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'REJECT',
      entityType: 'OvertimeRequest',
      entityId: requestId,
      actorId: userId,
      before,
      after: {
        status: ApprovalStatus.REJECTED,
        rejectedReason: reason,
      },
      reason,
      ipAddress,
      userAgent,
    });

    return rejectedRequest;
  }

  async updateOvertimeRequest(
    requestId: string,
    employeeId: string,
    updateDto: UpdateOvertimeRequestDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const request = await this.prisma.overtimeRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Overtime request not found');
    }

    if (request.employeeId !== employeeId) {
      throw new ForbiddenException('You can only update your own overtime requests');
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Can only update pending overtime requests');
    }

    // Get employee and employment for recalculation if needed
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employment: true,
        company: true,
      },
    });

    if (!employee || !employee.employment) {
      throw new BadRequestException('Employment information not found');
    }

    // Prepare update data
    const updateData: any = {};
    let needsRecalculation = false;

    if (updateDto.date) {
      const date = DateTime.fromISO(updateDto.date).setZone('Asia/Jakarta');
      const today = DateTime.now().setZone('Asia/Jakarta');

      if (date > today.endOf('day')) {
        throw new BadRequestException('Cannot request overtime for future dates');
      }

      updateData.date = normalizeDateForDatabase(date.toISODate() || '');
      needsRecalculation = true;
    }

    if (updateDto.duration !== undefined) {
      updateData.duration = updateDto.duration;
      needsRecalculation = true;
    }

    if (updateDto.reason !== undefined) {
      updateData.reason = updateDto.reason;
    }

    // Note: 'notes' field is not stored in the database schema
    // It's only used in the DTO for frontend convenience, but not persisted

    // Recalculate overtime pay if date or duration changed
    if (needsRecalculation) {
      const date = updateDto.date
        ? DateTime.fromISO(updateDto.date).setZone('Asia/Jakarta')
        : DateTime.fromJSDate(request.date).setZone('Asia/Jakarta');
      const duration = updateDto.duration ?? request.duration;

      const policy = await this.prisma.policy.findFirst({
        where: {
          companyId: employee.companyId,
          type: 'OVERTIME_POLICY',
          isActive: true,
        },
        orderBy: { version: 'desc' },
      });

      if (!policy) {
        throw new NotFoundException('Overtime policy not found');
      }

      const overtimePolicy = JSON.parse(policy.config) as OvertimePolicy;
      const isHoliday = await this.isHoliday(date.toJSDate(), employee.companyId);
      const startTime = date.set({ hour: 17, minute: 0 });
      const endTime = startTime.plus({ minutes: duration });

      // Create a temporary OvertimeRequest object for calculation
      const tempRequest = {
        id: request.id,
        employeeId: request.employeeId,
        date: date.toJSDate(),
        startTime: startTime.toJSDate(),
        endTime: endTime.toJSDate(),
        duration: duration,
        reason: updateDto.reason ?? request.reason,
        compensationType: request.compensationType,
        status: request.status,
        requestedAt: request.requestedAt,
        approvedBy: request.approvedBy,
        approvedAt: request.approvedAt,
        rejectedReason: request.rejectedReason,
        calculatedAmount: request.calculatedAmount,
      } as any;

      const calculatedAmount = calculateOvertimePay(
        tempRequest,
        {
          type: employee.employment.type as EmploymentType,
          baseSalary: employee.employment.baseSalary
            ? new Decimal(employee.employment.baseSalary)
            : null,
          hourlyRate: employee.employment.hourlyRate
            ? new Decimal(employee.employment.hourlyRate)
            : null,
          dailyRate: employee.employment.dailyRate
            ? new Decimal(employee.employment.dailyRate)
            : null,
        },
        overtimePolicy,
        isHoliday,
      );

      updateData.startTime = startTime.toJSDate();
      updateData.endTime = endTime.toJSDate();
      updateData.calculatedAmount = calculatedAmount;
    }

    const before = {
      date: request.date,
      duration: request.duration,
      reason: request.reason,
      calculatedAmount: request.calculatedAmount,
    };

    const updatedRequest = await this.prisma.overtimeRequest.update({
      where: { id: requestId },
      data: updateData,
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'UPDATE',
      entityType: 'OvertimeRequest',
      entityId: requestId,
      actorId: userId,
      before,
      after: {
        date: updatedRequest.date,
        duration: updatedRequest.duration,
        reason: updatedRequest.reason,
        calculatedAmount: updatedRequest.calculatedAmount,
      },
      ipAddress,
      userAgent,
    });

    return updatedRequest;
  }

  async deleteOvertimeRequest(
    requestId: string,
    employeeId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const request = await this.prisma.overtimeRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Overtime request not found');
    }

    if (request.employeeId !== employeeId) {
      throw new ForbiddenException('You can only delete your own overtime requests');
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Can only delete pending overtime requests');
    }

    const before = {
      status: request.status,
      date: request.date,
      duration: request.duration,
      reason: request.reason,
      calculatedAmount: request.calculatedAmount,
    };

    // Log audit event before deletion
    await logAuditEvent(this.auditService, {
      action: 'DELETE',
      entityType: 'OvertimeRequest',
      entityId: requestId,
      actorId: userId,
      before,
      ipAddress,
      userAgent,
    });

    return this.prisma.overtimeRequest.delete({
      where: { id: requestId },
    });
  }

  private async isHoliday(date: Date, companyId: string): Promise<boolean> {
    const holiday = await this.prisma.publicHoliday.findFirst({
      where: {
        companyId,
        date: normalizeDateForDatabase(date),
      },
    });

    return !!holiday;
  }
}

