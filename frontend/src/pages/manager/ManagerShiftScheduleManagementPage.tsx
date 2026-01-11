import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { shiftScheduleService, ShiftSchedule, CreateShiftScheduleDto, UpdateShiftScheduleDto } from '../../services/api/shiftScheduleService';
import { employeeService, Employee } from '../../services/api/employeeService';
import { leaveService, LeaveRequest } from '../../services/api/leaveService';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { DateTime } from 'luxon';

export default function ManagerShiftScheduleManagementPage() {
  const { t, i18n } = useTranslation();
  
  // Helper function to get translated leave type name
  const getLeaveTypeName = (leaveType?: { name?: string; nameId?: string }): string => {
    if (!leaveType) return t('leave.onLeave');
    const currentLang = i18n.language;
    if (currentLang === 'id' && leaveType.nameId) {
      return leaveType.nameId;
    }
    return leaveType.name || t('leave.onLeave');
  };
  
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
  // Default export week to current week (format: YYYY-Www)
  const [exportWeekStart, setExportWeekStart] = useState<string>(() => {
    const now = DateTime.now().setZone('Asia/Jakarta');
    const weekStart = now.startOf('week');
    // Format as YYYY-Www (ISO week format)
    return `${weekStart.year}-W${String(weekStart.weekNumber).padStart(2, '0')}`;
  });
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<DateTime | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ShiftSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<ShiftSchedule | null>(null);
  const [scheduleType, setScheduleType] = useState<'recurring' | 'specific'>('specific');
  const [selectedDayForModal, setSelectedDayForModal] = useState<{ date: DateTime; schedules: ShiftSchedule[] } | null>(null);
  
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

  // Filter employees based on role:
  // - MANAGER: Only direct reports and themselves (exclude owners)
  // Sort by name (firstName + lastName)
  const employees = useMemo(() => {
    if (!user?.employee?.id) return [];
    const employeeId = user.employee.id;
    
    // Managers can see their direct reports and themselves (exclude owners)
    return allEmployees
      .filter(emp => 
        emp.status === 'ACTIVE' && 
        emp.user?.role !== 'OWNER' &&
        (emp.managerId === employeeId || emp.id === employeeId)
      )
      .sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
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

  // Fetch approved leave requests for all employees in the date range
  const { data: allLeaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['leaveRequests', 'all', startDate, endDate, user?.employee?.id],
    queryFn: async () => {
      if (employees.length === 0) return [];
      const allLeaves: LeaveRequest[] = [];
      for (const emp of employees) {
        try {
          const requests = await leaveService.getRequests(emp.id);
          // Filter approved leaves that overlap with the date range
          const approvedLeaves = requests.filter(req => {
            if (req.status !== 'APPROVED') return false;
            const leaveStart = DateTime.fromISO(req.startDate).setZone('Asia/Jakarta');
            const leaveEnd = DateTime.fromISO(req.endDate).setZone('Asia/Jakarta');
            const rangeStart = DateTime.fromISO(startDate).setZone('Asia/Jakarta');
            const rangeEnd = DateTime.fromISO(endDate).setZone('Asia/Jakarta');
            // Check if leave overlaps with date range
            return leaveStart <= rangeEnd && leaveEnd >= rangeStart;
          });
          allLeaves.push(...approvedLeaves);
        } catch (error) {
          // Skip if no access or error
        }
      }
      return allLeaves;
    },
    enabled: employees.length > 0 && !!startDate && !!endDate,
  });

  // Create a map of approved leaves by employeeId and date
  const approvedLeavesByEmployeeAndDate = useMemo(() => {
    const map = new Map<string, Map<string, LeaveRequest>>(); // employeeId -> date -> LeaveRequest
    allLeaveRequests.forEach(leave => {
      if (leave.status !== 'APPROVED') return;
      const start = DateTime.fromISO(leave.startDate).setZone('Asia/Jakarta').startOf('day');
      const end = DateTime.fromISO(leave.endDate).setZone('Asia/Jakarta').startOf('day');
      let current = start;
      while (current <= end) {
        const dateStr = current.toISODate() || '';
        if (!map.has(leave.employeeId)) {
          map.set(leave.employeeId, new Map());
        }
        const employeeLeaves = map.get(leave.employeeId)!;
        // Only set if not already set (prefer first leave if multiple on same day)
        if (!employeeLeaves.has(dateStr)) {
          employeeLeaves.set(dateStr, leave);
        }
        current = current.plus({ days: 1 });
      }
    });
    return map;
  }, [allLeaveRequests]);

  // Filter schedules based on role:
  // - MANAGER: Only direct reports and themselves
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
    
    const days: Array<{ date: DateTime; isCurrentMonth: boolean; schedules: ShiftSchedule[]; leaves: Map<string, LeaveRequest> }> = [];
    
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
        
        // Check if employee has approved leave on this date - if yes, don't show schedule
        const employeeLeaves = approvedLeavesByEmployeeAndDate.get(s.employeeId);
        if (employeeLeaves?.has(dateStr)) {
          return false; // Hide schedule if leave exists
        }
        
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
      
      // Get leaves for this date (all employees)
      const dayLeaves = new Map<string, LeaveRequest>();
      approvedLeavesByEmployeeAndDate.forEach((employeeLeaves, employeeId) => {
        const leave = employeeLeaves.get(dateStr);
        if (leave) {
          dayLeaves.set(employeeId, leave);
        }
      });
      
      days.push({
        date: current,
        isCurrentMonth: current.month === currentMonth.month,
        schedules: daySchedules,
        leaves: dayLeaves,
      });
      current = current.plus({ days: 1 });
    }
    return days;
  }, [currentMonth, filteredSchedules, approvedLeavesByEmployeeAndDate, user?.role, selectedEmployeeId]);

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
      setShowCreateForm(false);
      setEditingSchedule(null);
      setSelectedDate(null);
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
          <div className="flex gap-2 items-center">
            {/* Week Selector for Export */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                {t('shiftSchedule.exportWeek')}:
              </label>
              <input
                type="week"
                value={exportWeekStart || ''}
                onChange={(e) => setExportWeekStart(e.target.value)}
                className="px-3 py-2 text-sm border rounded-md"
                title={t('shiftSchedule.selectWeekToExport')}
              />
            </div>
            <button
              onClick={async () => {
                if (!exportWeekStart) {
                  toast.showToast(t('shiftSchedule.selectWeekFirst'), 'error');
                  return;
                }

                setIsExportingExcel(true);

                try {
                  // Dynamic import to avoid bundle size issues if packages aren't installed
                  // @ts-ignore - xlsx may not be installed
                  const XLSX = await import('xlsx');
                  
                  if (!XLSX || !XLSX.utils) {
                    throw new Error('xlsx library is not properly loaded. Please install xlsx: npm install xlsx');
                  }
                  
                  // Parse selected week (format: YYYY-Www from HTML week input)
                  // HTML week input returns format like "2024-W01" where 01 is the week number
                  const [year, weekNum] = exportWeekStart.split('-W').map(Number);
                  // Create date from week year and week number
                  const weekStart = DateTime.fromObject({ 
                    weekYear: year, 
                    weekNumber: weekNum 
                  }, { zone: 'Asia/Jakarta' }).startOf('week');
                  const weekEnd = weekStart.endOf('week');
                  const weekStartDate = weekStart.toISODate() || '';
                  const weekEndDate = weekEnd.toISODate() || '';
                  
                  // Fetch schedules for the selected week
                  const weekSchedulesData = await shiftScheduleService.getAll(
                    selectedEmployeeId || undefined,
                    undefined,
                    weekStartDate,
                    weekEndDate
                  );
                  
                  const weekSchedules: ShiftSchedule[] = Array.isArray(weekSchedulesData) 
                    ? weekSchedulesData 
                    : [];
                  
                  // Fetch approved leaves for all employees in the week
                  const allWeekLeaves: LeaveRequest[] = [];
                  for (const emp of employees) {
                    try {
                      const requests = await leaveService.getRequests(emp.id);
                      const approvedLeaves = requests.filter(req => {
                        if (req.status !== 'APPROVED') return false;
                        const leaveStart = DateTime.fromISO(req.startDate).setZone('Asia/Jakarta');
                        const leaveEnd = DateTime.fromISO(req.endDate).setZone('Asia/Jakarta');
                        return leaveStart <= weekEnd && leaveEnd >= weekStart;
                      });
                      allWeekLeaves.push(...approvedLeaves);
                    } catch (error) {
                      // Skip if no access
                    }
                  }
                  
                  // Create leaves map: employeeId -> date -> LeaveRequest
                  const leavesMap = new Map<string, Map<string, LeaveRequest>>();
                  allWeekLeaves.forEach(leave => {
                    const start = DateTime.fromISO(leave.startDate).setZone('Asia/Jakarta').startOf('day');
                    const end = DateTime.fromISO(leave.endDate).setZone('Asia/Jakarta').startOf('day');
                    let current = start;
                    while (current <= end && current <= weekEnd) {
                      if (current >= weekStart) {
                        const dateStr = current.toISODate() || '';
                        if (!leavesMap.has(leave.employeeId)) {
                          leavesMap.set(leave.employeeId, new Map());
                        }
                        const employeeLeaves = leavesMap.get(leave.employeeId)!;
                        if (!employeeLeaves.has(dateStr)) {
                          employeeLeaves.set(dateStr, leave);
                        }
                      }
                      current = current.plus({ days: 1 });
                    }
                  });
                  
                  // Get employees to export (filtered by role)
                  let employeesToExport = employees.filter(emp => emp.status === 'ACTIVE');
                  
                  // Sort employees by name
                  employeesToExport.sort((a, b) => {
                    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                    return nameA.localeCompare(nameB);
                  });
                  
                  // Generate all days in the week (Mon-Sun)
                  const weekDays = Array.from({ length: 7 }, (_, i) => {
                    const day = weekStart.plus({ days: i });
                    return {
                      date: day,
                      dayOfWeek: day.weekday === 7 ? 0 : day.weekday, // Convert to 0=Sun, 1=Mon, ..., 6=Sat
                      dateStr: day.toISODate() || '',
                    };
                  });
                  
                  // Build schedule map: employeeId -> dayOfWeek -> startTimes[]
                  const scheduleMap = new Map<string, Map<number, string[]>>();
                  
                  // Initialize map for all employees
                  employeesToExport.forEach(emp => {
                    scheduleMap.set(emp.id, new Map());
                    // Initialize all days
                    for (let i = 0; i < 7; i++) {
                      scheduleMap.get(emp.id)!.set(i, []);
                    }
                  });
                  
                  // Process schedules and populate the map (only if no leave)
                  weekSchedules.forEach(schedule => {
                    if (!schedule.isActive) return;
                    
                    const empSchedules = scheduleMap.get(schedule.employeeId);
                    if (!empSchedules) return;
                    
                    const employeeLeaves = leavesMap.get(schedule.employeeId);
                    
                    weekDays.forEach(dayInfo => {
                      // Skip if employee has leave on this day
                      if (employeeLeaves?.has(dayInfo.dateStr)) return;
                      
                      let shouldInclude = false;
                      
                      // Date-specific schedule
                      if (schedule.date) {
                        const scheduleDate = DateTime.fromISO(schedule.date).setZone('Asia/Jakarta').toISODate();
                        shouldInclude = scheduleDate === dayInfo.dateStr;
                      }
                      // Recurring schedule
                      else if (schedule.dayOfWeek !== null && schedule.dayOfWeek !== undefined) {
                        shouldInclude = schedule.dayOfWeek === dayInfo.dayOfWeek;
                      }
                      
                      if (shouldInclude) {
                        const existing = empSchedules.get(dayInfo.dayOfWeek) || [];
                        if (!existing.includes(schedule.startTime)) {
                          existing.push(schedule.startTime);
                        }
                        empSchedules.set(dayInfo.dayOfWeek, existing);
                      }
                    });
                  });
                  
                  // Generate Excel data in grid format
                  const excelData: any[] = [];
                  
                  // Header row: No, Name, Division, Mon, Tue, Wed, Thu, Fri, Sat, Sun
                  const headerRow = [
                    'No',
                    t('shiftSchedule.employeeName'),
                    t('shiftSchedule.division'),
                    ...weekDays.map(day => DAYS_OF_WEEK.find(d => d.value === day.dayOfWeek)?.short || '')
                  ];
                  excelData.push(headerRow);
                  
                  // Data rows: one per employee
                  employeesToExport.forEach((employee, index) => {
                    const empSchedules = scheduleMap.get(employee.id) || new Map();
                    const employeeLeaves = leavesMap.get(employee.id);
                    const row = [
                      index + 1, // No
                      `${employee.firstName} ${employee.lastName}`, // Name
                      employee.division || '', // Division
                      // Start times for each day (or leave type if on leave)
                      ...weekDays.map(day => {
                        // Check if employee has leave on this day
                        const leave = employeeLeaves?.get(day.dateStr);
                        if (leave) {
                          return getLeaveTypeName(leave.leaveType);
                        }
                        // Otherwise show schedule start times
                        const startTimes = empSchedules.get(day.dayOfWeek) || [];
                        return startTimes.sort().join(', '); // Sort times and join with comma
                      })
                    ];
                    excelData.push(row);
                  });
                  
                  // Create workbook and worksheet
                  const ws = XLSX.utils.aoa_to_sheet(excelData);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Shift Schedules');
                  
                  // Set column widths
                  ws['!cols'] = [
                    { wch: 5 },  // No
                    { wch: 25 }, // Employee Name
                    { wch: 20 }, // Division
                    { wch: 15 }, // Monday
                    { wch: 15 }, // Tuesday
                    { wch: 15 }, // Wednesday
                    { wch: 15 }, // Thursday
                    { wch: 15 }, // Friday
                    { wch: 15 }, // Saturday
                    { wch: 15 }, // Sunday
                  ];
                  
                  // Export to Excel
                  const fileName = `shift-schedule-${weekStart.toFormat('yyyy-MM-dd')}-to-${weekEnd.toFormat('yyyy-MM-dd')}.xlsx`;
                  XLSX.writeFile(wb, fileName);
                  toast.showToast(t('shiftSchedule.exportCalendar') + ' (Excel)', 'success');
                } catch (error: any) {
                  if (error.message?.includes('Cannot find module')) {
                    toast.showToast('Please install xlsx: npm install xlsx', 'error', 8000);
                  } else {
                    toast.showToast(error.message || t('common.error'), 'error');
                  }
                } finally {
                  setIsExportingExcel(false);
                }
              }}
              className="px-3 py-2 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={t('shiftSchedule.exportAsExcel')}
              disabled={!exportWeekStart || isExportingExcel}
            >
              {isExportingExcel ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>{t('shiftSchedule.exporting')}</span>
                </>
              ) : (
                <>
                  📊 {t('shiftSchedule.exportExcel')}
                </>
              )}
            </button>
          </div>
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
              {emp.id === user?.employee?.id && user?.role === 'MANAGER' && ` (${t('manager.manager')})`}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6 calendar-export-container">
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
              const hasSchedule = day.schedules.length > 0;
              const hasLeave = day.leaves.size > 0;
              return (
                <div
                  key={index}
                  className={`min-h-24 border rounded-lg p-2 transition-colors ${
                    hasLeave
                      ? day.isCurrentMonth 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-blue-100 border-blue-300'
                      : hasSchedule
                        ? day.isCurrentMonth 
                          ? 'bg-indigo-50 border-indigo-200' 
                          : 'bg-indigo-100 border-indigo-300'
                        : day.isCurrentMonth 
                          ? 'bg-white border-gray-200' 
                          : 'bg-gray-50 border-gray-100'
                  } ${isToday ? 'ring-2 ring-indigo-500' : ''} ${(hasSchedule || hasLeave) ? 'h-auto' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-indigo-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                    {day.date.day}
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {/* Show leaves first (they override schedules) */}
                    {Array.from(day.leaves.entries()).map(([employeeId, leave]) => {
                      const employee = employees.find(e => e.id === employeeId);
                      return (
                        <div
                          key={`leave-${leave.id}-${employeeId}`}
                          className="text-xs p-1 rounded border bg-blue-100 text-blue-800 border-blue-300"
                          title={`${employee?.firstName} ${employee?.lastName}: ${getLeaveTypeName(leave.leaveType)}`}
                        >
                          <div className="font-medium truncate">
                            {employee ? `${employee.firstName} ${employee.lastName.charAt(0)}.` : 'N/A'}
                          </div>
                          <div className="text-xs opacity-75">
                            {getLeaveTypeName(leave.leaveType)}
                          </div>
                        </div>
                      );
                    })}
                    {/* Show schedules (only if no leave for that employee) */}
                    {day.schedules.map((schedule) => {
                      // Skip if employee has leave on this day
                      if (day.leaves.has(schedule.employeeId)) return null;
                      
                      const employee = employees.find(e => e.id === schedule.employeeId);
                      const colorClass = employeeColors.get(schedule.employeeId) || 'bg-gray-100 text-gray-800 border-gray-200';
                      const isRecurring = schedule.date === null;
                      return (
                        <div
                          key={schedule.id}
                          className={`text-xs p-1 rounded border ${colorClass} relative`}
                          title={`${employee?.firstName} ${employee?.lastName}: ${schedule.startTime} - ${schedule.endTime}${isRecurring ? ' (Recurring)' : ''}`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingSchedule(schedule);
                            }}
                            className="absolute top-0 right-0 p-0.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-bl"
                            title={t('common.delete')}
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <div 
                            className="cursor-pointer hover:opacity-80 pr-4"
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
                        </div>
                      );
                    })}
                    {day.schedules.length === 0 && day.leaves.size === 0 && (
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

      {/* Create/Edit Form Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => {
          setShowCreateForm(false);
          setEditingSchedule(null);
          setSelectedDate(null);
          setFormData({
            employeeId: selectedEmployeeId || '',
            startTime: lastStartTime,
            endTime: lastEndTime,
            isActive: true,
            notes: '',
          });
        }}
        title={editingSchedule ? t('shiftSchedule.editSchedule') : t('shiftSchedule.createSchedule')}
        size="lg"
      >
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
                disabled={!!editingSchedule || (!!selectedEmployeeId && user?.role === 'MANAGER')}
              >
                <option value="">{t('shiftSchedule.selectEmployee')}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    {emp.id === user?.employee?.id && user?.role === 'MANAGER' && ` (${t('manager.manager')})`}
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
                      onChange={() => {
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
                      onChange={() => {
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
                    startTime: lastStartTime,
                    endTime: lastEndTime,
                    isActive: true,
                    notes: '',
                  });
                }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
      </Modal>

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

      {/* All Schedules Modal */}
      {selectedDayForModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">
                {t('shiftSchedule.allSchedulesFor')} {selectedDayForModal.date.toFormat('dd MMM yyyy')}
              </h3>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-3">
                {selectedDayForModal.schedules.map((schedule) => {
                  const employee = employees.find(e => e.id === schedule.employeeId);
                  const colorClass = employeeColors.get(schedule.employeeId) || 'bg-gray-100 text-gray-800 border-gray-200';
                  const isRecurring = schedule.date === null;
                  return (
                    <div
                      key={schedule.id}
                      className={`p-3 rounded-lg border ${colorClass}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">
                            {employee ? `${employee.firstName} ${employee.lastName}` : 'N/A'}
                            {isRecurring && <span className="ml-2 text-xs opacity-75">🔄 {t('shiftSchedule.recurring')}</span>}
                          </div>
                          <div className="text-sm mt-1">
                            {schedule.startTime} - {schedule.endTime}
                          </div>
                          {schedule.notes && (
                            <div className="text-xs opacity-75 mt-1">
                              {schedule.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              handleEdit(schedule);
                              setSelectedDayForModal(null);
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingSchedule(schedule);
                              setSelectedDayForModal(null);
                            }}
                            className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-6 border-t flex justify-end">
              <Button
                variant="secondary"
                onClick={() => setSelectedDayForModal(null)}
              >
                {t('common.close')}
              </Button>
            </div>
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

    </div>
  );
}