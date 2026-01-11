import { DateTime } from 'luxon';

export interface AttendancePolicy {
  gracePeriodMinutes: number;
  roundingEnabled: boolean;
  roundingInterval: number;
  minimumWorkHours: number;
}

export function calculateWorkDuration(
  clockIn: DateTime,
  clockOut: DateTime,
  policy: AttendancePolicy,
): number {
  let duration = clockOut.diff(clockIn, 'minutes').minutes;

  // Apply rounding
  if (policy.roundingEnabled) {
    duration = roundToNearest(duration, policy.roundingInterval);
  }

  return Math.max(0, duration);
}

export function roundToNearest(value: number, interval: number): number {
  return Math.round(value / interval) * interval;
}

export function isWithinGracePeriod(
  clockIn: DateTime,
  expectedTime: DateTime,
  gracePeriodMinutes: number,
): boolean {
  const diff = clockIn.diff(expectedTime, 'minutes').minutes;
  return diff <= gracePeriodMinutes && diff >= -gracePeriodMinutes;
}

/**
 * Calculate late minutes for clock in
 * Returns 0 if on time or early, otherwise returns minutes late
 */
export function calculateLateMinutes(
  actualTime: DateTime,
  expectedTime: DateTime,
  gracePeriodMinutes: number,
): number {
  const diff = actualTime.diff(expectedTime, 'minutes').minutes;
  // If actual time is after expected time + grace period, calculate late minutes
  if (diff > gracePeriodMinutes) {
    return Math.round(diff - gracePeriodMinutes);
  }
  return 0;
}

/**
 * Calculate early clock out minutes (negative late)
 * Returns 0 if on time or late, otherwise returns minutes early (as negative)
 */
export function calculateEarlyOutMinutes(
  actualTime: DateTime,
  expectedTime: DateTime,
  gracePeriodMinutes: number,
): number {
  const diff = expectedTime.diff(actualTime, 'minutes').minutes;
  // If actual time is before expected time - grace period, calculate early minutes
  if (diff > gracePeriodMinutes) {
    return Math.round(diff - gracePeriodMinutes);
  }
  return 0;
}


