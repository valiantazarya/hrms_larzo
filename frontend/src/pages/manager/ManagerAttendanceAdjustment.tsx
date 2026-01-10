import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { attendanceService, Attendance, AttendanceAdjustment } from '../../services/api/attendanceService';
import { employeeService, Employee } from '../../services/api/employeeService';
import { Button } from '../../components/common/Button';
import { DateTime } from 'luxon';

export default function ManagerAttendanceAdjustment() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState('');
  const [clockIn, setClockIn] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [reason, setReason] = useState('');

  // Fetch team members (direct reports)
  const { data: allEmployees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll(),
  });

  // Fetch user's own employee record
  const { data: userEmployee } = useQuery<Employee>({
    queryKey: ['employee', user?.employee?.id],
    queryFn: () => employeeService.getOne(user!.employee!.id),
    enabled: !!user?.employee?.id,
  });

  // Filter employees based on role:
  // - EMPLOYEE, STOCK_MANAGER and SUPERVISOR: Only themselves
  // - MANAGER: Themselves and direct reports
  const employees = useMemo(() => {
    if (!userEmployee || userEmployee.status !== 'ACTIVE') {
      return [];
    }

    // Employees, Stock Managers and Supervisors can only request for themselves
    if (user?.role === 'EMPLOYEE' || user?.role === 'STOCK_MANAGER' || user?.role === 'SUPERVISOR') {
      return [userEmployee];
    }

    // Managers can request for themselves and their direct reports
    if (user?.role === 'MANAGER') {
      const directReports = allEmployees.filter(
        emp => emp.status === 'ACTIVE' && emp.managerId === userEmployee.id
      );
      // Check if manager is already in the list
      const managerExists = directReports.some(emp => emp.id === userEmployee.id);
      if (!managerExists) {
        return [userEmployee, ...directReports];
      }
      return directReports;
    }

    // Default: only themselves
    return [userEmployee];
  }, [allEmployees, userEmployee, user?.role]);

  // Auto-select employee for employees and supervisors (they can only select themselves)
  const isEmployeeOrSupervisor = user?.role === 'EMPLOYEE' || user?.role === 'SUPERVISOR';
  useEffect(() => {
    if (isEmployeeOrSupervisor && userEmployee && !selectedEmployeeId) {
      setSelectedEmployeeId(userEmployee.id);
    }
  }, [isEmployeeOrSupervisor, userEmployee, selectedEmployeeId]);

  // Fetch attendance records for selected employee (last 30 days)
  // Use startOf('day') to ensure we get today's date correctly in Asia/Jakarta timezone
  const today = DateTime.now().setZone('Asia/Jakarta').startOf('day');
  const endDate = today.toISODate() || '';
  const startDate = today.minus({ days: 30 }).toISODate() || '';

  const { data: attendances = [] } = useQuery<Attendance[]>({
    queryKey: ['attendance', 'list', selectedEmployeeId, startDate, endDate],
    queryFn: () => attendanceService.getList(startDate, endDate, selectedEmployeeId),
    enabled: !!selectedEmployeeId,
  });

  // Filter attendances for selected employee
  const employeeAttendances = attendances.filter(a => a.employeeId === selectedEmployeeId);

  // Fetch adjustment requests for selected employee
  const { data: adjustments = [] } = useQuery<AttendanceAdjustment[]>({
    queryKey: ['attendanceAdjustments', selectedEmployeeId],
    queryFn: () => attendanceService.getAdjustments(selectedEmployeeId),
    enabled: !!selectedEmployeeId,
  });

  const formatForAPI = (localDateTime: string): string | undefined => {
    if (!localDateTime) return undefined;
    const dt = DateTime.fromFormat(localDateTime, "yyyy-MM-dd'T'HH:mm", { zone: 'Asia/Jakarta' });
    return dt.toISO() || undefined;
  };

  const formatForInput = (isoString: string | null): string => {
    if (!isoString) return '';
    const dt = DateTime.fromISO(isoString).setZone('Asia/Jakarta');
    return dt.toFormat("yyyy-MM-dd'T'HH:mm");
  };

  const formatDate = (dateString: string) => {
    return DateTime.fromISO(dateString).setZone('Asia/Jakarta').toFormat('dd/MM/yyyy');
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return DateTime.fromISO(dateString).setZone('Asia/Jakarta').toFormat('dd/MM/yyyy HH:mm');
  };

  const createRequestMutation = useMutation({
    mutationFn: attendanceService.requestAdjustment,
    onSuccess: () => {
      toast.showToast(t('attendance.adjustmentRequestCreated'), 'success');
      setShowRequestForm(false);
      setSelectedAttendanceId('');
      setClockIn('');
      setClockOut('');
      setReason('');
      // Invalidate all attendance-related queries to refresh all pages
      queryClient.invalidateQueries({ queryKey: ['attendanceAdjustments'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceStats'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || t('common.error');
      toast.showToast(errorMessage, 'error', 5000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendanceId || !selectedEmployeeId) {
      toast.showToast(t('attendance.selectAttendanceRequired'), 'error');
      return;
    }

    createRequestMutation.mutate({
      attendanceId: selectedAttendanceId,
      clockIn: formatForAPI(clockIn),
      clockOut: formatForAPI(clockOut),
      reason,
    });
  };

  const handleSelectAttendance = (attendance: Attendance) => {
    setSelectedAttendanceId(attendance.id);
    setClockIn(formatForInput(attendance.clockIn));
    setClockOut(formatForInput(attendance.clockOut));
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      attendanceService.updateAdjustment(id, data),
    onSuccess: () => {
      toast.showToast(t('attendance.adjustmentUpdated'), 'success');
      // Invalidate all attendance-related queries to refresh all pages
      queryClient.invalidateQueries({ queryKey: ['attendanceAdjustments'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceStats'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || t('common.error');
      toast.showToast(errorMessage, 'error', 5000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => attendanceService.deleteAdjustment(id),
    onSuccess: () => {
      toast.showToast(t('attendance.adjustmentDeleted'), 'success');
      // Invalidate all attendance-related queries to refresh all pages
      queryClient.invalidateQueries({ queryKey: ['attendanceAdjustments'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceStats'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || t('common.error');
      toast.showToast(errorMessage, 'error', 5000);
    },
  });

  const handleUpdate = (id: string) => {
    const adjustment = adjustments.find(a => a.id === id);
    if (!adjustment) return;

    const attendance = employeeAttendances.find(a => a.id === adjustment.attendanceId);
    if (attendance) {
      setSelectedAttendanceId(attendance.id);
      setClockIn(formatForInput(adjustment.clockIn));
      setClockOut(formatForInput(adjustment.clockOut));
      setReason(adjustment.reason || '');
      setShowRequestForm(true);
    }

    updateMutation.mutate({
      id,
      data: {
        clockIn: formatForAPI(clockIn),
        clockOut: formatForAPI(clockOut),
        reason,
      },
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('attendance.confirmDeleteAdjustment'))) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">{t('attendance.adjustmentRequests')}</h1>
        <p className="text-gray-600 text-sm">{t('attendance.adjustmentDescription')}</p>
      </div>

      {/* Employee Selection - Hidden for employees and supervisors (they can only select themselves) */}
      {!isEmployeeOrSupervisor && (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <label className="block text-sm font-medium mb-2">
            {t('attendance.selectEmployee')}
          </label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => {
              setSelectedEmployeeId(e.target.value);
              setShowRequestForm(false);
              setSelectedAttendanceId('');
              setClockIn('');
              setClockOut('');
              setReason('');
            }}
            className="w-full p-2 border rounded-md"
          >
            <option value="">{t('attendance.selectEmployee')}</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} ({emp.employeeCode})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Request Form */}
      {showRequestForm && selectedEmployeeId && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t('attendance.requestAdjustment')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('attendance.selectAttendance')}
              </label>
              <select
                value={selectedAttendanceId}
                onChange={(e) => {
                  const attendance = employeeAttendances.find(a => a.id === e.target.value);
                  if (attendance) {
                    handleSelectAttendance(attendance);
                  } else {
                    setSelectedAttendanceId(e.target.value);
                    setClockIn('');
                    setClockOut('');
                  }
                }}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">{t('attendance.selectAttendance')}</option>
                {employeeAttendances.map((att) => (
                  <option key={att.id} value={att.id}>
                    {formatDate(att.date)} - {att.clockIn ? formatDateTime(att.clockIn) : t('attendance.noClockIn')}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('attendance.clockIn')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={clockIn}
                  onChange={(e) => setClockIn(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('attendance.clockOut')}
                </label>
                <input
                  type="datetime-local"
                  value={clockOut}
                  onChange={(e) => setClockOut(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('attendance.reason')} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2 border rounded-md"
                rows={3}
                required
                placeholder={t('attendance.reasonPlaceholder')}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowRequestForm(false);
                  setSelectedAttendanceId('');
                  setClockIn('');
                  setClockOut('');
                  setReason('');
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createRequestMutation.isPending}>
                {createRequestMutation.isPending ? t('common.saving') : t('common.submit')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Adjustment Requests List */}
      {selectedEmployeeId && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t('attendance.adjustmentRequests')}</h2>
              <Button
                onClick={() => {
                  setShowRequestForm(true);
                  setSelectedAttendanceId('');
                  setClockIn('');
                  setClockOut('');
                  setReason('');
                }}
                disabled={!selectedEmployeeId}
              >
                {t('attendance.requestAdjustment')}
              </Button>
            </div>
          </div>

          {adjustments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {t('attendance.noAdjustments')}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {adjustments.map((adjustment) => {
                const attendance = employeeAttendances.find(a => a.id === adjustment.attendanceId);
                return (
                  <div key={adjustment.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(adjustment.status)}`}>
                            {adjustment.status}
                          </span>
                          <span className="text-sm text-gray-600">
                            {attendance ? formatDate(attendance.date) : '-'}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-gray-600">{t('attendance.clockIn')}:</span>
                            <span className="ml-2 font-medium">
                              {adjustment.clockIn ? formatDateTime(adjustment.clockIn) : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">{t('attendance.clockOut')}:</span>
                            <span className="ml-2 font-medium">
                              {adjustment.clockOut ? formatDateTime(adjustment.clockOut) : '-'}
                            </span>
                          </div>
                          {adjustment.reason && (
                            <div>
                              <span className="text-gray-600">{t('attendance.reason')}:</span>
                              <span className="ml-2">{adjustment.reason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {adjustment.status === 'PENDING' && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleUpdate(adjustment.id)}
                              disabled={updateMutation.isPending}
                            >
                              {t('common.edit')}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(adjustment.id)}
                              disabled={deleteMutation.isPending}
                            >
                              {t('common.delete')}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!selectedEmployeeId && (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
          {t('attendance.selectEmployeeToViewAdjustments')}
        </div>
      )}
    </div>
  );
}
