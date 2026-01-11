import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PolicyService } from '../policy/policy.service';
import { DateTime } from 'luxon';
import { ApprovalStatus, Role, PolicyType } from '../types/enums';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { Decimal } from 'decimal.js';
import { calculateLeaveAccrual } from '../common/utils/leave-accrual';
import { logAuditEvent } from '../common/utils/audit-helper';
import { normalizeDateForDatabase } from '../common/utils/date-helper';

@Injectable()
export class LeaveService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private policyService: PolicyService,
  ) {}

  async getLeaveTypes(companyId: string, includeInactive = false) {
    return this.prisma.leaveType.findMany({
      where: {
        companyId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { code: 'asc' },
    });
  }

  async updateLeaveType(
    leaveTypeId: string,
    companyId: string,
    updateDto: any,
  ) {
    // Verify the leave type belongs to the company
    const leaveType = await this.prisma.leaveType.findFirst({
      where: {
        id: leaveTypeId,
        companyId,
      },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    // Check if quota-related fields are being updated
    const quotaFieldsUpdated =
      updateDto.maxBalance !== undefined ||
      updateDto.accrualRate !== undefined ||
      updateDto.carryoverAllowed !== undefined ||
      updateDto.carryoverMax !== undefined ||
      updateDto.expiresAfterMonths !== undefined;

    // Update the leave type
    const updatedLeaveType = await this.prisma.leaveType.update({
      where: { id: leaveTypeId },
      data: {
        ...(updateDto.name !== undefined && { name: updateDto.name }),
        ...(updateDto.nameId !== undefined && { nameId: updateDto.nameId }),
        ...(updateDto.isPaid !== undefined && { isPaid: updateDto.isPaid }),
        ...(updateDto.maxBalance !== undefined && { maxBalance: updateDto.maxBalance }),
        ...(updateDto.accrualRate !== undefined && {
          accrualRate: updateDto.accrualRate !== null ? new Decimal(updateDto.accrualRate) : null,
        }),
        ...(updateDto.carryoverAllowed !== undefined && { carryoverAllowed: updateDto.carryoverAllowed }),
        ...(updateDto.carryoverMax !== undefined && { carryoverMax: updateDto.carryoverMax }),
        ...(updateDto.expiresAfterMonths !== undefined && { expiresAfterMonths: updateDto.expiresAfterMonths }),
        ...(updateDto.requiresAttachment !== undefined && { requiresAttachment: updateDto.requiresAttachment }),
        ...(updateDto.isActive !== undefined && { isActive: updateDto.isActive }),
      },
    });

    // If quota fields were updated, balances will be recalculated on next fetch
    // via getLeaveBalance which now always uses current leave type settings
    // No need to proactively recalculate all balances here as it would be expensive
    // The recalculation happens automatically when employees view their balances

    return updatedLeaveType;
  }

  async getLeaveBalance(employeeId: string, leaveTypeId: string) {
    const now = DateTime.now().setZone('Asia/Jakarta');
    const currentYear = now.year;
    const currentMonth = now.month;

    // Validate employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Always get the current leave type settings (to reflect owner's quota changes)
    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    // Validate employee belongs to same company as leave type
    if (employee.companyId !== leaveType.companyId) {
      throw new BadRequestException('Employee and leave type must belong to the same company');
    }

    // Get leave policy to check accrual method and manual quota settings
    let accrualMethod: string | null = null;
    let manualQuotaEnabled: boolean = false;
    try {
      if (!leaveType.companyId) {
        throw new BadRequestException('Leave type must have a company ID');
      }
      const leavePolicy = await this.policyService.findByType(leaveType.companyId, PolicyType.LEAVE_POLICY);
      accrualMethod = leavePolicy.config?.accrualMethod || null;
      manualQuotaEnabled = leavePolicy.config?.manualQuotaEnabled || false;
    } catch (error: any) {
      // Policy might not exist (NotFoundException), use default behavior (normal accrual)
      // This is expected if policy hasn't been set up yet
      // Only log if it's not a NotFoundException
      if (error?.status !== 404 && error?.constructor?.name !== 'NotFoundException') {
        console.error('Error fetching leave policy:', error);
      }
    }

    // Get existing balance for current period
    let balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_periodYear_periodMonth: {
          employeeId,
          leaveTypeId,
          periodYear: currentYear,
          periodMonth: currentMonth,
        },
      },
    });

    // Get previous month balance for accrual calculation
    const previousMonth = now.minus({ months: 1 });
    const previousBalance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_periodYear_periodMonth: {
          employeeId,
          leaveTypeId,
          periodYear: previousMonth.year,
          periodMonth: previousMonth.month,
        },
      },
    });

    // For carryover calculation in July, get previous year's June balance
    let previousYearBalance: Decimal | undefined;
    if (currentMonth === 7) {
      const previousYear = currentYear - 1;
      const previousYearJuneBalance = await this.prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_periodYear_periodMonth: {
            employeeId,
            leaveTypeId,
            periodYear: previousYear,
            periodMonth: 6,
          },
        },
      });
      previousYearBalance = previousYearJuneBalance
        ? new Decimal(previousYearJuneBalance.balance)
        : undefined;
    }

    // Preserve the used amount from existing balance if it exists
    const usedAmount = balance ? new Decimal(balance.used) : new Decimal(0);

    // Check if manual quota mode is enabled and balance exists
    // If manual quota is enabled and balance exists, use it directly (don't recalculate)
    if (manualQuotaEnabled && balance) {
      // In manual quota mode, the balance stored is total available (balance + used)
      // So we return it as-is - the balance field already represents available balance
      // The used amount is already accounted for in how we store it
      return balance; // Return existing balance without recalculation
    }

    // Check if accrual method is "NONE" - if so, use simple maxBalance - used calculation
    const isAccrualDisabled = accrualMethod && typeof accrualMethod === 'string' && accrualMethod.toUpperCase() === 'NONE';
    
    let finalBalance: Decimal;
    let accrualResult: any;

    if (isAccrualDisabled) {
      // Simple calculation: maxBalance - used (no accrual, no carryover, no expiry)
      if (leaveType.maxBalance) {
        finalBalance = new Decimal(leaveType.maxBalance).sub(usedAmount);
      } else {
        // No max balance limit, return a large number or unlimited
        finalBalance = new Decimal(999).sub(usedAmount); // Use 999 as "unlimited" representation
      }
      accrualResult = {
        balance: finalBalance.add(usedAmount), // Total available before subtracting used
        accrued: new Decimal(0),
        used: usedAmount,
        carriedOver: new Decimal(0),
        expired: new Decimal(0),
        periodYear: currentYear,
        periodMonth: currentMonth,
      };
    } else {
      // Use normal accrual calculation
      // Always recalculate balance based on current leave type settings
      // This ensures balances reflect owner's quota changes
      // Use previous month's balance (or null) to recalculate accrual for current month
      try {
        accrualResult = calculateLeaveAccrual(
          leaveType,
          previousBalance, // Use previous month's balance to recalculate accrual
          currentYear,
          currentMonth,
          previousYearBalance, // For carryover calculation in July
        );

        // Calculate final balance: total available balance minus current month's used
        // The accrualResult.balance is the total available balance (after accrual, carryover, expiry, and maxBalance cap, but before current month's used)
        finalBalance = accrualResult.balance.sub(usedAmount);
      } catch (error: any) {
        console.error('Error calculating leave accrual:', error);
        throw new BadRequestException(`Failed to calculate leave balance: ${error.message || 'Unknown error'}`);
      }
    }

    if (balance) {
      // Update existing balance with recalculated values based on current settings
      balance = await this.prisma.leaveBalance.update({
        where: {
          employeeId_leaveTypeId_periodYear_periodMonth: {
            employeeId,
            leaveTypeId,
            periodYear: currentYear,
            periodMonth: currentMonth,
          },
        },
        data: {
          balance: finalBalance.toNumber(),
          accrued: accrualResult.accrued.toNumber(),
          used: usedAmount.toNumber(),
          carriedOver: accrualResult.carriedOver.toNumber(),
          expired: accrualResult.expired.toNumber(),
        },
      });
    } else {
      // Create new balance
      balance = await this.prisma.leaveBalance.create({
        data: {
          employeeId,
          leaveTypeId,
          balance: finalBalance.toNumber(),
          accrued: accrualResult.accrued.toNumber(),
          used: usedAmount.toNumber(),
          carriedOver: accrualResult.carriedOver.toNumber(),
          expired: accrualResult.expired.toNumber(),
          periodYear: currentYear,
          periodMonth: currentMonth,
        },
      });
    }

    return balance;
  }

  /**
   * Get all leave balances for all active employees in a company
   * Optimized bulk fetch to avoid N+1 queries
   */
  async getAllBalancesForCompany(companyId: string) {
    const now = DateTime.now().setZone('Asia/Jakarta');
    const currentYear = now.year;
    const currentMonth = now.month;
    const previousMonth = now.minus({ months: 1 });

    // Get leave policy once
    let accrualMethod: string | null = null;
    let manualQuotaEnabled: boolean = false;
    try {
      const leavePolicy = await this.policyService.findByType(companyId, PolicyType.LEAVE_POLICY);
      accrualMethod = leavePolicy.config?.accrualMethod || null;
      manualQuotaEnabled = leavePolicy.config?.manualQuotaEnabled || false;
    } catch (error: any) {
      // Policy might not exist, use defaults
      if (error?.status !== 404 && error?.constructor?.name !== 'NotFoundException') {
        console.error('Error fetching leave policy:', error);
      }
    }

    // Get all active employees in one query
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        companyId: true,
      },
    });

    // Get all active leave types in one query
    const leaveTypes = await this.prisma.leaveType.findMany({
      where: {
        companyId,
        isActive: true,
      },
    });

    if (employees.length === 0 || leaveTypes.length === 0) {
      return [];
    }

    const employeeIds = employees.map(e => e.id);
    const leaveTypeIds = leaveTypes.map(lt => lt.id);

    // Get all current period balances in one query
    const currentBalances = await this.prisma.leaveBalance.findMany({
      where: {
        employeeId: { in: employeeIds },
        leaveTypeId: { in: leaveTypeIds },
        periodYear: currentYear,
        periodMonth: currentMonth,
      },
    });

    // Get all previous month balances in one query
    const previousBalances = await this.prisma.leaveBalance.findMany({
      where: {
        employeeId: { in: employeeIds },
        leaveTypeId: { in: leaveTypeIds },
        periodYear: previousMonth.year,
        periodMonth: previousMonth.month,
      },
    });

    // Get previous year June balances for carryover (if current month is July)
    let previousYearBalances: any[] = [];
    if (currentMonth === 7) {
      const previousYear = currentYear - 1;
      previousYearBalances = await this.prisma.leaveBalance.findMany({
        where: {
          employeeId: { in: employeeIds },
          leaveTypeId: { in: leaveTypeIds },
          periodYear: previousYear,
          periodMonth: 6,
        },
      });
    }

    // Create maps for quick lookup
    const currentBalanceMap = new Map<string, any>();
    currentBalances.forEach(b => {
      currentBalanceMap.set(`${b.employeeId}_${b.leaveTypeId}`, b);
    });

    const previousBalanceMap = new Map<string, any>();
    previousBalances.forEach(b => {
      previousBalanceMap.set(`${b.employeeId}_${b.leaveTypeId}`, b);
    });

    const previousYearBalanceMap = new Map<string, any>();
    previousYearBalances.forEach(b => {
      previousYearBalanceMap.set(`${b.employeeId}_${b.leaveTypeId}`, b);
    });

    // Process all combinations
    const results: any[] = [];
    const isAccrualDisabled = accrualMethod && typeof accrualMethod === 'string' && accrualMethod.toUpperCase() === 'NONE';

    for (const employee of employees) {
      for (const leaveType of leaveTypes) {
        const key = `${employee.id}_${leaveType.id}`;
        let balance = currentBalanceMap.get(key);
        const previousBalance = previousBalanceMap.get(key);
        const previousYearBalance = previousYearBalanceMap.get(key);

        // If manual quota enabled and balance exists, use it directly
        if (manualQuotaEnabled && balance) {
          results.push(balance);
          continue;
        }

        // Calculate balance
        const usedAmount = balance ? new Decimal(balance.used) : new Decimal(0);
        let finalBalance: Decimal;
        let accrualResult: any;

        if (isAccrualDisabled) {
          // Simple calculation: maxBalance - used
          if (leaveType.maxBalance) {
            finalBalance = new Decimal(leaveType.maxBalance).sub(usedAmount);
          } else {
            finalBalance = new Decimal(999).sub(usedAmount);
          }
          accrualResult = {
            balance: finalBalance.add(usedAmount),
            accrued: new Decimal(0),
            used: usedAmount,
            carriedOver: new Decimal(0),
            expired: new Decimal(0),
            periodYear: currentYear,
            periodMonth: currentMonth,
          };
        } else {
          // Normal accrual calculation
          const previousYearBalanceDecimal = previousYearBalance
            ? new Decimal(previousYearBalance.balance)
            : undefined;

          try {
            accrualResult = calculateLeaveAccrual(
              leaveType,
              previousBalance,
              currentYear,
              currentMonth,
              previousYearBalanceDecimal,
            );
            finalBalance = accrualResult.balance.sub(usedAmount);
          } catch (error: any) {
            console.error(`Error calculating accrual for employee ${employee.id}, leave type ${leaveType.id}:`, error);
            // Skip this combination on error
            continue;
          }
        }

        // Update or create balance
        if (balance) {
          balance = await this.prisma.leaveBalance.update({
            where: {
              employeeId_leaveTypeId_periodYear_periodMonth: {
                employeeId: employee.id,
                leaveTypeId: leaveType.id,
                periodYear: currentYear,
                periodMonth: currentMonth,
              },
            },
            data: {
              balance: finalBalance.toNumber(),
              accrued: accrualResult.accrued.toNumber(),
              used: usedAmount.toNumber(),
              carriedOver: accrualResult.carriedOver.toNumber(),
              expired: accrualResult.expired.toNumber(),
            },
          });
        } else {
          balance = await this.prisma.leaveBalance.create({
            data: {
              employeeId: employee.id,
              leaveTypeId: leaveType.id,
              balance: finalBalance.toNumber(),
              accrued: accrualResult.accrued.toNumber(),
              used: usedAmount.toNumber(),
              carriedOver: accrualResult.carriedOver.toNumber(),
              expired: accrualResult.expired.toNumber(),
              periodYear: currentYear,
              periodMonth: currentMonth,
            },
          });
        }

        results.push(balance);
      }
    }

    return results;
  }

  async createLeaveRequest(
    employeeId: string,
    createLeaveRequestDto: CreateLeaveRequestDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Parse dates in Asia/Jakarta timezone and normalize to start of day
    const startDate = DateTime.fromISO(createLeaveRequestDto.startDate, {
      zone: 'Asia/Jakarta',
    }).startOf('day');
    const endDate = DateTime.fromISO(createLeaveRequestDto.endDate, {
      zone: 'Asia/Jakarta',
    }).startOf('day');

    if (!startDate.isValid || !endDate.isValid) {
      throw new BadRequestException('Invalid date format');
    }

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after or equal to start date');
    }

    // Calculate days (excluding Monday)
    // weekday: 1 = Monday, 7 = Sunday
    // Working days: Tuesday (2) to Sunday (7)
    // Monday (1) is non-working day, excluded from leave calculation
    let days = 0;
    let current = startDate;
    
    // Include both start and end dates (inclusive)
    while (current <= endDate) {
      if (current.weekday >= 2 && current.weekday <= 7) {
        days += 1;
      }
      current = current.plus({ days: 1 });
    }

    // Check leave balance
    const balance = await this.getLeaveBalance(employeeId, createLeaveRequestDto.leaveTypeId);
    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: createLeaveRequestDto.leaveTypeId },
    });

    if (leaveType.isPaid && new Decimal(balance.balance).lt(days)) {
      throw new BadRequestException('Insufficient leave balance');
    }

    // Normalize dates for database (DATE fields should use UTC midnight)
    const startDateNormalized = normalizeDateForDatabase(startDate.toISODate() || '');
    const endDateNormalized = normalizeDateForDatabase(endDate.toISODate() || '');

    // Check for overlapping requests
    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: {
          in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED],
        },
        OR: [
          {
            startDate: { lte: endDateNormalized },
            endDate: { gte: startDateNormalized },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('Overlapping leave request exists');
    }

    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId: createLeaveRequestDto.leaveTypeId,
        startDate: startDateNormalized,
        endDate: endDateNormalized,
        days: new Decimal(days),
        reason: createLeaveRequestDto.reason,
        attachmentUrl: createLeaveRequestDto.attachmentUrl,
        status: ApprovalStatus.PENDING,
      },
      include: {
        leaveType: true,
      },
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'CREATE',
      entityType: 'LeaveRequest',
      entityId: leaveRequest.id,
      actorId: userId,
      after: {
        leaveTypeId: leaveRequest.leaveTypeId,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        days: leaveRequest.days.toString(),
        reason: leaveRequest.reason,
        status: leaveRequest.status,
      },
      ipAddress,
      userAgent,
    });

    return leaveRequest;
  }

  async getLeaveRequests(employeeId: string, user: any) {
    // Owner: all, Manager: direct reports, Employee: own
    if (user.role === Role.OWNER) {
      const requests = await this.prisma.leaveRequest.findMany({
        where: { employeeId },
        include: {
          leaveType: true,
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

      const requests = await this.prisma.leaveRequest.findMany({
        where: { employeeId },
        include: {
          leaveType: true,
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

    if (user.role === Role.STOCK_MANAGER) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          user: {
            select: { role: true },
          },
        },
      });

      // Stock Manager can access leave requests for all employees except MANAGER and OWNER
      if (employee.user?.role === Role.MANAGER || employee.user?.role === Role.OWNER) {
        throw new ForbiddenException('Access denied');
      }

      const requests = await this.prisma.leaveRequest.findMany({
        where: { employeeId },
        include: {
          leaveType: true,
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

    // Employee: own only
    if (employeeId !== user.employee?.id) {
      throw new ForbiddenException('Access denied');
    }

    const requests = await this.prisma.leaveRequest.findMany({
      where: { employeeId },
      include: {
        leaveType: true,
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

  async approveLeaveRequest(
    requestId: string,
    userId: string,
    user: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { leaveType: true },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    // Check permissions
    if (user.role === Role.MANAGER) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: request.employeeId },
      });

      if (employee.managerId !== user.employee?.id) {
        throw new ForbiddenException('Can only approve leave for direct reports');
      }
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Leave request already processed');
    }

    // Update request
    await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    // Update leave balance
    const now = DateTime.now().setZone('Asia/Jakarta');
    const balance = await this.getLeaveBalance(request.employeeId, request.leaveTypeId);
    
    await this.prisma.leaveBalance.update({
      where: {
        employeeId_leaveTypeId_periodYear_periodMonth: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          periodYear: balance.periodYear,
          periodMonth: balance.periodMonth,
        },
      },
      data: {
        used: new Decimal(balance.used).add(request.days).toNumber(),
        balance: new Decimal(balance.balance).sub(request.days).toNumber(),
      },
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'APPROVE',
      entityType: 'LeaveRequest',
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

    return request;
  }

  async rejectLeaveRequest(
    requestId: string,
    userId: string,
    reason: string,
    user: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    // Check permissions
    if (user.role === Role.MANAGER) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: request.employeeId },
      });

      if (employee.managerId !== user.employee?.id) {
        throw new ForbiddenException('Can only reject leave for direct reports');
      }
    }

    const before = {
      status: request.status,
    };

    const rejectedRequest = await this.prisma.leaveRequest.update({
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
      entityType: 'LeaveRequest',
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

  async updateLeaveRequest(
    requestId: string,
    employeeId: string,
    updateDto: UpdateLeaveRequestDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { leaveType: true },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.employeeId !== employeeId) {
      throw new ForbiddenException('You can only update your own leave requests');
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Can only update pending leave requests');
    }

    // Prepare update data
    const updateData: any = {};

    if (updateDto.leaveTypeId) {
      updateData.leaveTypeId = updateDto.leaveTypeId;
    }

    if (updateDto.startDate || updateDto.endDate) {
      // Parse dates in Asia/Jakarta timezone and normalize to start of day
      const startDate = updateDto.startDate
        ? DateTime.fromISO(updateDto.startDate, { zone: 'Asia/Jakarta' }).startOf('day')
        : DateTime.fromJSDate(request.startDate, { zone: 'Asia/Jakarta' }).startOf('day');
      const endDate = updateDto.endDate
        ? DateTime.fromISO(updateDto.endDate, { zone: 'Asia/Jakarta' }).startOf('day')
        : DateTime.fromJSDate(request.endDate, { zone: 'Asia/Jakarta' }).startOf('day');

      if (!startDate.isValid || !endDate.isValid) {
        throw new BadRequestException('Invalid date format');
      }

      if (endDate < startDate) {
        throw new BadRequestException('End date must be after or equal to start date');
      }

      // Recalculate days (excluding Monday)
      // weekday: 1 = Monday, 7 = Sunday
      // Working days: Tuesday (2) to Sunday (7)
      // Monday (1) is non-working day, excluded from leave calculation
      let days = 0;
      let current = startDate;
      
      // Include both start and end dates (inclusive)
      while (current <= endDate) {
        if (current.weekday >= 2 && current.weekday <= 7) {
          days += 1;
        }
        current = current.plus({ days: 1 });
      }

      // Normalize dates for database (DATE fields should use UTC midnight)
      updateData.startDate = normalizeDateForDatabase(startDate.toISODate() || '');
      updateData.endDate = normalizeDateForDatabase(endDate.toISODate() || '');
      updateData.days = new Decimal(days);

      // Check leave balance if it's a paid leave type
      const leaveTypeId = updateDto.leaveTypeId || request.leaveTypeId;
      const leaveType = await this.prisma.leaveType.findUnique({
        where: { id: leaveTypeId },
      });

      if (leaveType.isPaid) {
        const balance = await this.getLeaveBalance(employeeId, leaveTypeId);
        if (new Decimal(balance.balance).lt(days)) {
          throw new BadRequestException('Insufficient leave balance');
        }
      }
    }

    if (updateDto.reason !== undefined) {
      updateData.reason = updateDto.reason;
    }

    if (updateDto.attachmentUrl !== undefined) {
      updateData.attachmentUrl = updateDto.attachmentUrl;
    }

    const before = {
      leaveTypeId: request.leaveTypeId,
      startDate: request.startDate,
      endDate: request.endDate,
      days: request.days.toString(),
      reason: request.reason,
    };

    const updatedRequest = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: updateData,
      include: { leaveType: true },
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'UPDATE',
      entityType: 'LeaveRequest',
      entityId: requestId,
      actorId: userId,
      before,
      after: {
        leaveTypeId: updatedRequest.leaveTypeId,
        startDate: updatedRequest.startDate,
        endDate: updatedRequest.endDate,
        days: updatedRequest.days.toString(),
        reason: updatedRequest.reason,
      },
      ipAddress,
      userAgent,
    });

    return updatedRequest;
  }

  async deleteLeaveRequest(
    requestId: string,
    employeeId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.employeeId !== employeeId) {
      throw new ForbiddenException('You can only delete your own leave requests');
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Can only delete pending leave requests');
    }

    const before = {
      status: request.status,
      leaveTypeId: request.leaveTypeId,
      startDate: request.startDate,
      endDate: request.endDate,
      days: request.days.toString(),
      reason: request.reason,
    };

    // Log audit event before deletion
    await logAuditEvent(this.auditService, {
      action: 'DELETE',
      entityType: 'LeaveRequest',
      entityId: requestId,
      actorId: userId,
      before,
      ipAddress,
      userAgent,
    });

    return this.prisma.leaveRequest.delete({
      where: { id: requestId },
    });
  }

  async setManualQuota(
    employeeId: string,
    leaveTypeId: string,
    balance: number,
    userId: string,
    companyId: string,
  ) {
    // Verify leave type belongs to company
    const leaveType = await this.prisma.leaveType.findFirst({
      where: {
        id: leaveTypeId,
        companyId,
      },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    // Verify employee belongs to company
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Check if manual quota is enabled in leave policy
    let manualQuotaEnabled = false;
    try {
      const leavePolicy = await this.policyService.findByType(companyId, PolicyType.LEAVE_POLICY);
      manualQuotaEnabled = leavePolicy.config?.manualQuotaEnabled || false;
    } catch (error) {
      // Policy might not exist
    }

    if (!manualQuotaEnabled) {
      throw new BadRequestException('Manual quota adjustment is not enabled. Please enable it in Leave Policy settings first.');
    }

    const now = DateTime.now().setZone('Asia/Jakarta');
    const currentYear = now.year;
    const currentMonth = now.month;

    // Get or create balance for current period
    const existingBalance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_periodYear_periodMonth: {
          employeeId,
          leaveTypeId,
          periodYear: currentYear,
          periodMonth: currentMonth,
        },
      },
    });

    const balanceDecimal = new Decimal(balance);
    const usedAmount = existingBalance ? new Decimal(existingBalance.used) : new Decimal(0);
    
    // The balance field stores available balance (after subtracting used)
    // So we store the balance directly as the available amount
    // The used amount is tracked separately

    if (existingBalance) {
      // Update existing balance
      const updated = await this.prisma.leaveBalance.update({
        where: {
          employeeId_leaveTypeId_periodYear_periodMonth: {
            employeeId,
            leaveTypeId,
            periodYear: currentYear,
            periodMonth: currentMonth,
          },
        },
        data: {
          balance: balanceDecimal.toNumber(),
          // Keep accrued, carriedOver, expired as 0 for manual quotas
          accrued: 0,
          carriedOver: 0,
          expired: 0,
        },
      });

      // Log audit event
      await logAuditEvent(this.auditService, {
        action: 'MANUAL_QUOTA_SET',
        entityType: 'LeaveBalance',
        entityId: updated.id,
        actorId: userId,
        after: { employeeId, leaveTypeId, balance: balanceDecimal.toNumber() },
      });

      return updated;
    } else {
      // Create new balance
      const created = await this.prisma.leaveBalance.create({
        data: {
          employeeId,
          leaveTypeId,
          balance: balanceDecimal.toNumber(),
          accrued: 0,
          used: usedAmount.toNumber(),
          carriedOver: 0,
          expired: 0,
          periodYear: currentYear,
          periodMonth: currentMonth,
        },
      });

      // Log audit event
      await logAuditEvent(this.auditService, {
        action: 'MANUAL_QUOTA_SET',
        entityType: 'LeaveBalance',
        entityId: created.id,
        actorId: userId,
        after: { employeeId, leaveTypeId, balance: balanceDecimal.toNumber() },
      });

      return created;
    }
  }
}

