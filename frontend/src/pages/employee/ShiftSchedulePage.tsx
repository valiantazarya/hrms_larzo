import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { shiftScheduleService, ShiftSchedule, WeeklySchedule } from '../../services/api/shiftScheduleService';
import { attendanceService, Attendance } from '../../services/api/attendanceService';
import { leaveService, LeaveRequest } from '../../services/api/leaveService';
import { ToastContainer } from '../../components/common/Toast';
import { DateTime } from 'luxon';

export default function ShiftSchedulePage() {
  const { t, i18n } = useTranslation();
  
  // Helper function to get translated leave type name
  const getLeaveTypeName = (leaveType?: { name?: string; nameId?: string }): string => {
    if (!leaveType) return t('leave.title');
    const currentLang = i18n.language;
    if (currentLang === 'id' && leaveType.nameId) {
      return leaveType.nameId;
    }
    return leaveType.name || t('leave.title');
  };
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

  // Fetch approved leave requests for the selected week
  const { data: leaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['leaveRequests', user?.employee?.id],
    queryFn: () => leaveService.getRequests(user?.employee?.id),
    enabled: !!user?.employee?.id,
  });

  // Filter approved leave requests and create a map by date
  const approvedLeavesByDate = useMemo(() => {
    const map = new Map<string, LeaveRequest[]>();
    leaveRequests
      .filter(req => req.status === 'APPROVED')
      .forEach(leave => {
        const start = DateTime.fromISO(leave.startDate).setZone('Asia/Jakarta').startOf('day');
        const end = DateTime.fromISO(leave.endDate).setZone('Asia/Jakarta').startOf('day');
        let current = start;
        while (current <= end) {
          const dateStr = current.toISODate() || '';
          if (!map.has(dateStr)) {
            map.set(dateStr, []);
          }
          map.get(dateStr)!.push(leave);
          current = current.plus({ days: 1 });
        }
      });
    return map;
  }, [leaveRequests]);

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
      
      // Get approved leave requests for this day
      const leaves = approvedLeavesByDate.get(dateStr) || [];
      
      return {
        date: day,
        dayOfWeek,
        schedule,
        attendance,
        leaves,
      };
    });
  }, [weekStart, schedules, attendanceByDate, approvedLeavesByDate]);

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
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{t('shiftSchedule.mySchedule')}</h2>
      </div>

      {/* Week Navigation */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousWeek}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label={t('common.previous')}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <div className="font-semibold text-lg text-gray-900">
              {weekStart.toFormat('dd MMM')} - {weekEnd.toFormat('dd MMM yyyy')}
            </div>
            <button
              onClick={handleCurrentWeek}
              className="text-sm text-indigo-600 hover:text-indigo-800 mt-1 transition-colors"
            >
              {t('shiftSchedule.currentWeek')}
            </button>
          </div>
          <button
            onClick={handleNextWeek}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label={t('common.next')}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Week Schedule */}
      {schedules.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">{t('shiftSchedule.noSchedules')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="divide-y divide-gray-200">
            {weekDays.map((day) => {
              const dayName = DAYS_OF_WEEK.find(d => d.value === day.dayOfWeek);
              const isToday = day.date.hasSame(DateTime.now().setZone('Asia/Jakarta'), 'day');
              const hasAttendance = !!day.attendance;
              const isCompleted = hasAttendance && day.attendance?.clockIn && day.attendance?.clockOut;
              const isPartial = hasAttendance && day.attendance?.clockIn && !day.attendance?.clockOut;
              const hasLeave = day.leaves.length > 0;
              
              // Determine background color based on schedule, attendance status, or leave
              let bgColor = '';
              const hasSchedule = !!day.schedule;
              if (hasLeave) {
                bgColor = 'bg-blue-50 border-l-4 border-blue-500';
              } else if (hasAttendance) {
                if (isCompleted) {
                  bgColor = 'bg-green-50 border-l-4 border-green-500';
                } else if (isPartial) {
                  bgColor = 'bg-yellow-50 border-l-4 border-yellow-500';
                } else {
                  bgColor = 'bg-gray-50 border-l-4 border-gray-400';
                }
              } else if (hasSchedule) {
                bgColor = 'bg-indigo-50 border-l-4 border-indigo-400';
              } else if (isToday) {
                bgColor = 'bg-gray-50 border-l-4 border-indigo-200';
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
                  className={`p-4 md:p-5 ${bgColor} transition-colors`}
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`font-semibold text-base ${isToday ? 'text-indigo-600' : 'text-gray-900'}`}>
                          {dayName?.label}
                        </div>
                        {isToday && (
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                            {t('common.today')}
                          </span>
                        )}
                        {hasLeave && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            🏖️ {t('manager.onLeave')}
                          </span>
                        )}
                        {hasAttendance && !hasLeave && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
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
                      <div className="text-sm text-gray-600 mt-1.5">
                        {day.date.toFormat('dd MMM yyyy')}
                      </div>
                    </div>
                    <div className="text-left md:text-right min-w-[200px]">
                      {hasLeave ? (
                        <div className="space-y-2">
                          {day.leaves.map((leave) => (
                            <div key={leave.id} className="text-sm">
                              <div className="font-medium text-blue-700">
                                🏖️ {getLeaveTypeName(leave.leaveType)}
                              </div>
                              {leave.reason && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {leave.reason}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : hasAttendance ? (
                        <div className="space-y-1.5">
                          {clockInTime && (
                            <div className="text-sm">
                              <span className="text-gray-600">{t('attendance.clockIn')}: </span>
                              <span className="font-semibold text-green-700">{clockInTime}</span>
                            </div>
                          )}
                          {clockOutTime && (
                            <div className="text-sm">
                              <span className="text-gray-600">{t('attendance.clockOut')}: </span>
                              <span className="font-semibold text-red-700">{clockOutTime}</span>
                            </div>
                          )}
                          {!clockOutTime && clockInTime && (
                            <div className="text-xs text-yellow-600 italic font-medium">
                              {t('attendance.clockedIn')}
                            </div>
                          )}
                          {day.schedule && (
                            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                              <span className="font-medium">{t('shiftSchedule.scheduled')}:</span> {day.schedule.startTime} - {day.schedule.endTime}
                            </div>
                          )}
                        </div>
                      ) : day.schedule ? (
                        <div>
                          <div className="font-semibold text-gray-900 text-base">
                            {day.schedule.startTime} - {day.schedule.endTime}
                          </div>
                          {day.schedule.notes && (
                            <div className="text-xs text-gray-500 mt-1.5">
                              {day.schedule.notes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-sm italic">
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
      )}

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
