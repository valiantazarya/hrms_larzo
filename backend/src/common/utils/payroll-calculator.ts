import { Decimal } from 'decimal.js';
import { Attendance, OvertimeRequest } from '@prisma/client';
import { EmploymentType, AttendanceStatus, CompensationType } from '../../types/enums';

export interface PayrollCalculationInput {
  employeeId: string;
  periodYear: number;
  periodMonth: number;
  employment: {
    type: EmploymentType;
    baseSalary?: Decimal | null;
    hourlyRate?: Decimal | null;
    dailyRate?: Decimal | null;
  };
  attendances: Attendance[];
  overtimeRequests: OvertimeRequest[];
  allowances: Decimal;
  bonuses: Decimal;
  deductions: Decimal;
  hasBPJS?: boolean;
  bpjsKesehatan?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  bpjsKetenagakerjaan?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  transportBonus?: Decimal | null;
  lunchBonus?: Decimal | null;
  thr?: Decimal | null;
}

export interface PayrollCalculationResult {
  basePay: Decimal;
  overtimePay: Decimal;
  allowances: Decimal;
  bonuses: Decimal;
  transportBonus: Decimal;
  lunchBonus: Decimal;
  thr: Decimal;
  deductions: Decimal;
  bpjsKesehatanEmployee: Decimal;
  bpjsKesehatanEmployer: Decimal;
  bpjsKetenagakerjaanEmployee: Decimal;
  bpjsKetenagakerjaanEmployer: Decimal;
  pph21: Decimal;
  grossPay: Decimal;
  netPay: Decimal;
  breakdown: {
    attendances: number;
    totalHours: number;
    overtimeHours: number;
    [key: string]: any;
  };
}

export function calculatePayrollItem(
  input: PayrollCalculationInput,
): PayrollCalculationResult {
  // Calculate base pay
  let basePay: Decimal;
  let totalDays = 0; // For daily employees
  
  const employmentType = String(input.employment.type);
  if (employmentType === 'MONTHLY') {
    basePay = input.employment.baseSalary || new Decimal(0);
  } else if (employmentType === 'HOURLY') {
    const totalHours = calculateTotalHours(input.attendances);
    basePay = (input.employment.hourlyRate || new Decimal(0)).mul(totalHours);
  } else {
    // Daily - count PRESENT days as working days (1 day per PRESENT status)
    const dailyRate = input.employment.dailyRate ? new Decimal(input.employment.dailyRate) : new Decimal(0);
    
    // If dailyRate is 0 or null, basePay will be 0
    
    // Count PRESENT days as working days
    // PRESENT = 1 full day, HALF_DAY = 0.5 days
    for (const attendance of input.attendances) {
      if (attendance.status === 'PRESENT') {
        totalDays += 1;
      } else if (attendance.status === 'HALF_DAY') {
        totalDays += 0.5;
      }
      // ABSENT, ON_LEAVE, LATE (without PRESENT) don't count
    }
    
    // Calculate base pay: dailyRate × totalDays
    basePay = dailyRate.mul(totalDays);
  }

  // Calculate overtime pay (only payout type)
  let overtimePay = new Decimal(0);
  const payoutOvertime = input.overtimeRequests.filter(
    (ot) => ot.compensationType === 'PAYOUT' && ot.calculatedAmount,
  );
  for (const ot of payoutOvertime) {
    if (ot.calculatedAmount) {
      overtimePay = overtimePay.add(new Decimal(ot.calculatedAmount));
    }
  }

  // Get transport, lunch bonuses, and THR
  const transportBonus = input.transportBonus || new Decimal(0);
  const lunchBonus = input.lunchBonus || new Decimal(0);
  const thr = input.thr || new Decimal(0);

  // Calculate gross pay (including transport, lunch bonuses, and THR)
  const grossPay = basePay
    .add(overtimePay)
    .add(input.allowances)
    .add(input.bonuses)
    .add(transportBonus)
    .add(lunchBonus)
    .add(thr)
    .sub(input.deductions);

  // Calculate BPJS only if employee has BPJS
  let bpjsKesehatan = { employee: new Decimal(0), employer: new Decimal(0) };
  let bpjsKetenagakerjaan = { employee: new Decimal(0), employer: new Decimal(0) };

  if (input.hasBPJS && input.bpjsKesehatan) {
    bpjsKesehatan = calculateBPJSKesehatan(
      basePay,
      input.bpjsKesehatan,
    );
  }

  if (input.hasBPJS && input.bpjsKetenagakerjaan) {
    bpjsKetenagakerjaan = calculateBPJSKetenagakerjaan(
      basePay,
      input.bpjsKetenagakerjaan,
    );
  }

  // Calculate PPh21 (placeholder - manual override)
  const pph21 = new Decimal(0); // TODO: Implement full calculation

  // Calculate net pay
  const netPay = grossPay
    .sub(bpjsKesehatan.employee)
    .sub(bpjsKetenagakerjaan.employee)
    .sub(pph21);

  // Calculate breakdown
  const totalHours = calculateTotalHours(input.attendances);
  const overtimeHours = calculateTotalOvertimeHours(input.overtimeRequests);

  return {
    basePay,
    overtimePay,
    allowances: input.allowances,
    bonuses: input.bonuses,
    transportBonus,
    lunchBonus,
    thr,
    deductions: input.deductions,
    bpjsKesehatanEmployee: bpjsKesehatan.employee,
    bpjsKesehatanEmployer: bpjsKesehatan.employer,
    bpjsKetenagakerjaanEmployee: bpjsKetenagakerjaan.employee,
    bpjsKetenagakerjaanEmployer: bpjsKetenagakerjaan.employer,
    pph21,
    grossPay,
    netPay,
    breakdown: {
      attendances: input.attendances.length,
      totalHours,
      overtimeHours,
      employmentType: input.employment.type,
      ...(String(input.employment.type) === 'DAILY' ? {
        totalDays,
        dailyRate: input.employment.dailyRate?.toString() || '0',
      } : {}),
    },
  };
}

function calculateTotalHours(attendances: Attendance[]): number {
  return attendances.reduce((total, attendance) => {
    // Only count hours for PRESENT or HALF_DAY statuses
    if (attendance.status !== 'PRESENT' && attendance.status !== 'HALF_DAY') {
      return total;
    }
    
    // If workDuration is set, use it
    if (attendance.workDuration !== null && attendance.workDuration !== undefined && attendance.workDuration > 0) {
      return total + attendance.workDuration / 60; // Convert minutes to hours
    }
    
    // If workDuration is missing but we have clockIn and clockOut, calculate it
    if (attendance.clockIn && attendance.clockOut) {
      const clockIn = new Date(attendance.clockIn);
      const clockOut = new Date(attendance.clockOut);
      const diffMs = clockOut.getTime() - clockIn.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      // Only count if positive (clockOut after clockIn)
      if (diffMinutes > 0) {
        return total + diffMinutes / 60; // Convert minutes to hours
      }
    }
    
    return total;
  }, 0);
}

function calculateTotalOvertimeHours(overtimeRequests: OvertimeRequest[]): number {
  return overtimeRequests.reduce((total, ot) => {
    return total + ot.duration / 60; // Convert minutes to hours
  }, 0);
}

export function calculateBPJSKesehatan(
  basePay: Decimal,
  config: { type: 'percentage' | 'fixed'; value: number },
): { employee: Decimal; employer: Decimal } {
  let employeeContribution: Decimal;
  let employerContribution: Decimal;

  if (config.type === 'percentage') {
    // Percentage: calculate as percentage of base pay
    employeeContribution = basePay.mul(config.value).div(100);
    employerContribution = basePay.mul(config.value).div(100);
  } else {
    // Fixed: use exact amount
    employeeContribution = new Decimal(config.value);
    employerContribution = new Decimal(config.value);
  }

  return {
    employee: employeeContribution,
    employer: employerContribution,
  };
}

export function calculateBPJSKetenagakerjaan(
  basePay: Decimal,
  config: { type: 'percentage' | 'fixed'; value: number },
): { employee: Decimal; employer: Decimal } {
  let employeeContribution: Decimal;
  let employerContribution: Decimal;

  if (config.type === 'percentage') {
    // Percentage: calculate as percentage of base pay
    employeeContribution = basePay.mul(config.value).div(100);
    employerContribution = basePay.mul(config.value).div(100);
  } else {
    // Fixed: use exact amount
    employeeContribution = new Decimal(config.value);
    employerContribution = new Decimal(config.value);
  }

  return {
    employee: employeeContribution,
    employer: employerContribution,
  };
}

