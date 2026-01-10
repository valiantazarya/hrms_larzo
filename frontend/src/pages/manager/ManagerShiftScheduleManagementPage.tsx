import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { shiftScheduleService, ShiftSchedule, CreateShiftScheduleDto, UpdateShiftScheduleDto } from '../../services/api/shiftScheduleService';
import { employeeService, Employee } from '../../services/api/employeeService';
import { Button } from '../../components/common/Button';
import { ToastContainer } from '../../components/common/Toast';
import { DateTime } from 'luxon';

export default function ManagerShiftScheduleManagementPage() {
  const { t } = useTranslation();
  
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
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Load saved view mode preference from localStorage
  const [viewMode, setViewModeState] = useState<'calendar' | 'list'>(() => {
    const saved = localStorage.getItem('managerScheduleManagementViewMode');
    return (saved === 'calendar' || saved === 'list') ? saved : 'calendar';
  });
  
  // Wrapper function to save preference when view mode changes
  const setViewMode = (mode: 'calendar' | 'list') => {
    setViewModeState(mode);
    localStorage.setItem('managerScheduleManagementViewMode', mode);
  };
  const [currentMonth, setCurrentMonth] = useState(() => {
    return DateTime.now().setZone('Asia/Jakarta').startOf('month');
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ShiftSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<ShiftSchedule | null>(null);
  const [scheduleType, setScheduleType] = useState<'recurring' | 'specific'>('specific');
  
  // Get last entered times from localStorage, or use defaults (08:00 - 16:00)
  const getLastTimes = () => {
    const lastStartTime = localStorage.getItem('shiftSchedule_lastStartTime') || '08:00';
    const lastEndTime = localStorage.getItem('shiftSchedule_lastEndTime') || '16:00';
    return { lastStartTime, lastEndTime };
  };

  const { lastStartTime, lastEndTime } = getLastTimes();
  
  const [formData, setFormData] = useState<CreateShiftScheduleDto>({
    employeeId: '',
    startTime: lastStartTime,
    endTime: lastEndTime,
    isActive: true,
    notes: '',
  });

  // Fetch all employees (manager can see their direct reports)
  const { data: allEmployees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll(),
  });

  // Filter to only direct reports and manager themselves (exclude owners)
  const employees = useMemo(() => {
    if (!user?.employee?.id) return [];
    const employeeId = user.employee.id;
    return allEmployees.filter(emp => 
      emp.status === 'ACTIVE' && 
      emp.user?.role !== 'OWNER' &&
      (emp.managerId === employeeId || emp.id === employeeId)
    );
  }, [allEmployees, user?.employee?.id]);

  // Calculate date range for current month
  const monthStart = currentMonth.startOf('month');
  const monthEnd = currentMonth.endOf('month');
  const startDate = monthStart.toISODate() || '';
  const endDate = monthEnd.toISODate() || '';

  // Fetch shift schedules for the current month
  const { data: schedulesData } = useQuery<ShiftSchedule[] | { schedules: ShiftSchedule[] }>({
    queryKey: ['shiftSchedules', selectedEmployeeId, startDate, endDate],
    queryFn: () => shiftScheduleService.getAll(selectedEmployeeId || undefined, undefined, startDate, endDate) as Promise<ShiftSchedule[]>,
    enabled: true,
  });

  // Extract schedules array from response
  const schedules: ShiftSchedule[] = Array.isArray(schedulesData) ? schedulesData : [];

  // Filter schedules to only show direct reports and manager themselves
  const filteredSchedules = schedules.filter(s => 
    employees.some(emp => emp.id === s.employeeId)
  ).filter(s => 
    selectedEmployeeId ? s.employeeId === selectedEmployeeId : true
  );

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    // Get first day of month
    const firstDayOfMonth = currentMonth.startOf('month');
    // Get the Monday of the week containing the first day
    // Luxon weekday: 1=Monday, 7=Sunday
    // startOf('week') already gives us Monday, so we can use that
    const start = firstDayOfMonth.startOf('week');
    
    // Get last day of month
    const lastDayOfMonth = currentMonth.endOf('month');
    // Get the Sunday of the week containing the last day
    // If weekday is 7 (Sunday), no adjustment. Otherwise, go forward (7 - weekday) days
    const end = lastDayOfMonth.weekday === 7
      ? lastDayOfMonth
      : lastDayOfMonth.plus({ days: 7 - lastDayOfMonth.weekday });
    
    const days: Array<{ date: DateTime; isCurrentMonth: boolean; schedules: ShiftSchedule[] }> = [];
    
    let current = start;
    while (current <= end) {
      // Convert Luxon weekday (1=Monday, 7=Sunday) to our system (0=Sunday, 1=Monday, ..., 6=Saturday)
      const dayOfWeek = current.weekday === 7 ? 0 : current.weekday;
      const dateStr = current.toISODate() || '';
      
      // Find schedules for this specific date:
      // 1. Date-specific schedules (date matches)
      // 2. Recurring schedules (dayOfWeek matches and date is null)
      const daySchedules = filteredSchedules.filter(s => {
        if (!s.isActive) return false;
        
        // Date-specific schedule
        if (s.date) {
          const scheduleDate = DateTime.fromISO(s.date).setZone('Asia/Jakarta').toISODate();
          return scheduleDate === dateStr;
        }
        
        // Recurring schedule
        if (s.dayOfWeek !== null && s.dayOfWeek !== undefined) {
          return s.dayOfWeek === dayOfWeek;
        }
        
        return false;
      }).sort((a, b) => {
        // Sort by startTime (HH:mm format sorts correctly as string)
        return a.startTime.localeCompare(b.startTime);
      });
      
      days.push({
        date: current,
        isCurrentMonth: current.month === currentMonth.month,
        schedules: daySchedules,
      });
      current = current.plus({ days: 1 });
    }
    return days;
  }, [currentMonth, filteredSchedules]);

  // Create schedule mutation
  const createMutation = useMutation({
    mutationFn: shiftScheduleService.create,
    onSuccess: async () => {
      toast.showToast(t('shiftSchedule.created'), 'success');
      setShowCreateForm(false);
      resetForm();
      // Invalidate and refetch all shift schedule queries
      await queryClient.invalidateQueries({ queryKey: ['shiftSchedules'] });
      await queryClient.refetchQueries({ queryKey: ['shiftSchedules'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  // Update schedule mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateShiftScheduleDto }) =>
      shiftScheduleService.update(id, data),
    onSuccess: async () => {
      toast.showToast(t('shiftSchedule.updated'), 'success');
      setEditingSchedule(null);
      resetForm();
      // Invalidate and refetch all shift schedule queries
      await queryClient.invalidateQueries({ queryKey: ['shiftSchedules'] });
      await queryClient.refetchQueries({ queryKey: ['shiftSchedules'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  // Delete schedule mutation
  const deleteMutation = useMutation({
    mutationFn: shiftScheduleService.delete,
    onSuccess: async () => {
      toast.showToast(t('shiftSchedule.deleted'), 'success');
      setDeletingSchedule(null);
      // Invalidate and refetch all shift schedule queries
      await queryClient.invalidateQueries({ queryKey: ['shiftSchedules'] });
      await queryClient.refetchQueries({ queryKey: ['shiftSchedules'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const resetForm = () => {
    const { lastStartTime, lastEndTime } = getLastTimes();
    setFormData({
      employeeId: selectedEmployeeId || '',
      startTime: lastStartTime,
      endTime: lastEndTime,
      isActive: true,
      notes: '',
    });
    if (selectedDate) {
      setScheduleType('specific');
      setFormData(prev => ({ ...prev, date: selectedDate.toISODate() || undefined }));
    } else {
      setScheduleType('recurring');
    }
  };

  const handleEdit = (schedule: ShiftSchedule) => {
    setEditingSchedule(schedule);
    setScheduleType(schedule.date ? 'specific' : 'recurring');
    
    // Extract date in YYYY-MM-DD format for the date input field
    let dateValue: string | undefined = undefined;
    if (schedule.date) {
      // If date is in ISO format with time, extract just the date part
      const dateStr = schedule.date;
      if (dateStr.includes('T')) {
        dateValue = dateStr.split('T')[0];
      } else {
        dateValue = dateStr;
      }
    }
    
    setFormData({
      employeeId: schedule.employeeId,
      dayOfWeek: schedule.dayOfWeek ?? undefined,
      date: dateValue,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      isActive: schedule.isActive,
      notes: schedule.notes || '',
    });
    setShowCreateForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save start and end times to localStorage for next time
    localStorage.setItem('shiftSchedule_lastStartTime', formData.startTime);
    localStorage.setItem('shiftSchedule_lastEndTime', formData.endTime);
    
    // Prepare data based on schedule type
    const submitData: CreateShiftScheduleDto | UpdateShiftScheduleDto = {
      startTime: formData.startTime,
      endTime: formData.endTime,
      isActive: formData.isActive,
      notes: formData.notes || undefined,
    };

    if (scheduleType === 'specific') {
      if (!formData.date) {
        toast.showToast(t('shiftSchedule.dateRequired'), 'error');
        return;
      }
      submitData.date = formData.date;
      submitData.dayOfWeek = undefined;
    } else {
      if (formData.dayOfWeek === undefined || formData.dayOfWeek === null) {
        toast.showToast(t('shiftSchedule.dayOfWeekRequired'), 'error');
        return;
      }
      submitData.dayOfWeek = formData.dayOfWeek;
      submitData.date = undefined;
    }

    if (editingSchedule) {
      updateMutation.mutate({
        id: editingSchedule.id,
        data: submitData as UpdateShiftScheduleDto,
      });
    } else {
      createMutation.mutate({
        ...submitData,
        employeeId: formData.employeeId,
      } as CreateShiftScheduleDto);
    }
  };

  const handleDelete = () => {
    if (deletingSchedule) {
      deleteMutation.mutate(deletingSchedule.id);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(currentMonth.minus({ months: 1 }));
  };

  const handleNextMonth = () => {
    setCurrentMonth(currentMonth.plus({ months: 1 }));
  };

  const handleCurrentMonth = () => {
    setCurrentMonth(DateTime.now().setZone('Asia/Jakarta').startOf('month'));
  };

  const handleDayClick = (date: DateTime) => {
    setSelectedDate(date);
    setScheduleType('specific');
    setFormData({
      employeeId: selectedEmployeeId || '',
      date: date.toISODate() || undefined,
      dayOfWeek: undefined,
      startTime: '09:00',
      endTime: '17:00',
      isActive: true,
      notes: '',
    });
    setShowCreateForm(true);
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName} (${employee.employeeCode})` : 'N/A';
  };

  const getDayName = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || t('shiftSchedule.days.monday');
  };

  // Get unique colors for employees
  const employeeColors = useMemo(() => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-red-100 text-red-800 border-red-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-teal-100 text-teal-800 border-teal-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200',
    ];
    const colorMap = new Map<string, string>();
    employees.forEach((emp, index) => {
      colorMap.set(emp.id, colors[index % colors.length]);
    });
    return colorMap;
  }, [employees]);

  // Group schedules by employee
  const schedulesByEmployee = filteredSchedules.reduce((acc, schedule) => {
    if (!acc[schedule.employeeId]) {
      acc[schedule.employeeId] = [];
    }
    acc[schedule.employeeId].push(schedule);
    return acc;
  }, {} as Record<string, ShiftSchedule[]>);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t('shiftSchedule.title')}</h2>
        <div className="flex gap-2">
          <div className="flex border rounded-md">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'calendar'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('shiftSchedule.calendarView')}
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('shiftSchedule.listView')}
            </button>
          </div>
          <Button
          onClick={() => {
            setSelectedDate(null);
            setScheduleType('specific');
            const { lastStartTime, lastEndTime } = getLastTimes();
            setFormData({
              employeeId: selectedEmployeeId || '',
              startTime: lastStartTime,
              endTime: lastEndTime,
              isActive: true,
              notes: '',
            });
            setEditingSchedule(null);
            setShowCreateForm(true);
          }}
          >
            {t('shiftSchedule.createSchedule')}
          </Button>
        </div>
      </div>

      {/* Employee Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <label className="block text-sm font-medium mb-2">
          {t('shiftSchedule.filterByEmployee')}
        </label>
        <select
          value={selectedEmployeeId}
          onChange={(e) => {
            setSelectedEmployeeId(e.target.value);
            resetForm();
          }}
          className="w-full md:w-64 p-2 border rounded-md"
        >
          <option value="">{t('shiftSchedule.allEmployees')}</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.firstName} {emp.lastName} ({emp.employeeCode})
              {emp.id === user?.employee?.id && ` (${t('manager.manager')})`}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePreviousMonth}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label={t('common.previous')}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <div className="text-xl font-semibold">
                {currentMonth.toFormat('MMMM yyyy')}
              </div>
              <button
                onClick={handleCurrentMonth}
                className="text-sm text-indigo-600 hover:text-indigo-800 mt-1"
              >
                {t('shiftSchedule.currentMonth')}
              </button>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label={t('common.next')}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day Headers */}
            {DAYS_OF_WEEK.map((day) => (
              <div key={day.value} className="text-center font-semibold text-gray-700 py-2">
                {day.short}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((day, index) => {
              const isToday = day.date.hasSame(DateTime.now().setZone('Asia/Jakarta'), 'day');
              return (
                <div
                  key={index}
                  className={`min-h-24 border rounded-lg p-2 ${
                    day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                  } ${isToday ? 'ring-2 ring-indigo-500' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-indigo-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                    {day.date.day}
                  </div>
                  <div className="space-y-1">
                    {day.schedules.slice(0, 3).map((schedule) => {
                      const employee = employees.find(e => e.id === schedule.employeeId);
                      const colorClass = employeeColors.get(schedule.employeeId) || 'bg-gray-100 text-gray-800 border-gray-200';
                      const isRecurring = schedule.date === null;
                      return (
                        <div
                          key={schedule.id}
                          className={`text-xs p-1 rounded border ${colorClass}`}
                          title={`${employee?.firstName} ${employee?.lastName}: ${schedule.startTime} - ${schedule.endTime}${isRecurring ? ' (Recurring)' : ''}`}
                        >
                          <div 
                            className="cursor-pointer hover:opacity-80"
                            onClick={() => handleEdit(schedule)}
                          >
                            <div className="font-medium truncate">
                              {employee ? `${employee.firstName} ${employee.lastName.charAt(0)}.` : 'N/A'}
                              {isRecurring && <span className="ml-1 text-xs opacity-75">🔄</span>}
                            </div>
                            <div className="text-xs opacity-75">
                              {schedule.startTime} - {schedule.endTime}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingSchedule(schedule);
                            }}
                            className="mt-1 text-red-600 hover:text-red-800 text-xs w-full text-left"
                            title={t('common.delete')}
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      );
                    })}
                    {day.schedules.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{day.schedules.length - 3} {t('shiftSchedule.more')}
                      </div>
                    )}
                    {day.schedules.length === 0 && (
                      <button
                        onClick={() => handleDayClick(day.date)}
                        className="text-xs text-gray-400 hover:text-indigo-600 w-full text-left"
                      >
                        {t('shiftSchedule.addSchedule')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingSchedule ? t('shiftSchedule.editSchedule') : t('shiftSchedule.createSchedule')}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('shiftSchedule.employee')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full p-2 border rounded-md"
                required
                disabled={!!editingSchedule || !!selectedEmployeeId}
              >
                <option value="">{t('shiftSchedule.selectEmployee')}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    {emp.id === user?.employee?.id && ` (${t('manager.manager')})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Schedule Type Selection */}
            {!editingSchedule && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('shiftSchedule.scheduleType')} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="specific"
                      checked={scheduleType === 'specific'}
                      onChange={(e) => {
                        setScheduleType('specific');
                        setFormData({ ...formData, date: selectedDate?.toISODate() || undefined, dayOfWeek: undefined });
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{t('shiftSchedule.specificDate')}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="recurring"
                      checked={scheduleType === 'recurring'}
                      onChange={(e) => {
                        setScheduleType('recurring');
                        setFormData({ ...formData, dayOfWeek: selectedDate ? (selectedDate.weekday % 7) : 1, date: undefined });
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{t('shiftSchedule.recurringWeekly')}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Date Selection (for specific date schedules) */}
            {scheduleType === 'specific' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('shiftSchedule.date')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date || selectedDate?.toISODate() || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value, dayOfWeek: undefined })}
                  className="w-full p-2 border rounded-md"
                  required
                  disabled={!!editingSchedule && editingSchedule.date !== null}
                />
              </div>
            )}

            {/* Day of Week Selection (for recurring schedules) */}
            {scheduleType === 'recurring' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('shiftSchedule.dayOfWeek')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.dayOfWeek ?? (selectedDate ? (selectedDate.weekday % 7) : 1)}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value), date: undefined })}
                  className="w-full p-2 border rounded-md"
                  required
                  disabled={!!editingSchedule && editingSchedule.dayOfWeek !== null}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('shiftSchedule.startTime')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('shiftSchedule.endTime')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium">{t('shiftSchedule.isActive')}</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('shiftSchedule.notes')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder={t('shiftSchedule.notesPlaceholder')}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t('common.saving')
                  : editingSchedule
                  ? t('common.update')
                  : t('common.create')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingSchedule(null);
                  setSelectedDate(null);
                  setScheduleType('specific');
                  setFormData({
                    employeeId: selectedEmployeeId || '',
                    startTime: '09:00',
                    endTime: '17:00',
                    isActive: true,
                    notes: '',
                  });
                }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Schedules List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('shiftSchedule.schedules')}</h3>
            {filteredSchedules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {selectedEmployeeId
                  ? t('shiftSchedule.noSchedulesForEmployee')
                  : t('shiftSchedule.noSchedules')}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(schedulesByEmployee).map(([employeeId, employeeSchedules]) => (
                  <div key={employeeId} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <h4 className="font-semibold mb-3">{getEmployeeName(employeeId)}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {employeeSchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className={`p-3 rounded-lg border ${
                            schedule.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium">
                                {schedule.date === null && schedule.dayOfWeek !== null && schedule.dayOfWeek !== undefined 
                                  ? getDayName(schedule.dayOfWeek) 
                                  : schedule.date 
                                    ? (() => {
                                        const scheduleDate = DateTime.fromISO(schedule.date).setZone('Asia/Jakarta');
                                        const dayOfWeek = scheduleDate.weekday === 7 ? 0 : scheduleDate.weekday;
                                        return `${getDayName(dayOfWeek)}, ${scheduleDate.toFormat('dd MMM yyyy')}`;
                                      })()
                                    : 'N/A'}
                                {schedule.date === null && <span className="ml-2 text-xs text-gray-500">🔄 {t('shiftSchedule.recurring')}</span>}
                              </div>
                              <div className="text-sm text-gray-600">
                                {schedule.startTime} - {schedule.endTime}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                schedule.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {schedule.isActive ? t('shiftSchedule.active') : t('shiftSchedule.inactive')}
                            </span>
                          </div>
                          {schedule.notes && (
                            <div className="text-xs text-gray-600 mt-2">{schedule.notes}</div>
                          )}
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleEdit(schedule)}
                              className="text-xs text-indigo-600 hover:text-indigo-800"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={() => setDeletingSchedule(schedule)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              {t('common.delete')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('shiftSchedule.deleteSchedule')}</h3>
            <p className="text-gray-600 mb-6">
              {t('shiftSchedule.deleteConfirm', {
                employee: getEmployeeName(deletingSchedule.employeeId),
                day: deletingSchedule.dayOfWeek !== null && deletingSchedule.dayOfWeek !== undefined
                  ? getDayName(deletingSchedule.dayOfWeek)
                  : deletingSchedule.date
                    ? DateTime.fromISO(deletingSchedule.date).setZone('Asia/Jakarta').toFormat('dd MMM yyyy')
                    : '-',
              })}
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setDeletingSchedule(null)}
                disabled={deleteMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
