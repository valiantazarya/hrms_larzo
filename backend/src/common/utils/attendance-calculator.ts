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


