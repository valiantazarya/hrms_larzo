import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DateTime } from 'luxon';
import { Role, PayrollStatus } from '../types/enums';
import { Decimal } from 'decimal.js';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { UpdatePayrollItemDto } from './dto/update-payroll-item.dto';
import { UpdatePayrollRunDto } from './dto/update-payroll-run.dto';
import {
  calculatePayrollItem,
  PayrollCalculationInput,
} from '../common/utils/payroll-calculator';
import { logAuditEvent } from '../common/utils/audit-helper';

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async createPayrollRun(
    companyId: string,
    userId: string,
    createPayrollRunDto: CreatePayrollRunDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Check if payroll run already exists for this period
    const existing = await this.prisma.payrollRun.findUnique({
      where: {
        companyId_periodYear_periodMonth: {
          companyId,
          periodYear: createPayrollRunDto.periodYear,
          periodMonth: createPayrollRunDto.periodMonth,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Payroll run already exists for this period');
    }

    // Create payroll run
    const payrollRun = await this.prisma.payrollRun.create({
      data: {
        companyId,
        periodYear: createPayrollRunDto.periodYear,
        periodMonth: createPayrollRunDto.periodMonth,
        status: PayrollStatus.DRAFT,
        notes: createPayrollRunDto.notes,
        runDate: new Date(),
      },
    });

    // Get all active employees
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
      },
      include: {
        employment: true,
      },
    });

    // Get payroll policy for BPJS rates
    const payrollPolicy = await this.prisma.policy.findFirst({
      where: {
        companyId,
        type: 'PAYROLL_CONFIG',
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    const defaultConfig = {
      bpjsKesehatan: { type: 'percentage', value: 5 },
      bpjsKetenagakerjaan: { type: 'percentage', value: 2 },
    };

    let policyConfig = payrollPolicy ? JSON.parse(payrollPolicy.config) : defaultConfig;

    // Backward compatibility: convert old rate format to new format
    if (policyConfig.bpjsKesehatanRate !== undefined && !policyConfig.bpjsKesehatan) {
      policyConfig.bpjsKesehatan = { type: 'percentage', value: policyConfig.bpjsKesehatanRate };
    }
    if (policyConfig.bpjsKetenagakerjaanRate !== undefined && !policyConfig.bpjsKetenagakerjaan) {
      policyConfig.bpjsKetenagakerjaan = { type: 'percentage', value: policyConfig.bpjsKetenagakerjaanRate };
    }

    // Ensure new format exists, fallback to defaults
    if (!policyConfig.bpjsKesehatan || typeof policyConfig.bpjsKesehatan !== 'object') {
      policyConfig.bpjsKesehatan = defaultConfig.bpjsKesehatan;
    }
    if (!policyConfig.bpjsKetenagakerjaan || typeof policyConfig.bpjsKetenagakerjaan !== 'object') {
      policyConfig.bpjsKetenagakerjaan = defaultConfig.bpjsKetenagakerjaan;
    }

    // Validate config structure
    if (!policyConfig.bpjsKesehatan.type || !['percentage', 'fixed'].includes(policyConfig.bpjsKesehatan.type)) {
      policyConfig.bpjsKesehatan.type = 'percentage';
    }
    if (typeof policyConfig.bpjsKesehatan.value !== 'number' || policyConfig.bpjsKesehatan.value < 0) {
      policyConfig.bpjsKesehatan.value = defaultConfig.bpjsKesehatan.value;
    }

    if (!policyConfig.bpjsKetenagakerjaan.type || !['percentage', 'fixed'].includes(policyConfig.bpjsKetenagakerjaan.type)) {
      policyConfig.bpjsKetenagakerjaan.type = 'percentage';
    }
    if (typeof policyConfig.bpjsKetenagakerjaan.value !== 'number' || policyConfig.bpjsKetenagakerjaan.value < 0) {
      policyConfig.bpjsKetenagakerjaan.value = defaultConfig.bpjsKetenagakerjaan.value;
    }

    // BPJS config loaded from policy or defaults

    // Calculate start and end dates for the period
    const startDate = DateTime.fromObject({
      year: createPayrollRunDto.periodYear,
      month: createPayrollRunDto.periodMonth,
      day: 1,
    }).startOf('day').toJSDate();

    const endDate = DateTime.fromObject({
      year: createPayrollRunDto.periodYear,
      month: createPayrollRunDto.periodMonth,
    }).endOf('month').toJSDate();

    // Create payroll items for each employee
    const payrollItems = [];
    for (const employee of employees) {
      if (!employee.employment) continue;

      // Get attendances for the period
      const attendances = await this.prisma.attendance.findMany({
        where: {
          employeeId: employee.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Skip daily and hourly employees who didn't work during the payroll period
      // Monthly employees are always included regardless of attendance
      const employmentType = employee.employment.type;
      if ((employmentType === 'DAILY' || employmentType === 'HOURLY') && attendances.length === 0) {
        continue;
      }

      // Get approved overtime requests for the period
      const overtimeRequests = await this.prisma.overtimeRequest.findMany({
        where: {
          employeeId: employee.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
          status: 'APPROVED',
        },
      });

      // Calculate payroll
      const calculationInput: PayrollCalculationInput = {
        employeeId: employee.id,
        periodYear: createPayrollRunDto.periodYear,
        periodMonth: createPayrollRunDto.periodMonth,
        employment: {
          type: employee.employment.type as any,
          baseSalary: employee.employment.baseSalary ? new Decimal(employee.employment.baseSalary) : null,
          hourlyRate: employee.employment.hourlyRate ? new Decimal(employee.employment.hourlyRate) : null,
          dailyRate: employee.employment.dailyRate ? new Decimal(employee.employment.dailyRate) : null,
        },
        attendances,
        overtimeRequests,
        allowances: new Decimal(0),
        bonuses: new Decimal(0),
        deductions: new Decimal(0),
        hasBPJS: employee.employment.hasBPJS || false,
        bpjsKesehatan: employee.employment.hasBPJS ? (policyConfig.bpjsKesehatan || { type: 'percentage', value: 5 }) : undefined,
        bpjsKetenagakerjaan: employee.employment.hasBPJS ? (policyConfig.bpjsKetenagakerjaan || { type: 'percentage', value: 2 }) : undefined,
        transportBonus: employee.employment.transportBonus ? new Decimal(employee.employment.transportBonus) : null,
        lunchBonus: employee.employment.lunchBonus ? new Decimal(employee.employment.lunchBonus) : null,
        thr: (employee.employment as any).thr ? new Decimal((employee.employment as any).thr) : null,
      };

      const calculation = calculatePayrollItem(calculationInput);

      // Create payroll item
      const payrollItem = await this.prisma.payrollItem.create({
        data: {
          payrollRunId: payrollRun.id,
          employeeId: employee.id,
          employmentType: employee.employment.type,
          baseSalary: employee.employment.baseSalary,
          hourlyRate: employee.employment.hourlyRate,
          dailyRate: employee.employment.dailyRate,
          basePay: calculation.basePay.toNumber(),
          overtimePay: calculation.overtimePay.toNumber(),
          allowances: calculation.allowances.toNumber(),
          bonuses: calculation.bonuses.toNumber(),
          transportBonus: calculation.transportBonus.toNumber(),
          lunchBonus: calculation.lunchBonus.toNumber(),
          thr: calculation.thr.toNumber(),
          deductions: calculation.deductions.toNumber(),
          bpjsKesehatanEmployee: calculation.bpjsKesehatanEmployee.toNumber(),
          bpjsKesehatanEmployer: calculation.bpjsKesehatanEmployer.toNumber(),
          bpjsKetenagakerjaanEmployee: calculation.bpjsKetenagakerjaanEmployee.toNumber(),
          bpjsKetenagakerjaanEmployer: calculation.bpjsKetenagakerjaanEmployer.toNumber(),
          pph21: calculation.pph21.toNumber(),
          grossPay: calculation.grossPay.toNumber(),
          netPay: calculation.netPay.toNumber(),
          breakdown: JSON.stringify(calculation.breakdown),
        } as any,
      });

      payrollItems.push(payrollItem);
    }

    // Calculate total amount
    const totalAmount = payrollItems.reduce(
      (sum, item) => sum.add(new Decimal(item.netPay)),
      new Decimal(0),
    );

    // Update payroll run with total
    const updatedPayrollRun = await this.prisma.payrollRun.update({
      where: { id: payrollRun.id },
      data: {
        totalAmount: totalAmount.toNumber(),
      },
      include: {
        items: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'CREATE',
      entityType: 'PayrollRun',
      entityId: payrollRun.id,
      actorId: userId,
      after: {
        periodYear: payrollRun.periodYear,
        periodMonth: payrollRun.periodMonth,
        status: payrollRun.status,
        totalAmount: updatedPayrollRun.totalAmount,
        itemsCount: employees.length,
      },
      ipAddress,
      userAgent,
    });

    return updatedPayrollRun;
  }

  async getPayrollRuns(companyId: string) {
    return this.prisma.payrollRun.findMany({
      where: { companyId },
      include: {
        items: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: [
        { periodYear: 'desc' },
        { periodMonth: 'desc' },
      ],
    });
  }

  async getPayrollRun(id: string, companyId: string) {
    const payrollRun = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                employment: true,
              },
            },
          },
        },
      },
    });

    if (!payrollRun || payrollRun.companyId !== companyId) {
      throw new NotFoundException('Payroll run not found');
    }

    return payrollRun;
  }

  async updatePayrollRun(
    id: string,
    companyId: string,
    updatePayrollRunDto: UpdatePayrollRunDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const payrollRun = await this.prisma.payrollRun.findUnique({
      where: { id },
    });

    if (!payrollRun || payrollRun.companyId !== companyId) {
      throw new NotFoundException('Payroll run not found');
    }

    // Cannot update locked or paid payroll
    if (payrollRun.status === PayrollStatus.LOCKED || payrollRun.status === PayrollStatus.PAID) {
      throw new BadRequestException('Cannot update locked or paid payroll');
    }

    // Check if period is being changed and if new period already exists
    if (updatePayrollRunDto.periodYear || updatePayrollRunDto.periodMonth) {
      const newYear = updatePayrollRunDto.periodYear ?? payrollRun.periodYear;
      const newMonth = updatePayrollRunDto.periodMonth ?? payrollRun.periodMonth;

      // Check if different from current period
      if (newYear !== payrollRun.periodYear || newMonth !== payrollRun.periodMonth) {
        const existing = await this.prisma.payrollRun.findUnique({
          where: {
            companyId_periodYear_periodMonth: {
              companyId,
              periodYear: newYear,
              periodMonth: newMonth,
            },
          },
        });

        if (existing && existing.id !== id) {
          throw new BadRequestException('Payroll run already exists for this period');
        }
      }
    }

    const before = {
      periodYear: payrollRun.periodYear,
      periodMonth: payrollRun.periodMonth,
      notes: payrollRun.notes,
    };

    const updatedPayrollRun = await this.prisma.payrollRun.update({
      where: { id },
      data: {
        ...(updatePayrollRunDto.periodYear !== undefined && {
          periodYear: updatePayrollRunDto.periodYear,
        }),
        ...(updatePayrollRunDto.periodMonth !== undefined && {
          periodMonth: updatePayrollRunDto.periodMonth,
        }),
        ...(updatePayrollRunDto.notes !== undefined && {
          notes: updatePayrollRunDto.notes,
        }),
      },
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'UPDATE',
      entityType: 'PayrollRun',
      entityId: id,
      actorId: userId,
      before,
      after: {
        periodYear: updatedPayrollRun.periodYear,
        periodMonth: updatedPayrollRun.periodMonth,
        notes: updatedPayrollRun.notes,
      },
      ipAddress,
      userAgent,
    });

    return updatedPayrollRun;
  }

  async deletePayrollRun(id: string, companyId: string) {
    const payrollRun = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!payrollRun) {
      throw new NotFoundException('Payroll run not found');
    }

    if (payrollRun.companyId !== companyId) {
      throw new NotFoundException('Payroll run not found');
    }

    // Cannot delete locked or paid payroll
    if (payrollRun.status === PayrollStatus.LOCKED || payrollRun.status === PayrollStatus.PAID) {
      throw new BadRequestException('Cannot delete locked or paid payroll');
    }

    // Delete all payroll items first (cascade delete should handle this, but being explicit)
    await this.prisma.payrollItem.deleteMany({
      where: { payrollRunId: id },
    });

    // Delete the payroll run
    return this.prisma.payrollRun.delete({
      where: { id },
    });
  }

  async updatePayrollItem(
    itemId: string,
    payrollRunId: string,
    companyId: string,
    updatePayrollItemDto: UpdatePayrollItemDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const payrollRun = await this.prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
    });

    if (!payrollRun || payrollRun.companyId !== companyId) {
      throw new NotFoundException('Payroll run not found');
    }

    if (payrollRun.status === PayrollStatus.LOCKED || payrollRun.status === PayrollStatus.PAID) {
      throw new BadRequestException('Cannot update locked or paid payroll');
    }

    const item = await this.prisma.payrollItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.payrollRunId !== payrollRunId) {
      throw new NotFoundException('Payroll item not found');
    }

    // Recalculate net pay if allowances, bonuses, deductions, transportBonus, lunchBonus, thr, or pph21 changed
    const newAllowances = updatePayrollItemDto.allowances !== undefined
      ? new Decimal(updatePayrollItemDto.allowances)
      : new Decimal(item.allowances);
    const newBonuses = updatePayrollItemDto.bonuses !== undefined
      ? new Decimal(updatePayrollItemDto.bonuses)
      : new Decimal(item.bonuses);
    const newTransportBonus = updatePayrollItemDto.transportBonus !== undefined
      ? new Decimal(updatePayrollItemDto.transportBonus)
      : new Decimal(item.transportBonus);
    const newLunchBonus = updatePayrollItemDto.lunchBonus !== undefined
      ? new Decimal(updatePayrollItemDto.lunchBonus)
      : new Decimal(item.lunchBonus);
    const newThr = updatePayrollItemDto.thr !== undefined
      ? new Decimal(updatePayrollItemDto.thr)
      : new Decimal((item as any).thr || 0);
    const newDeductions = updatePayrollItemDto.deductions !== undefined
      ? new Decimal(updatePayrollItemDto.deductions)
      : new Decimal(item.deductions);
    const newPph21 = updatePayrollItemDto.pph21 !== undefined
      ? new Decimal(updatePayrollItemDto.pph21)
      : new Decimal(item.pph21);

    const newGrossPay = new Decimal(item.basePay)
      .add(new Decimal(item.overtimePay))
      .add(newAllowances)
      .add(newBonuses)
      .add(newTransportBonus)
      .add(newLunchBonus)
      .add(newThr)
      .sub(newDeductions);

    const newNetPay = newGrossPay
      .sub(new Decimal(item.bpjsKesehatanEmployee))
      .sub(new Decimal(item.bpjsKetenagakerjaanEmployee))
      .sub(newPph21);

    // Update the payroll item
    await this.prisma.payrollItem.update({
      where: { id: itemId },
      data: {
        allowances: newAllowances.toNumber(),
        bonuses: newBonuses.toNumber(),
        transportBonus: newTransportBonus.toNumber(),
        lunchBonus: newLunchBonus.toNumber(),
        thr: newThr.toNumber(),
        deductions: newDeductions.toNumber(),
        pph21: newPph21.toNumber(),
        grossPay: newGrossPay.toNumber(),
        netPay: newNetPay.toNumber(),
      } as any,
    });

    // Recalculate total amount for the payroll run
    const allItems = await this.prisma.payrollItem.findMany({
      where: { payrollRunId },
    });

    const totalAmount = allItems.reduce(
      (sum, item) => sum.add(new Decimal(item.netPay)),
      new Decimal(0),
    );

    // Update payroll run with new total
    await this.prisma.payrollRun.update({
      where: { id: payrollRunId },
      data: {
        totalAmount: totalAmount.toNumber(),
      },
    });

    // Get the updated item
    const updatedItem = await this.prisma.payrollItem.findUnique({
      where: { id: itemId },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Log audit event
    const before = {
      allowances: item.allowances,
      bonuses: item.bonuses,
      transportBonus: item.transportBonus,
      lunchBonus: item.lunchBonus,
      thr: (item as any).thr || 0,
      deductions: item.deductions,
      pph21: item.pph21,
      grossPay: item.grossPay,
      netPay: item.netPay,
    };

    await logAuditEvent(this.auditService, {
      action: 'UPDATE',
      entityType: 'PayrollItem',
      entityId: itemId,
      actorId: userId,
      before,
      after: {
        allowances: updatedItem.allowances,
        bonuses: updatedItem.bonuses,
        transportBonus: updatedItem.transportBonus,
        lunchBonus: updatedItem.lunchBonus,
        thr: (updatedItem as any).thr || 0,
        deductions: updatedItem.deductions,
        pph21: updatedItem.pph21,
        grossPay: updatedItem.grossPay,
        netPay: updatedItem.netPay,
      },
      reason: 'Manual override',
      ipAddress,
      userAgent,
    });

    return updatedItem;
  }

  async recalculateTotal(id: string, companyId: string) {
    const payrollRun = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!payrollRun || payrollRun.companyId !== companyId) {
      throw new NotFoundException('Payroll run not found');
    }

    // Recalculate total from all items
    const totalAmount = payrollRun.items.reduce(
      (sum, item) => sum.add(new Decimal(item.netPay)),
      new Decimal(0),
    );

    // Update payroll run with recalculated total
    return this.prisma.payrollRun.update({
      where: { id },
      data: {
        totalAmount: totalAmount.toNumber(),
      },
      include: {
        items: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  async lockPayrollRun(
    id: string,
    companyId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const payrollRun = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!payrollRun || payrollRun.companyId !== companyId) {
      throw new NotFoundException('Payroll run not found');
    }

    if (payrollRun.status !== PayrollStatus.DRAFT && payrollRun.status !== PayrollStatus.PROCESSING) {
      throw new BadRequestException('Only draft or processing payroll can be locked');
    }

    if (payrollRun.items.length === 0) {
      throw new BadRequestException('Cannot lock payroll run with no items');
    }

    // Recalculate total
    const totalAmount = payrollRun.items.reduce(
      (sum, item) => sum.add(new Decimal(item.netPay)),
      new Decimal(0),
    );

    const before = {
      status: payrollRun.status,
      totalAmount: payrollRun.totalAmount,
    };

    const lockedPayrollRun = await this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: PayrollStatus.LOCKED,
        lockedAt: new Date(),
        lockedBy: userId,
        totalAmount: totalAmount.toNumber(),
      },
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'OVERRIDE',
      entityType: 'PayrollRun',
      entityId: id,
      actorId: userId,
      before,
      after: {
        status: PayrollStatus.LOCKED,
        lockedAt: lockedPayrollRun.lockedAt,
        totalAmount: lockedPayrollRun.totalAmount,
      },
      reason: 'Payroll run locked',
      ipAddress,
      userAgent,
    });

    return lockedPayrollRun;
  }

  async getPayslip(employeeId: string, payrollRunId: string, user: any) {
    const payrollRun = await this.prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
      include: {
        items: {
          where: { employeeId },
          include: {
            employee: {
              include: {
                employment: true,
                company: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                    phone: true,
                    email: true,
                    npwp: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payrollRun) {
      throw new NotFoundException('Payroll run not found');
    }

    if (payrollRun.items.length === 0) {
      throw new NotFoundException('Payslip not found');
    }

    const payrollItem = payrollRun.items[0];

    // Check permissions
    if (user.role === Role.EMPLOYEE && payrollItem.employeeId !== user.employee?.id) {
      throw new ForbiddenException('Can only view your own payslip');
    }

    // Parse breakdown safely - it's stored as JSON string in database
    let parsedBreakdown: any = {};
    if (payrollItem.breakdown) {
      try {
        parsedBreakdown = typeof payrollItem.breakdown === 'string' 
          ? JSON.parse(payrollItem.breakdown) 
          : payrollItem.breakdown;
      } catch (error) {
        // If parsing fails, use empty object
        parsedBreakdown = {};
      }
    }

    return {
      payrollRun: {
        id: payrollRun.id,
        periodYear: payrollRun.periodYear,
        periodMonth: payrollRun.periodMonth,
        status: payrollRun.status,
        runDate: payrollRun.runDate,
      },
      employee: payrollItem.employee,
      payrollItem: {
        ...payrollItem,
        breakdown: parsedBreakdown,
      },
    };
  }

  async getEmployeePayslips(employeeId: string, user: any) {
    // Check permissions
    if (user.role === Role.EMPLOYEE && employeeId !== user.employee?.id) {
      throw new ForbiddenException('Can only view your own payslips');
    }

    const payrollItems = await this.prisma.payrollItem.findMany({
      where: {
        employeeId,
        payrollRun: {
          status: {
            in: [PayrollStatus.LOCKED, PayrollStatus.PAID],
          },
        },
      },
      include: {
        payrollRun: {
          select: {
            id: true,
            periodYear: true,
            periodMonth: true,
            status: true,
            runDate: true,
          },
        },
      },
      orderBy: {
        payrollRun: {
          periodYear: 'desc',
        },
      },
    });

    // Sort by periodYear (desc) then periodMonth (desc)
    payrollItems.sort((a, b) => {
      const yearDiff = b.payrollRun.periodYear - a.payrollRun.periodYear;
      if (yearDiff !== 0) return yearDiff;
      return b.payrollRun.periodMonth - a.payrollRun.periodMonth;
    });

    return payrollItems;
  }
}

