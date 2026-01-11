import { Decimal } from 'decimal.js';
import { DateTime } from 'luxon';
import { LeaveType, LeaveBalance } from '@prisma/client';

export interface LeaveAccrualResult {
  balance: Decimal;
  accrued: Decimal;
  used: Decimal;
  carriedOver: Decimal;
  expired: Decimal;
  periodYear: number;
  periodMonth: number;
}

export function calculateLeaveAccrual(
  leaveType: LeaveType,
  currentBalance: LeaveBalance | null,
  periodYear: number,
  periodMonth: number,
  previousYearBalance?: Decimal,
): LeaveAccrualResult {
  if (!leaveType.accrualRate) {
    // No accrual for this leave type
    return {
      balance: currentBalance ? new Decimal(currentBalance.balance) : new Decimal(0),
      accrued: new Decimal(0),
      used: currentBalance ? new Decimal(currentBalance.used) : new Decimal(0),
      carriedOver: new Decimal(0),
      expired: new Decimal(0),
      periodYear,
      periodMonth,
    };
  }

  const newAccrued = new Decimal(leaveType.accrualRate);
  // currentBalance is the previous month's balance record
  const previousBalanceDecimal = currentBalance
    ? new Decimal(currentBalance.balance)
    : new Decimal(0);
  const previousUsed = currentBalance ? new Decimal(currentBalance.used) : new Decimal(0);
  
  // Calculate total accrued: previous month's net balance + previous month's used + new accrual
  // This represents the total accrued amount (before current month's used is deducted)
  const totalAccrued = previousBalanceDecimal.add(previousUsed).add(newAccrued);

  // Handle carryover
  let carriedOver = new Decimal(0);
  if (leaveType.carryoverAllowed && periodMonth === 1 && previousYearBalance) {
    // January: carryover from previous year
    const maxCarryover = leaveType.carryoverMax
      ? new Decimal(leaveType.carryoverMax)
      : new Decimal(0);
    carriedOver = Decimal.min(previousYearBalance, maxCarryover);
  }

  // Add carryover to total accrued
  const totalWithCarryover = totalAccrued.add(carriedOver);

  // Handle expiry
  let expired = new Decimal(0);
  if (
    leaveType.expiresAfterMonths &&
    leaveType.expiresAfterMonths > 0 &&
    currentBalance
  ) {
    expired = calculateExpiredBalance(
      currentBalance,
      leaveType.expiresAfterMonths,
      periodYear,
      periodMonth,
    );
  }

  // Subtract expired from total
  const totalAfterExpiry = totalWithCarryover.sub(expired);

  // Apply max balance cap to the total available (after carryover and expiry)
  // The maxBalance represents the maximum total available balance (before current month's used is deducted)
  let cappedTotal = totalAfterExpiry;
  if (leaveType.maxBalance) {
    cappedTotal = Decimal.min(totalAfterExpiry, new Decimal(leaveType.maxBalance));
  }

  // Return the total available balance (before current month's used is deducted)
  // The caller (getLeaveBalance) will subtract the current month's used amount
  const finalBalance = cappedTotal;

  return {
    balance: finalBalance,
    accrued: newAccrued,
    used: previousUsed, // Return previous month's used for reference
    carriedOver,
    expired,
    periodYear,
    periodMonth,
  };
}

function calculateExpiredBalance(
  currentBalance: LeaveBalance,
  expiresAfterMonths: number,
  periodYear: number,
  periodMonth: number,
): Decimal {
  // Calculate if balance should expire based on period
  // This is a simplified version - in production, you'd track when each accrual was earned
  const balanceDate = DateTime.fromObject({
    year: currentBalance.periodYear,
    month: currentBalance.periodMonth,
  });
  const currentDate = DateTime.fromObject({ year: periodYear, month: periodMonth });
  const monthsDiff = currentDate.diff(balanceDate, 'months').months;

  if (monthsDiff >= expiresAfterMonths) {
    return new Decimal(currentBalance.balance);
  }

  return new Decimal(0);
}

