import { Decimal } from 'decimal.js';
import { DateTime } from 'luxon';
import { OvertimeRequest } from '@prisma/client';
import { EmploymentType } from '../../types/enums';

export enum DayType {
  WEEKDAY = 'WEEKDAY',
  WEEKEND = 'WEEKEND',
  HOLIDAY = 'HOLIDAY',
}

export interface OvertimeRule {
  enabled: boolean;
  multiplier: number;
  maxHours: number | null;
  minimumPayment: number;
}

export interface OvertimePolicy {
  rules: {
    [DayType.WEEKDAY]: OvertimeRule;
    [DayType.WEEKEND]: OvertimeRule;
    [DayType.HOLIDAY]: OvertimeRule;
  };
}

export interface EmploymentData {
  type: EmploymentType;
  baseSalary?: Decimal | null;
  hourlyRate?: Decimal | null;
  dailyRate?: Decimal | null;
}

export function calculateOvertimePay(
  request: OvertimeRequest,
  employment: EmploymentData,
  policy: OvertimePolicy,
  isHoliday: boolean,
): Decimal {
  const dayType = determineDayType(DateTime.fromJSDate(request.date), isHoliday);
  const dayPolicy = policy.rules[dayType];

  if (!dayPolicy || !dayPolicy.enabled) {
    return new Decimal(0);
  }

  let baseRate: Decimal;
  if (employment.type === 'MONTHLY') {
    // Convert monthly to hourly (173 = standard working hours per month)
    if (!employment.baseSalary) {
      return new Decimal(0);
    }
    baseRate = new Decimal(employment.baseSalary).div(173);
  } else if (employment.type === 'HOURLY') {
    if (!employment.hourlyRate) {
      return new Decimal(0);
    }
    baseRate = new Decimal(employment.hourlyRate);
  } else {
    // Daily rate - convert to hourly (8 hours per day)
    if (!employment.dailyRate) {
      return new Decimal(0);
    }
    baseRate = new Decimal(employment.dailyRate).div(8);
  }

  const hours = request.duration / 60;
  const multiplier = new Decimal(dayPolicy.multiplier);

  // Apply caps
  if (dayPolicy.maxHours && hours > dayPolicy.maxHours) {
    const cappedHours = dayPolicy.maxHours;
    const overtimePay = baseRate.mul(cappedHours).mul(multiplier);
    return overtimePay;
  }

  const overtimePay = baseRate.mul(hours).mul(multiplier);

  // Apply minimum payment (if any)
  if (dayPolicy.minimumPayment > 0) {
    return Decimal.max(overtimePay, new Decimal(dayPolicy.minimumPayment));
  }

  return overtimePay;
}

export function determineDayType(date: DateTime, isHoliday: boolean): DayType {
  if (isHoliday) return DayType.HOLIDAY;
  const dayOfWeek = date.weekday;
  // weekday: 1 = Monday, 7 = Sunday
  // Working days: Tuesday (2) to Sunday (7)
  // Monday (1) is non-working day, treated as WEEKEND (overtime)
  // Saturday (6) and Sunday (7) are working days but treated as WEEKEND for overtime rates
  if (dayOfWeek === 1 || dayOfWeek === 6 || dayOfWeek === 7) {
    return DayType.WEEKEND;
  }
  // Tuesday (2) to Friday (5) are regular working days
  return DayType.WEEKDAY;
}

