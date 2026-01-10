import { DateTime } from 'luxon';

/**
 * Normalizes a date string or Date object to a Date at UTC midnight for SQL Server DATE type.
 * This ensures consistent date storage regardless of timezone.
 * 
 * @param dateInput - Date string (YYYY-MM-DD) or Date object
 * @returns Date object at UTC midnight for the correct date
 */
export function normalizeDateForDatabase(dateInput: string | Date): Date {
  let dateStr: string;
  
  if (typeof dateInput === 'string') {
    // Parse as Asia/Jakarta timezone and extract date part
    const dt = DateTime.fromISO(dateInput, { zone: 'Asia/Jakarta' }).startOf('day');
    dateStr = dt.toISODate() || dateInput.split('T')[0]; // Fallback to YYYY-MM-DD
  } else {
    // Convert Date to Asia/Jakarta timezone and extract date part
    const dt = DateTime.fromJSDate(dateInput).setZone('Asia/Jakarta').startOf('day');
    dateStr = dt.toISODate() || dateInput.toISOString().split('T')[0]; // Fallback
  }
  
  // Create Date at UTC midnight for the correct date
  // This ensures SQL Server DATE type stores the correct date (YYYY-MM-DD part)
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Gets today's date normalized for database storage (UTC midnight).
 * 
 * @returns Date object at UTC midnight for today in Asia/Jakarta timezone
 */
export function getTodayDateForDatabase(): Date {
  const now = DateTime.now().setZone('Asia/Jakarta');
  const todayStr = now.startOf('day').toISODate();
  if (!todayStr) {
    throw new Error('Failed to get today\'s date');
  }
  const [year, month, day] = todayStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Converts a date string to a Date object at UTC midnight for database storage.
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object at UTC midnight
 */
export function dateStringToDatabaseDate(dateString: string): Date {
  const dt = DateTime.fromISO(dateString, { zone: 'Asia/Jakarta' }).startOf('day');
  const dateStr = dt.toISODate() || dateString.split('T')[0];
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Gets the day of week (0-6, Sunday-Saturday) from a date in Asia/Jakarta timezone.
 * 
 * @param date - Date object
 * @returns Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export function getDayOfWeek(date: Date): number {
  const dt = DateTime.fromJSDate(date).setZone('Asia/Jakarta');
  const luxonWeekday = dt.weekday; // 1 = Monday, 7 = Sunday
  return luxonWeekday === 7 ? 0 : luxonWeekday; // Convert to 0-6 format (0 = Sunday)
}
