import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { shiftScheduleService, ShiftSchedule, WeeklySchedule } from '../../services/api/shiftScheduleService';
import { attendanceService, Attendance } from '../../services/api/attendanceService';
import { ToastContainer } from '../../components/common/Toast';
import { DateTime } from 'luxon';

export default function ShiftSchedulePage() {
  const { t } = useTranslation();
  const toast = useToast();
  
  // Days of week with translations
  const DAYS_OF_WEEK = useMemo(() => [
    { value: 1, label: t('shiftSchedule.days.monday'), short: t('shiftSchedule.daysShort.monday') },
    { value: 2, label: t('shiftSchedule.days.tuesday'), short: t('shiftSchedule.daysShort.tuesday') },
    { value: 3, label: t('shiftSchedule.days.wednesday'), short: t('shiftSchedule.daysShort.wednesday') },
    { value: 4, label: t('shiftSchedule.days.thursday'), short: t('shiftSchedule.daysShort.thursday') },
    { value: 5, label: t('shiftSchedule.days.friday'), short: t('shiftSchedule.daysShort.friday') },
    { value: 6, label: t('shiftSchedule.days.saturday'), short: t('shiftSchedule.daysShort.saturday') },
    { value: 0, label: t('shiftSchedule.days.sunday'), short: t('shiftSchedule.daysShort.sunday') },
  ], [t]);
  const { user } = useAuth();
  const [selectedWeek, setSelectedWeek] = useState(() => {
    // Default to current week (Monday)
    // Use startOf('day') to ensure we get today's date correctly in Asia/Jakarta timezone
    const now = DateTime.now().setZone('Asia/Jakarta').startOf('day');
    return now.startOf('week').toISODate() || '';
  });

  const weekStart = DateTime.fromISO(selectedWeek).setZone('Asia/Jakarta');
  const weekEnd = weekStart.endOf('week');
  const weekStartDate = weekStart.toISODate() || '';
  const weekEndDate = weekEnd.toISODate() || '';

  // Fetch shift schedules for the selected week using date range
  const { data: schedulesData, isLoading, error } = useQuery<ShiftSchedule[] | WeeklySchedule>({
    queryKey: ['shiftSchedules', user?.employee?.id, weekStartDate, weekEndDate],
    queryFn: () => shiftScheduleService.getAll(user?.employee?.id, undefined, weekStartDate, weekEndDate),
    enabled: !!user?.employee?.id && !!weekStartDate && !!weekEndDate,
  });

  // Fetch attendance records for the selected week
  const { data: attendanceList = [] } = useQuery<Attendance[]>({
    queryKey: ['attendanceList', user?.employee?.id, weekStartDate, weekEndDate],
    queryFn: () => attendanceService.getList(weekStartDate, weekEndDate),
    enabled: !!user?.employee?.id && !!weekStartDate && !!weekEndDate,
  });

  // Create a map of attendance by date for quick lookup
  // The attendance.date field contains the date when the user clocked in/out
  const attendanceByDate = useMemo(() => {
    const map = new Map<string, Attendance>();
    attendanceList.forEach((attendance) => {
      // Parse attendance date (the date when user clocked in/out) as YYYY-MM-DD format
      // Extract date part and normalize to ensure consistent matching
      let dateStr = attendance.date;
      if (dateStr.includes('T')) {
        dateStr = dateStr.split('T')[0]; // Extract date part if it includes time
      }
      // Ensure it's in YYYY-MM-DD format (remove any timezone info)
      if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        dateStr = dateStr.substring(0, 10); // Take only YYYY-MM-DD part
        map.set(dateStr, attendance);
      }
    });
    return map;
  }, [attendanceList]);

  useEffect(() => {
    if (error) {
      const errorMessage = (error as any).response?.data?.message || (error as any).message || t('common.error');
      toast.showToast(errorMessage, 'error', 5000);
    }
  }, [error, toast, t]);

  // Extract schedules array from response (handle both array and WeeklySchedule format)
  const schedules: ShiftSchedule[] = Array.isArray(schedulesData) 
    ? schedulesData 
    : (schedulesData as WeeklySchedule)?.schedules?.[0]?.weekSchedule?.map((item) => item.schedule).filter((s) => s !== null) || [];

  // Generate week days with schedules (handles both recurring and date-specific)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = weekStart.plus({ days: i });
      const dayOfWeek = day.weekday % 7; // Convert to 0-6 (Sunday-Saturday)
      // Normalize date to YYYY-MM-DD format in Asia/Jakarta timezone for consistent matching
      const dateStr = day.startOf('day').toISODate() || '';
      
      // Find schedule for this day:
      // 1. First check for date-specific schedule (date matches)
      // 2. Then check for recurring schedule (dayOfWeek matches and date is null)
      let schedule: ShiftSchedule | null = null;
      
      for (const s of schedules) {
        if (!s.isActive) continue;
        
        // Date-specific schedule
        if (s.date) {
          // Use startOf('day') to ensure we get the correct date in Asia/Jakarta timezone
          const scheduleDate = DateTime.fromISO(s.date).setZone('Asia/Jakarta').startOf('day').toISODate();
          if (scheduleDate === dateStr) {
            schedule = s;
            break; // Date-specific takes priority
          }
        }
        // Recurring schedule (only if no date-specific found)
        else if (s.dayOfWeek !== null && s.dayOfWeek !== undefined && schedule === null) {
          if (s.dayOfWeek === dayOfWeek) {
            schedule = s;
          }
        }
      }

      // Get attendance for this day - match by the attendance date (clock-in/out date)
      // The attendance.date field contains the date when the user clocked in/out
      const attendance = attendanceByDate.get(dateStr);
      
      return {
        date: day,
        dayOfWeek,
        schedule,
        attendance,
      };
    });
  }, [weekStart, schedules, attendanceByDate]);

  const handlePreviousWeek = () => {
    const newWeek = DateTime.fromISO(selectedWeek).minus({ weeks: 1 });
    setSelectedWeek(newWeek.startOf('week').toISODate() || '');
  };

  const handleNextWeek = () => {
    const newWeek = DateTime.fromISO(selectedWeek).plus({ weeks: 1 });
    setSelectedWeek(newWeek.startOf('week').toISODate() || '');
  };

  const handleCurrentWeek = () => {
    // Use startOf('day') to ensure we get today's date correctly in Asia/Jakarta timezone
    const now = DateTime.now().setZone('Asia/Jakarta').startOf('day');
    setSelectedWeek(now.startOf('week').toISODate() || '');
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">{t('shiftSchedule.mySchedule')}</h2>

      {/* Week Navigation */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePreviousWeek}
            className="p-2 rounded-md hover:bg-gray-100"
            aria-label={t('common.previous')}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <div className="font-semibold">
              {weekStart.toFormat('dd MMM')} - {weekEnd.toFormat('dd MMM yyyy')}
            </div>
            <button
              onClick={handleCurrentWeek}
              className="text-sm text-indigo-600 hover:text-indigo-800 mt-1"
            >
              {t('shiftSchedule.currentWeek')}
            </button>
          </div>
          <button
            onClick={handleNextWeek}
            className="p-2 rounded-md hover:bg-gray-100"
            aria-label={t('common.next')}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Week Schedule */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="divide-y divide-gray-200">
          {weekDays.map((day) => {
            const dayName = DAYS_OF_WEEK.find(d => d.value === day.dayOfWeek);
            const isToday = day.date.hasSame(DateTime.now().setZone('Asia/Jakarta'), 'day');
            // Check if there's attendance for this day - attendance.date matches the clock-in/out date
            const hasAttendance = !!day.attendance;
            const isCompleted = hasAttendance && day.attendance?.clockIn && day.attendance?.clockOut;
            const isPartial = hasAttendance && day.attendance?.clockIn && !day.attendance?.clockOut;
            
            // Determine background color based on attendance status
            let bgColor = '';
            if (hasAttendance) {
              if (isCompleted) {
                bgColor = 'bg-green-50 border-l-4 border-green-500';
              } else if (isPartial) {
                bgColor = 'bg-yellow-50 border-l-4 border-yellow-500';
              } else {
                bgColor = 'bg-gray-50 border-l-4 border-gray-400';
              }
            } else if (isToday) {
              bgColor = 'bg-indigo-50';
            }

            // Format clock in/out times
            const formatTime = (timeStr: string | null) => {
              if (!timeStr) return null;
              return DateTime.fromISO(timeStr).setZone('Asia/Jakarta').toFormat('HH:mm');
            };

            const clockInTime = formatTime(day.attendance?.clockIn || null);
            const clockOutTime = formatTime(day.attendance?.clockOut || null);
            
            return (
              <div
                key={day.date.toISODate()}
                className={`p-4 ${bgColor}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`font-semibold ${isToday ? 'text-indigo-600' : ''}`}>
                        {dayName?.label}
                      </div>
                      {isToday && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                          {t('common.today')}
                        </span>
                      )}
                      {hasAttendance && (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          isCompleted 
                            ? 'bg-green-100 text-green-800' 
                            : isPartial 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {isCompleted ? '✓' : isPartial ? '⏱' : '○'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {day.date.toFormat('dd MMM yyyy')}
                    </div>
                  </div>
                  <div className="text-right">
                    {hasAttendance ? (
                      <div className="space-y-1">
                        {/* Show actual clock in/out times */}
                        {clockInTime && (
                          <div className="text-sm">
                            <span className="text-gray-600">{t('attendance.clockIn')}:</span>
                            <span className="font-medium ml-1 text-green-700">{clockInTime}</span>
                          </div>
                        )}
                        {clockOutTime && (
                          <div className="text-sm">
                            <span className="text-gray-600">{t('attendance.clockOut')}:</span>
                            <span className="font-medium ml-1 text-red-700">{clockOutTime}</span>
                          </div>
                        )}
                        {!clockOutTime && clockInTime && (
                          <div className="text-xs text-yellow-600 italic">
                            {t('attendance.clockedIn')}
                          </div>
                        )}
                        {/* Show scheduled time if different from actual */}
                        {day.schedule && (
                          <div className="text-xs text-gray-500 mt-1 pt-1 border-t border-gray-200">
                            {t('shiftSchedule.scheduled')}: {day.schedule.startTime} - {day.schedule.endTime}
                          </div>
                        )}
                      </div>
                    ) : day.schedule ? (
                      <div>
                        <div className="font-medium">
                          {day.schedule.startTime} - {day.schedule.endTime}
                        </div>
                        {day.schedule.notes && (
                          <div className="text-xs text-gray-500 mt-1">
                            {day.schedule.notes}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">
                        {t('shiftSchedule.noSchedule')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {schedules.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {t('shiftSchedule.noSchedules')}
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
