import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DateTime } from 'luxon';
import { Role } from '../types/enums';
import { Decimal } from 'decimal.js';

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaService) {}

  async getAttendanceSummary(
    companyId: string,
    startDate: Date,
    endDate: Date,
    employeeId?: string,
  ) {
    const where: any = {
      employee: {
        companyId,
        ...(employeeId && { id: employeeId }),
      },
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    const attendances = await this.prisma.attendance.findMany({
      where,
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
      orderBy: { date: 'desc' },
    });

    const summary = {
      totalDays: attendances.length,
      presentDays: attendances.filter(a => a.status === 'PRESENT').length,
      absentDays: attendances.filter(a => a.status === 'ABSENT').length,
      lateDays: attendances.filter(a => a.status === 'LATE').length,
      onLeaveDays: attendances.filter(a => a.status === 'ON_LEAVE').length,
      totalHours: attendances.reduce((sum, a) => sum + (a.workDuration || 0), 0) / 60,
      attendances,
    };

    return summary;
  }

  async getLeaveUsage(
    companyId: string,
    startDate: Date,
    endDate: Date,
    employeeId?: string,
  ) {
    const where: any = {
      employee: {
        companyId,
        ...(employeeId && { id: employeeId }),
      },
      startDate: {
        lte: endDate,
      },
      endDate: {
        gte: startDate,
      },
      status: 'APPROVED',
    };

    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where,
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    const summary = {
      totalRequests: leaveRequests.length,
      totalDays: leaveRequests.reduce((sum, lr) => sum + lr.days.toNumber(), 0),
      byLeaveType: leaveRequests.reduce((acc, lr) => {
        const type = lr.leaveType.name;
        if (!acc[type]) {
          acc[type] = { count: 0, days: 0 };
        }
        acc[type].count += 1;
        acc[type].days += lr.days.toNumber();
        return acc;
      }, {} as Record<string, { count: number; days: number }>),
      leaveRequests,
    };

    return summary;
  }

  async getOvertimeCost(
    companyId: string,
    startDate: Date,
    endDate: Date,
    employeeId?: string,
  ) {
    const where: any = {
      employee: {
        companyId,
        ...(employeeId && { id: employeeId }),
      },
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: 'APPROVED',
      compensationType: 'PAYOUT',
    };

    const overtimeRequests = await this.prisma.overtimeRequest.findMany({
      where,
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
      orderBy: { date: 'desc' },
    });

    const totalCost = overtimeRequests.reduce(
      (sum, ot) => sum.add(ot.calculatedAmount ? new Decimal(ot.calculatedAmount) : new Decimal(0)),
      new Decimal(0),
    );

    const totalHours = overtimeRequests.reduce(
      (sum, ot) => sum + ot.duration / 60,
      0,
    );

    return {
      totalRequests: overtimeRequests.length,
      totalHours,
      totalCost: totalCost.toNumber(),
      overtimeRequests,
    };
  }

  async getPayrollTotals(
    companyId: string,
    periodYear?: number,
    periodMonth?: number,
  ) {
    const where: any = {
      companyId,
      ...(periodYear && periodMonth && {
        periodYear,
        periodMonth,
      }),
    };

    const payrollRuns = await this.prisma.payrollRun.findMany({
      where,
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

    const totals = payrollRuns.reduce(
      (acc, run) => {
        const runTotal = run.items.reduce(
          (sum, item) => ({
            grossPay: sum.grossPay.add(new Decimal(item.grossPay)),
            netPay: sum.netPay.add(new Decimal(item.netPay)),
            bpjsEmployee: sum.bpjsEmployee
              .add(new Decimal(item.bpjsKesehatanEmployee))
              .add(new Decimal(item.bpjsKetenagakerjaanEmployee)),
            bpjsEmployer: sum.bpjsEmployer
              .add(new Decimal(item.bpjsKesehatanEmployer))
              .add(new Decimal(item.bpjsKetenagakerjaanEmployer)),
            pph21: sum.pph21.add(new Decimal(item.pph21)),
          }),
          {
            grossPay: new Decimal(0),
            netPay: new Decimal(0),
            bpjsEmployee: new Decimal(0),
            bpjsEmployer: new Decimal(0),
            pph21: new Decimal(0),
          },
        );

        return {
          grossPay: acc.grossPay.add(runTotal.grossPay),
          netPay: acc.netPay.add(runTotal.netPay),
          bpjsEmployee: acc.bpjsEmployee.add(runTotal.bpjsEmployee),
          bpjsEmployer: acc.bpjsEmployer.add(runTotal.bpjsEmployer),
          pph21: acc.pph21.add(runTotal.pph21),
        };
      },
      {
        grossPay: new Decimal(0),
        netPay: new Decimal(0),
        bpjsEmployee: new Decimal(0),
        bpjsEmployer: new Decimal(0),
        pph21: new Decimal(0),
      },
    );

    // Flatten all payroll items for employee breakdown
    const allItems = payrollRuns.flatMap(run => 
      run.items.map(item => ({
        ...item,
        periodYear: run.periodYear,
        periodMonth: run.periodMonth,
        payrollRunStatus: run.status,
      }))
    );

    return {
      payrollRuns: payrollRuns.map(run => ({
        id: run.id,
        periodYear: run.periodYear,
        periodMonth: run.periodMonth,
        status: run.status,
        totalAmount: run.totalAmount,
        itemCount: run.items.length,
      })),
      totals: {
        grossPay: totals.grossPay.toNumber(),
        netPay: totals.netPay.toNumber(),
        bpjsEmployee: totals.bpjsEmployee.toNumber(),
        bpjsEmployer: totals.bpjsEmployer.toNumber(),
        pph21: totals.pph21.toNumber(),
      },
      items: allItems,
    };
  }
}

