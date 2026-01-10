import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ShiftScheduleService } from '../shift-schedule/shift-schedule.service';
import { DateTime } from 'luxon';
import { getTodayDateForDatabase } from '../common/utils/date-helper';
import { AttendanceStatus, ApprovalStatus, Role } from '../types/enums';
import { calculateWorkDuration, AttendancePolicy } from '../common/utils/attendance-calculator';
import { isWithinGeofence } from '../common/utils/geofencing';
import { CreateAttendanceAdjustmentDto } from './dto/create-adjustment.dto';
import { UpdateAttendanceAdjustmentDto } from './dto/update-adjustment.dto';
import { logAuditEvent } from '../common/utils/audit-helper';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private shiftScheduleService: ShiftScheduleService,
    private auditService: AuditService,
  ) {}

  async getTodayAttendance(employeeId: string) {
    // Normalize date for database storage (UTC midnight)
    const today = getTodayDateForDatabase();
    
    return this.prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });
  }

  async getAttendanceList(employeeId: string, startDate: Date, endDate: Date) {
    return this.prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async getEmployeeById(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  async clockIn(
    employeeId: string,
    userRole: Role,
    notes?: string,
    latitude?: number,
    longitude?: number,
  ) {
    // Always use today's date (current date), not the shift schedule date
    // Normalize date for database storage (UTC midnight)
    const now = DateTime.now().setZone('Asia/Jakarta');
    const today = getTodayDateForDatabase();

    // Check if already clocked in today
    const existing = await this.prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });

    if (existing && existing.clockIn) {
      throw new BadRequestException('Already clocked in today');
    }

    // Get employee and company
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { company: true, user: { select: { role: true } } },
    });

    // Check if employee has a shift scheduled for today (except for OWNER)
    if (userRole !== Role.OWNER) {
      const hasShift = await this.shiftScheduleService.hasShiftForDate(employeeId, today);
      if (!hasShift) {
        throw new BadRequestException(
          'You do not have a shift scheduled for today. Please contact your manager to schedule a shift.',
        );
      }
    }

    // Validate geofencing if enabled
    if (employee.company.geofencingEnabled) {
      if (!latitude || !longitude) {
        throw new BadRequestException(
          'Location is required. Please enable location services and try again.',
        );
      }

      if (
        !employee.company.geofencingLatitude ||
        !employee.company.geofencingLongitude ||
        !employee.company.geofencingRadius
      ) {
        throw new BadRequestException(
          'Geofencing is enabled but not properly configured. Please contact administrator.',
        );
      }

      const isWithin = isWithinGeofence(
        latitude,
        longitude,
        Number(employee.company.geofencingLatitude),
        Number(employee.company.geofencingLongitude),
        Number(employee.company.geofencingRadius),
      );

      if (!isWithin) {
        throw new BadRequestException(
          'You are outside the designated work area. Please move to the work location to clock in.',
        );
      }
    }

    // Get attendance policy
    const policy = await this.prisma.policy.findFirst({
      where: {
        companyId: employee.companyId,
        type: 'ATTENDANCE_RULES',
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    const policyConfig = (policy ? JSON.parse(policy.config) : {}) as AttendancePolicy || {
      gracePeriodMinutes: 15,
      roundingEnabled: true,
      roundingInterval: 15,
      minimumWorkHours: 4,
    };

    // Check if clock-in is within scheduled shift
    const isWithinSchedule = await this.shiftScheduleService.isWithinSchedule(
      employeeId,
      now.toJSDate(),
    );

    // If not within schedule, allow but note it (will be treated as overtime)
    // We don't block clock-in outside schedule, just track it
    const notesWithSchedule = isWithinSchedule
      ? notes
      : `${notes ? notes + ' | ' : ''}Clock-in outside scheduled shift (overtime)`;

    return this.prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
      update: {
        clockIn: now.toJSDate(),
        clockInLatitude: latitude ? latitude : null,
        clockInLongitude: longitude ? longitude : null,
        status: AttendanceStatus.PRESENT,
        notes: notesWithSchedule,
        updatedAt: new Date(),
      },
      create: {
        employeeId,
        date: today,
        clockIn: now.toJSDate(),
        clockInLatitude: latitude ? latitude : null,
        clockInLongitude: longitude ? longitude : null,
        status: AttendanceStatus.PRESENT,
        notes: notesWithSchedule,
      },
    });
  }

  async clockOut(
    employeeId: string,
    userRole: Role,
    notes?: string,
    latitude?: number,
    longitude?: number,
  ) {
    // Always use today's date (current date), not the shift schedule date
    // Normalize date for database storage (UTC midnight)
    const now = DateTime.now().setZone('Asia/Jakarta');
    const today = getTodayDateForDatabase();

    const attendance = await this.prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });

    if (!attendance || !attendance.clockIn) {
      throw new BadRequestException('Must clock in first');
    }

    // Check if employee has a shift scheduled for today (except for OWNER)
    if (userRole !== Role.OWNER) {
      const hasShift = await this.shiftScheduleService.hasShiftForDate(employeeId, today);
      if (!hasShift) {
        throw new BadRequestException(
          'You do not have a shift scheduled for today. Please contact your manager to schedule a shift.',
        );
      }
    }

    if (attendance.clockOut) {
      throw new BadRequestException('Already clocked out today');
    }

    // Get employee and company
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { company: true },
    });

    // Validate geofencing if enabled
    if (employee.company.geofencingEnabled) {
      if (!latitude || !longitude) {
        throw new BadRequestException(
          'Location is required. Please enable location services and try again.',
        );
      }

      if (
        !employee.company.geofencingLatitude ||
        !employee.company.geofencingLongitude ||
        !employee.company.geofencingRadius
      ) {
        throw new BadRequestException(
          'Geofencing is enabled but not properly configured. Please contact administrator.',
        );
      }

      const isWithin = isWithinGeofence(
        latitude,
        longitude,
        Number(employee.company.geofencingLatitude),
        Number(employee.company.geofencingLongitude),
        Number(employee.company.geofencingRadius),
      );

      if (!isWithin) {
        throw new BadRequestException(
          'You are outside the designated work area. Please move to the work location to clock out.',
        );
      }
    }

    // Get policy and calculate work duration
    const policy = await this.prisma.policy.findFirst({
      where: {
        companyId: employee.companyId,
        type: 'ATTENDANCE_RULES',
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    const policyConfig = (policy ? JSON.parse(policy.config) : {}) as AttendancePolicy || {
      gracePeriodMinutes: 15,
      roundingEnabled: true,
      roundingInterval: 15,
      minimumWorkHours: 4,
    };

    const clockIn = DateTime.fromJSDate(attendance.clockIn);
    const clockOut = now;

    // Check if clock-out is within scheduled shift
    const isWithinSchedule = await this.shiftScheduleService.isWithinSchedule(
      employeeId,
      now.toJSDate(),
    );

    // Update notes if clock-out is outside schedule
    const notesWithSchedule = isWithinSchedule
      ? notes
      : `${notes ? notes + ' | ' : ''}Clock-out outside scheduled shift (overtime)`;

    const workDuration = calculateWorkDuration(
      clockIn,
      clockOut,
      policyConfig,
    );

    return this.prisma.attendance.update({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
      data: {
        clockOut: now.toJSDate(),
        clockOutLatitude: latitude ? latitude : null,
        clockOutLongitude: longitude ? longitude : null,
        workDuration,
        notes: notesWithSchedule || attendance.notes,
        updatedAt: new Date(),
      },
    });
  }


  async requestAdjustment(
    employeeId: string,
    userId: string,
    user: any,
    createAdjustmentDto: CreateAttendanceAdjustmentDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: createAdjustmentDto.attendanceId },
      include: { employee: true },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance not found');
    }

    // Check permissions: Employee can only request for themselves
    // Manager can request for themselves or their direct reports
    if (user.role === Role.EMPLOYEE || user.role === Role.SUPERVISOR || user.role === Role.STOCK_MANAGER) {
      // Employees, Supervisors, and Stock Managers can only request adjustments for their own attendance
      if (attendance.employeeId !== employeeId) {
        throw new ForbiddenException('Can only request adjustments for your own attendance');
      }
    } else if (user.role === Role.MANAGER) {
      // Manager can request for themselves or their direct reports
      if (attendance.employeeId !== employeeId && attendance.employee.managerId !== employeeId) {
        throw new ForbiddenException('Can only request adjustments for yourself or your direct reports');
      }
    }

    // Check if adjustment already exists for this attendance
    const existingAdjustment = await this.prisma.attendanceAdjustment.findUnique({
      where: { attendanceId: createAdjustmentDto.attendanceId },
    });

    if (existingAdjustment) {
      // If there's a pending or approved adjustment, don't allow creating a new one
      if (
        existingAdjustment.status === ApprovalStatus.PENDING ||
        existingAdjustment.status === ApprovalStatus.APPROVED
      ) {
        throw new BadRequestException(
          'An adjustment request already exists for this attendance record',
        );
      }

      // If it's rejected, update it to pending with new data
      if (existingAdjustment.status === ApprovalStatus.REJECTED) {
        // Note: requestedAt will be set automatically by Prisma's @default(now())
        // Once Prisma client is regenerated, we can explicitly set: requestedAt: new Date()
        return this.prisma.attendanceAdjustment.update({
          where: { id: existingAdjustment.id },
          data: {
            employeeId: attendance.employeeId, // Ensure employeeId matches attendance owner
            requestedBy: userId,
            clockIn: createAdjustmentDto.clockIn ? new Date(createAdjustmentDto.clockIn) : null,
            clockOut: createAdjustmentDto.clockOut ? new Date(createAdjustmentDto.clockOut) : null,
            reason: createAdjustmentDto.reason,
            status: ApprovalStatus.PENDING,
            rejectedReason: null, // Clear rejection reason
          },
        });
      }
    }

    // Create new adjustment
    // Note: requestedAt will be set automatically by Prisma's @default(now())
    // Use the attendance's employeeId (not the requester's employeeId) for the adjustment
    const adjustment = await this.prisma.attendanceAdjustment.create({
      data: {
        employeeId: attendance.employeeId, // Use the attendance owner's employeeId
        attendanceId: createAdjustmentDto.attendanceId,
        requestedBy: userId,
        clockIn: createAdjustmentDto.clockIn ? new Date(createAdjustmentDto.clockIn) : null,
        clockOut: createAdjustmentDto.clockOut ? new Date(createAdjustmentDto.clockOut) : null,
        reason: createAdjustmentDto.reason,
        status: ApprovalStatus.PENDING,
      },
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'CREATE',
      entityType: 'AttendanceAdjustment',
      entityId: adjustment.id,
      actorId: userId,
      after: {
        attendanceId: adjustment.attendanceId,
        clockIn: adjustment.clockIn,
        clockOut: adjustment.clockOut,
        reason: adjustment.reason,
        status: adjustment.status,
      },
      reason: createAdjustmentDto.reason,
      ipAddress,
      userAgent,
    });

    return adjustment;
  }

  async getAdjustments(employeeId: string, user: any) {
    // Owner: all, Manager: direct reports, Employee: own
    if (user.role === Role.OWNER) {
      const adjustments = await this.prisma.attendanceAdjustment.findMany({
        where: { employeeId },
        include: {
          attendance: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Add approver and requester information
      return Promise.all(
        adjustments.map(async (adj) => {
          const [approver, requester] = await Promise.all([
            adj.approvedBy
              ? this.prisma.user.findUnique({
                  where: { id: adj.approvedBy },
                  include: {
                    employee: {
                      select: { id: true, firstName: true, lastName: true, employeeCode: true },
                    },
                  },
                })
              : null,
            this.prisma.user.findUnique({
              where: { id: adj.requestedBy },
              include: {
                employee: {
                  select: { id: true, firstName: true, lastName: true, employeeCode: true },
                },
              },
            }),
          ]);

          return {
            ...adj,
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
            requester: requester
              ? {
                  id: requester.id,
                  email: requester.email,
                  role: requester.role,
                  name: requester.employee
                    ? `${requester.employee.firstName} ${requester.employee.lastName}`
                    : requester.email,
                }
              : null,
          };
        }),
      );
    }

    if (user.role === Role.MANAGER) {
      // Check if employee is direct report
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
      });

      if (employee.managerId !== user.employee?.id) {
        throw new ForbiddenException('Access denied');
      }

      const adjustments = await this.prisma.attendanceAdjustment.findMany({
        where: { employeeId },
        include: {
          attendance: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Add approver and requester information
      return Promise.all(
        adjustments.map(async (adj) => {
          const [approver, requester] = await Promise.all([
            adj.approvedBy
              ? this.prisma.user.findUnique({
                  where: { id: adj.approvedBy },
                  include: {
                    employee: {
                      select: { id: true, firstName: true, lastName: true, employeeCode: true },
                    },
                  },
                })
              : null,
            this.prisma.user.findUnique({
              where: { id: adj.requestedBy },
              include: {
                employee: {
                  select: { id: true, firstName: true, lastName: true, employeeCode: true },
                },
              },
            }),
          ]);

          return {
            ...adj,
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
            requester: requester
              ? {
                  id: requester.id,
                  email: requester.email,
                  role: requester.role,
                  name: requester.employee
                    ? `${requester.employee.firstName} ${requester.employee.lastName}`
                    : requester.email,
                }
              : null,
          };
        }),
      );
    }

    // Employee, Supervisor, Stock Manager: own only
    if (employeeId !== user.employee?.id) {
      throw new ForbiddenException('Access denied');
    }

    const adjustments = await this.prisma.attendanceAdjustment.findMany({
      where: { employeeId },
      include: {
        attendance: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add approver and requester information
    return Promise.all(
      adjustments.map(async (adj) => {
        const [approver, requester] = await Promise.all([
          adj.approvedBy
            ? this.prisma.user.findUnique({
                where: { id: adj.approvedBy },
                include: {
                  employee: {
                    select: { id: true, firstName: true, lastName: true, employeeCode: true },
                  },
                },
              })
            : null,
          this.prisma.user.findUnique({
            where: { id: adj.requestedBy },
            include: {
              employee: {
                select: { id: true, firstName: true, lastName: true, employeeCode: true },
              },
            },
          }),
        ]);

        return {
          ...adj,
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
          requester: requester
            ? {
                id: requester.id,
                email: requester.email,
                role: requester.role,
                name: requester.employee
                  ? `${requester.employee.firstName} ${requester.employee.lastName}`
                  : requester.email,
              }
            : null,
        };
      }),
    );
  }

  async approveAdjustment(
    adjustmentId: string,
    userId: string,
    user: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const adjustment = await this.prisma.attendanceAdjustment.findUnique({
      where: { id: adjustmentId },
      include: { attendance: true },
    });

    if (!adjustment) {
      throw new NotFoundException('Adjustment request not found');
    }

    // Get the requester's role to determine approval requirements
    const requester = await this.prisma.user.findUnique({
      where: { id: adjustment.requestedBy },
      select: { role: true },
    });

    // If a manager requested the adjustment, only owner can approve
    if (requester?.role === Role.MANAGER) {
      if (user.role !== Role.OWNER) {
        throw new ForbiddenException('Manager-requested adjustments require owner approval');
      }
    } else {
      // For employee-requested adjustments, manager can approve their direct reports
      if (user.role === Role.MANAGER) {
        const employee = await this.prisma.employee.findUnique({
          where: { id: adjustment.employeeId },
        });

        if (employee.managerId !== user.employee?.id) {
          throw new ForbiddenException('Can only approve adjustments for direct reports');
        }
      }
    }

    if (adjustment.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Adjustment already processed');
    }

    // Update adjustment status
    await this.prisma.attendanceAdjustment.update({
      where: { id: adjustmentId },
      data: {
        status: ApprovalStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    // Apply adjustment to attendance
    const updateData: any = {};
    if (adjustment.clockIn) updateData.clockIn = adjustment.clockIn;
    if (adjustment.clockOut) updateData.clockOut = adjustment.clockOut;

    // Recalculate work duration if needed
    if (updateData.clockIn && updateData.clockOut) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: adjustment.employeeId },
        include: { company: true },
      });

      const policy = await this.prisma.policy.findFirst({
        where: {
          companyId: employee.companyId,
          type: 'ATTENDANCE_RULES',
          isActive: true,
        },
        orderBy: { version: 'desc' },
      });

      const policyConfig = (policy ? JSON.parse(policy.config) : {}) as AttendancePolicy || {
        gracePeriodMinutes: 15,
        roundingEnabled: true,
        roundingInterval: 15,
        minimumWorkHours: 4,
      };

      const clockIn = DateTime.fromJSDate(updateData.clockIn);
      const clockOut = DateTime.fromJSDate(updateData.clockOut);

      updateData.workDuration = calculateWorkDuration(
        clockIn,
        clockOut,
        policyConfig,
      );
    }

    updateData.adjustmentRequestId = adjustmentId;
    updateData.updatedAt = new Date();

    const updatedAttendance = await this.prisma.attendance.update({
      where: { id: adjustment.attendanceId },
      data: updateData,
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'APPROVE',
      entityType: 'AttendanceAdjustment',
      entityId: adjustmentId,
      actorId: userId,
      before: {
        status: adjustment.status,
        clockIn: adjustment.attendance.clockIn,
        clockOut: adjustment.attendance.clockOut,
      },
      after: {
        status: ApprovalStatus.APPROVED,
        clockIn: updatedAttendance.clockIn,
        clockOut: updatedAttendance.clockOut,
      },
      ipAddress,
      userAgent,
    });

    return updatedAttendance;
  }

  async rejectAdjustment(
    adjustmentId: string,
    userId: string,
    reason: string,
    user: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const adjustment = await this.prisma.attendanceAdjustment.findUnique({
      where: { id: adjustmentId },
    });

    if (!adjustment) {
      throw new NotFoundException('Adjustment request not found');
    }

    // Get the requester's role to determine approval requirements
    const requester = await this.prisma.user.findUnique({
      where: { id: adjustment.requestedBy },
      select: { role: true },
    });

    // If a manager requested the adjustment, only owner can reject
    if (requester?.role === Role.MANAGER) {
      if (user.role !== Role.OWNER) {
        throw new ForbiddenException('Manager-requested adjustments require owner approval');
      }
    } else {
      // For employee-requested adjustments, manager can reject their direct reports
      if (user.role === Role.MANAGER) {
        const employee = await this.prisma.employee.findUnique({
          where: { id: adjustment.employeeId },
        });

        if (employee.managerId !== user.employee?.id) {
          throw new ForbiddenException('Can only reject adjustments for direct reports');
        }
      }
    }

    const before = {
      status: adjustment.status,
    };

    const rejectedAdjustment = await this.prisma.attendanceAdjustment.update({
      where: { id: adjustmentId },
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
      entityType: 'AttendanceAdjustment',
      entityId: adjustmentId,
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

    return rejectedAdjustment;
  }

  async updateAdjustment(
    adjustmentId: string,
    employeeId: string,
    userId: string,
    updateDto: UpdateAttendanceAdjustmentDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const adjustment = await this.prisma.attendanceAdjustment.findUnique({
      where: { id: adjustmentId },
    });

    if (!adjustment) {
      throw new NotFoundException('Adjustment not found');
    }

    if (adjustment.employeeId !== employeeId) {
      throw new ForbiddenException('You can only update your own adjustments');
    }

    if (adjustment.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Can only update pending adjustments');
    }

    if (adjustment.requestedBy !== userId) {
      throw new ForbiddenException('You can only update adjustments you created');
    }

    const before = {
      clockIn: adjustment.clockIn,
      clockOut: adjustment.clockOut,
      reason: adjustment.reason,
    };

    const updatedAdjustment = await this.prisma.attendanceAdjustment.update({
      where: { id: adjustmentId },
      data: {
        clockIn: updateDto.clockIn ? new Date(updateDto.clockIn) : adjustment.clockIn,
        clockOut: updateDto.clockOut ? new Date(updateDto.clockOut) : adjustment.clockOut,
        reason: updateDto.reason || adjustment.reason,
      },
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'UPDATE',
      entityType: 'AttendanceAdjustment',
      entityId: adjustmentId,
      actorId: userId,
      before,
      after: {
        clockIn: updatedAdjustment.clockIn,
        clockOut: updatedAdjustment.clockOut,
        reason: updatedAdjustment.reason,
      },
      ipAddress,
      userAgent,
    });

    return updatedAdjustment;
  }

  async deleteAdjustment(
    adjustmentId: string,
    employeeId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const adjustment = await this.prisma.attendanceAdjustment.findUnique({
      where: { id: adjustmentId },
    });

    if (!adjustment) {
      throw new NotFoundException('Adjustment not found');
    }

    if (adjustment.employeeId !== employeeId) {
      throw new ForbiddenException('You can only delete your own adjustments');
    }

    if (adjustment.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Can only delete pending adjustments');
    }

    if (adjustment.requestedBy !== userId) {
      throw new ForbiddenException('You can only delete adjustments you created');
    }

    const before = {
      status: adjustment.status,
      clockIn: adjustment.clockIn,
      clockOut: adjustment.clockOut,
      reason: adjustment.reason,
    };

    // Log audit event before deletion
    await logAuditEvent(this.auditService, {
      action: 'DELETE',
      entityType: 'AttendanceAdjustment',
      entityId: adjustmentId,
      actorId: userId,
      before,
      ipAddress,
      userAgent,
    });

    return this.prisma.attendanceAdjustment.delete({
      where: { id: adjustmentId },
    });
  }
}

