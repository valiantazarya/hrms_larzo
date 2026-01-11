import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../hooks/useToast';
import { useOnline } from '../../hooks/useOnline';
import { attendanceService, AttendanceAdjustment, Attendance } from '../../services/api/attendanceService';
import { leaveService, LeaveRequest } from '../../services/api/leaveService';
import { overtimeService, OvertimeRequest } from '../../services/api/overtimeService';
import { employeeService, Employee } from '../../services/api/employeeService';
import { Button } from '../../components/common/Button';
import { ToastContainer } from '../../components/common/Toast';
import { Pagination } from '../../components/common/Pagination';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';
import { DateTime } from 'luxon';
import ManagerPayslipsPage from './ManagerPayslipsPage';
import ManagerShiftSchedulePage from './ManagerShiftSchedulePage';
import ManagerShiftScheduleManagementPage from './ManagerShiftScheduleManagementPage';
import ManagerAttendanceAdjustment from './ManagerAttendanceAdjustment';
import { ChangePassword } from '../../components/common/ChangePassword';

function ApprovalInbox() {
  const { t, i18n } = useTranslation();
  
  // Helper function to get translated leave type name
  const getLeaveTypeName = (leaveType?: { name?: string; nameId?: string }): string => {
    if (!leaveType) return 'N/A';
    const currentLang = i18n.language;
    if (currentLang === 'id' && leaveType.nameId) {
      return leaveType.nameId;
    }
    return leaveType.name || 'N/A';
  };
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave' | 'overtime'>('leave');
  const [rejectReason, setRejectReason] = useState<{ id: string; type: string } | null>(null);

  // Fetch direct reports (backend already filters by manager)
  const { data: allEmployees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll(),
  });

  // Filter out inactive employees
  const employees = allEmployees.filter(emp => emp.status === 'ACTIVE');

  // Get all pending requests from direct reports
  const { data: attendanceAdjustments = [] } = useQuery<AttendanceAdjustment[]>({
    queryKey: ['attendanceAdjustments', 'pending'],
    queryFn: async () => {
      if (employees.length === 0) return [];
      const allAdjustments: AttendanceAdjustment[] = [];
      for (const emp of employees) {
        try {
          const adjustments = await attendanceService.getAdjustments(emp.id);
          allAdjustments.push(...adjustments.filter(a => a.status === 'PENDING'));
        } catch (error) {
          // Skip if no access
        }
      }
      return allAdjustments;
    },
    enabled: employees.length > 0,
  });

  const { data: leaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['leaveRequests', 'pending'],
    queryFn: async () => {
      if (employees.length === 0) return [];
      const allRequests: LeaveRequest[] = [];
      for (const emp of employees) {
        try {
          const requests = await leaveService.getRequests(emp.id);
          allRequests.push(...requests.filter(r => r.status === 'PENDING'));
        } catch (error) {
          // Skip if no access
        }
      }
      return allRequests;
    },
    enabled: employees.length > 0,
  });

  const { data: overtimeRequests = [] } = useQuery<OvertimeRequest[]>({
    queryKey: ['overtimeRequests', 'pending'],
    queryFn: async () => {
      if (employees.length === 0) return [];
      const allRequests: OvertimeRequest[] = [];
      for (const emp of employees) {
        try {
          const requests = await overtimeService.getRequests(emp.id);
          allRequests.push(...requests.filter(r => r.status === 'PENDING'));
        } catch (error) {
          // Skip if no access
        }
      }
      return allRequests;
    },
    enabled: employees.length > 0,
  });

  const approveAttendanceMutation = useMutation({
    mutationFn: attendanceService.approveAdjustment,
    onSuccess: () => {
      toast.showToast(t('manager.approved'), 'success');
      queryClient.invalidateQueries({ queryKey: ['attendanceAdjustments'] });
      queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const rejectAttendanceMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      attendanceService.rejectAdjustment(id, reason),
    onSuccess: () => {
      toast.showToast(t('manager.rejected'), 'success');
      queryClient.invalidateQueries({ queryKey: ['attendanceAdjustments'] });
      queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] });
      setRejectReason(null);
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const approveLeaveMutation = useMutation({
    mutationFn: leaveService.approveRequest,
    onSuccess: () => {
      toast.showToast(t('manager.approved'), 'success');
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
      queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      leaveService.rejectRequest(id, reason),
    onSuccess: () => {
      toast.showToast(t('manager.rejected'), 'success');
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] });
      setRejectReason(null);
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const approveOvertimeMutation = useMutation({
    mutationFn: overtimeService.approveRequest,
    onSuccess: () => {
      toast.showToast(t('manager.approved'), 'success');
      queryClient.invalidateQueries({ queryKey: ['overtimeRequests'] });
      queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const rejectOvertimeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      overtimeService.rejectRequest(id, reason),
    onSuccess: () => {
      toast.showToast(t('manager.rejected'), 'success');
      queryClient.invalidateQueries({ queryKey: ['overtimeRequests'] });
      queryClient.invalidateQueries({ queryKey: ['pendingApprovalsCount'] });
      setRejectReason(null);
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : employeeId;
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">{t('manager.approvalInbox')}</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'attendance'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600'
          }`}
        >
          {t('manager.attendanceAdjustments')} ({attendanceAdjustments.length})
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'leave'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600'
          }`}
        >
          {t('manager.leaveRequests')} ({leaveRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('overtime')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'overtime'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600'
          }`}
        >
          {t('manager.overtimeRequests')} ({overtimeRequests.length})
        </button>
      </div>

      {/* Attendance Adjustments */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {attendanceAdjustments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('manager.noPendingRequests')}
            </div>
          ) : (
            attendanceAdjustments.map((adj) => (
              <div key={adj.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="font-semibold">{getEmployeeName(adj.employeeId)}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {t('manager.requestedOn')}: {new Date(adj.requestedAt).toLocaleDateString()}
                    </div>
                    {(adj.clockIn || adj.clockOut) && (
                      <div className="mt-2 text-sm">
                        <div className="font-medium mb-1">{t('manager.adjustmentDetails')}:</div>
                        {adj.clockIn && (
                          <div className="text-gray-600">
                            {t('attendance.clockIn')}: {new Date(adj.clockIn).toLocaleString()}
                          </div>
                        )}
                        {adj.clockOut && (
                          <div className="text-gray-600">
                            {t('attendance.clockOut')}: {new Date(adj.clockOut).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-sm mt-2">
                      <span className="font-medium">{t('manager.reason')}:</span> {adj.reason}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => approveAttendanceMutation.mutate(adj.id)}
                    disabled={approveAttendanceMutation.isPending}
                  >
                    {approveAttendanceMutation.isPending ? t('common.loading') : t('common.approve')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setRejectReason({ id: adj.id, type: 'attendance' })}
                    disabled={rejectAttendanceMutation.isPending}
                  >
                    {t('common.reject')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Leave Requests */}
      {activeTab === 'leave' && (
        <div className="space-y-4">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('manager.noPendingRequests')}
            </div>
          ) : (
            leaveRequests.map((request) => (
              <div key={request.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold">{getEmployeeName(request.employeeId)}</div>
                    <div className="text-sm text-gray-600">
                      {request.leaveType?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(request.startDate).toLocaleDateString()} -{' '}
                      {new Date(request.endDate).toLocaleDateString()} ({request.days} {t('leave.days')})
                    </div>
                    {request.reason && (
                      <div className="text-sm mt-2">{request.reason}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => approveLeaveMutation.mutate(request.id)}
                    disabled={approveLeaveMutation.isPending}
                  >
                    {t('common.approve')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setRejectReason({ id: request.id, type: 'leave' })}
                    disabled={rejectLeaveMutation.isPending}
                  >
                    {t('common.reject')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Overtime Requests */}
      {activeTab === 'overtime' && (
        <div className="space-y-4">
          {overtimeRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('manager.noPendingRequests')}
            </div>
          ) : (
            overtimeRequests.map((request) => (
              <div key={request.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold">{getEmployeeName(request.employeeId)}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(request.date).toLocaleDateString()} - {request.duration} {t('overtime.minutes')}
                    </div>
                    {(request.calculatedAmount || request.calculatedPay) && (
                      <div className="text-sm text-green-600 font-medium mt-1">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                        }).format(request.calculatedAmount || request.calculatedPay || 0)}
                      </div>
                    )}
                    <div className="text-sm mt-2">{request.reason}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => approveOvertimeMutation.mutate(request.id)}
                    disabled={approveOvertimeMutation.isPending}
                  >
                    {t('common.approve')}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setRejectReason({ id: request.id, type: 'overtime' })}
                    disabled={rejectOvertimeMutation.isPending}
                  >
                    {t('common.reject')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectReason && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">{t('manager.rejectionReason')}</h3>
            <textarea
              id="rejection-reason"
              className="w-full p-2 border rounded-md mb-4"
              rows={4}
              placeholder={t('manager.rejectionReason')}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setRejectReason(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const reason = (document.getElementById('rejection-reason') as HTMLTextAreaElement)?.value;
                  if (reason && reason.trim()) {
                    if (rejectReason.type === 'attendance') {
                      rejectAttendanceMutation.mutate({ id: rejectReason.id, reason: reason.trim() });
                    } else if (rejectReason.type === 'leave') {
                      rejectLeaveMutation.mutate({ id: rejectReason.id, reason: reason.trim() });
                    } else if (rejectReason.type === 'overtime') {
                      rejectOvertimeMutation.mutate({ id: rejectReason.id, reason: reason.trim() });
                    }
                  } else {
                    toast.showToast(t('manager.rejectionReasonRequired'), 'error');
                  }
                }}
                disabled={
                  rejectAttendanceMutation.isPending ||
                  rejectLeaveMutation.isPending ||
                  rejectOvertimeMutation.isPending
                }
              >
                {t('common.reject')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamOverview() {
  const { t } = useTranslation();
  const { data: allEmployees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll(),
  });

  // Filter out inactive employees
  const employees = allEmployees.filter(emp => emp.status === 'ACTIVE');

  // Get attendance stats for each employee
  const { data: attendanceStats = {} } = useQuery<Record<string, { present: number; absent: number; onLeave: number }>>({
    queryKey: ['attendanceStats', employees.map(e => e.id).join(',')],
    queryFn: async () => {
      const stats: Record<string, { present: number; absent: number; onLeave: number }> = {};
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      for (const emp of employees) {
        try {
          // For managers, use the team endpoint with employeeId to get each employee's attendance
          const attendances = await attendanceService.getList(
            startOfMonth.toISOString().split('T')[0],
            endOfMonth.toISOString().split('T')[0],
            emp.id
          );
          // The backend now returns only this employee's attendance, but filter for safety
          const empAttendances = attendances.filter(a => a.employeeId === emp.id);
          stats[emp.id] = {
            present: empAttendances.filter(a => a.status === 'PRESENT').length,
            absent: empAttendances.filter(a => a.status === 'ABSENT').length,
            onLeave: empAttendances.filter(a => a.status === 'ON_LEAVE').length,
          };
        } catch (error) {
          // If error, set default stats
          stats[emp.id] = { present: 0, absent: 0, onLeave: 0 };
        }
      }
      return stats;
    },
    enabled: employees.length > 0,
  });

  // Get pending requests count for each employee
  const { data: pendingCounts = {} } = useQuery<Record<string, { leave: number; overtime: number }>>({
    queryKey: ['pendingCounts', employees.map(e => e.id).join(',')],
    queryFn: async () => {
      const counts: Record<string, { leave: number; overtime: number }> = {};
      for (const emp of employees) {
        try {
          const leaveRequests = await leaveService.getRequests(emp.id);
          const overtimeRequests = await overtimeService.getRequests(emp.id);
          counts[emp.id] = {
            leave: leaveRequests.filter(r => r.status === 'PENDING').length,
            overtime: overtimeRequests.filter(r => r.status === 'PENDING').length,
          };
        } catch (error) {
          counts[emp.id] = { leave: 0, overtime: 0 };
        }
      }
      return counts;
    },
    enabled: employees.length > 0,
  });

  if (employees.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">{t('manager.teamOverview')}</h2>
        <div className="text-center py-8 text-gray-500">
          {t('manager.noTeamMembers')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">{t('manager.teamOverview')}</h2>
      <div className="mb-4 text-sm text-gray-600">
        {t('manager.totalTeamMembers')}: {employees.length}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => {
          const stats = attendanceStats[emp.id] || { present: 0, absent: 0, onLeave: 0 };
          const pending = pendingCounts[emp.id] || { leave: 0, overtime: 0 };
          return (
            <div key={emp.id} className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold text-lg">{emp.firstName} {emp.lastName}</div>
                  <div className="text-sm text-gray-600">{emp.employeeCode}</div>
                  <div className="text-sm text-gray-500 mt-1">{emp.user?.email}</div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    emp.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {emp.status}
                </span>
              </div>

              {/* Attendance Stats */}
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium mb-2">{t('manager.attendanceThisMonth')}</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="text-green-600 font-semibold">{stats.present}</div>
                    <div className="text-gray-500">{t('manager.present')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-600 font-semibold">{stats.absent}</div>
                    <div className="text-gray-500">{t('manager.absent')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-600 font-semibold">{stats.onLeave}</div>
                    <div className="text-gray-500">{t('manager.onLeave')}</div>
                  </div>
                </div>
              </div>

              {/* Pending Requests */}
              {(pending.leave > 0 || pending.overtime > 0) && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-sm font-medium mb-2 text-orange-600">
                    {t('manager.pendingRequests')}
                  </div>
                  <div className="flex gap-3 text-xs">
                    {pending.leave > 0 && (
                      <div>
                        <span className="font-semibold">{pending.leave}</span> {t('manager.leaveRequests')}
                      </div>
                    )}
                    {pending.overtime > 0 && (
                      <div>
                        <span className="font-semibold">{pending.overtime}</span> {t('manager.overtimeRequests')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Employment Info */}
              {emp.employment && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-gray-500">
                    {t('manager.employmentType')}: <span className="font-medium">{emp.employment.type}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ManagerAttendance({ onNavigateToAdjustment }: { onNavigateToAdjustment: () => void }) {
  const { t } = useTranslation();
  const isOnline = useOnline();
  const toast = useToast();
  const [status, setStatus] = useState({
    clockedIn: false,
  });

  const queryClient = useQueryClient();

  // Fetch today's attendance
  const { data: todayAttendance, error: attendanceError } = useQuery<Attendance | null>({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceService.getToday(),
  });

  // Handle query errors
  useEffect(() => {
    if (attendanceError) {
      const errorMessage = (attendanceError as any).response?.data?.message || (attendanceError as any).message || t('attendance.loadError');
      toast.showToast(errorMessage, 'error');
    }
  }, [attendanceError, toast, t]);

  // Update status from API data
  useEffect(() => {
    if (todayAttendance) {
      setStatus({
        clockedIn: !!todayAttendance.clockIn && !todayAttendance.clockOut,
      });
    } else {
      setStatus({
        clockedIn: false,
      });
    }
  }, [todayAttendance]);

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    });
  };

  const clockInMutation = useMutation({
    mutationFn: ({ latitude, longitude }: { latitude?: number; longitude?: number }) =>
      attendanceService.clockIn(undefined, latitude, longitude),
    onSuccess: () => {
      toast.showToast(t('attendance.clockedIn'), 'success');
      queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
    },
    onError: (error: any) => {
      // Extract error message from various possible locations
      const errorMessage = 
        error.response?.data?.message || 
        error.response?.data?.error || 
        (Array.isArray(error.response?.data?.errors) ? error.response?.data?.errors[0] : null) ||
        error.message || 
        '';
      
      // Check if it's the "already clocked in" error - match exact backend message
      if (
        errorMessage.includes('Already clocked in today') ||
        errorMessage.includes('Already clocked in') ||
        errorMessage.includes('sudah absen') ||
        errorMessage.toLowerCase().includes('already clocked')
      ) {
        // Show dedicated error message for already clocked in
        toast.showToast(t('attendance.alreadyClockedIn'), 'error', 5000);
        queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
      } else if (
        errorMessage.includes('shift scheduled') ||
        errorMessage.includes('do not have a shift') ||
        errorMessage.includes('tidak memiliki shift') ||
        errorMessage.toLowerCase().includes('shift')
      ) {
        // Show error for shift validation
        toast.showToast(errorMessage || t('attendance.noShiftError'), 'error', 5000);
      } else {
        // Show generic error for other failures
        const finalMessage = errorMessage || t('attendance.clockInError');
        toast.showToast(finalMessage, 'error', 5000);
      }
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: ({ latitude, longitude }: { latitude?: number; longitude?: number }) =>
      attendanceService.clockOut(undefined, latitude, longitude),
    onSuccess: () => {
      toast.showToast(t('attendance.clockedOut'), 'success');
      queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('attendance.clockOutError'), 'error');
    },
  });

  const handleClockIn = async () => {
    if (!isOnline) {
      toast.showToast(t('attendance.offlineError'), 'error');
      return;
    }

    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      try {
        const location = await getCurrentLocation();
        latitude = location.latitude;
        longitude = location.longitude;
      } catch (error: any) {
        // If location is denied or unavailable, still try to clock in
        // The backend will handle validation if geofencing is enabled
      }

      clockInMutation.mutate({ latitude, longitude });
    } catch (error: any) {
      toast.showToast(error.message || t('attendance.clockInError'), 'error');
    }
  };

  const handleClockOut = async () => {
    if (!isOnline) {
      toast.showToast(t('attendance.offlineError'), 'error');
      return;
    }

    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      try {
        const location = await getCurrentLocation();
        latitude = location.latitude;
        longitude = location.longitude;
      } catch (error: any) {
        // If location is denied or unavailable, still try to clock out
        // The backend will handle validation if geofencing is enabled
      }

      clockOutMutation.mutate({ latitude, longitude });
    } catch (error: any) {
      toast.showToast(error.message || t('attendance.clockOutError'), 'error');
    }
  };

  const isLoading =
    clockInMutation.isPending ||
    clockOutMutation.isPending;

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '-';
    return DateTime.fromISO(isoString).setZone('Asia/Jakarta').toFormat('HH:mm');
  };

  const formatDuration = (minutes?: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}j ${mins}m`;
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('attendance.todayStatus')}</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">{t('attendance.clockIn')}:</span>
            <span className="font-medium">{formatTime(todayAttendance?.clockIn)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('attendance.clockOut')}:</span>
            <span className="font-medium">{formatTime(todayAttendance?.clockOut)}</span>
          </div>
          {todayAttendance?.workDuration !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">{t('attendance.workDuration')}:</span>
              <span className="font-medium">{formatDuration(todayAttendance.workDuration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Action Button */}
      <div className="space-y-4">
        {!status.clockedIn ? (
          <Button
            variant="success"
            size="lg"
            fullWidth
            onClick={handleClockIn}
            disabled={!isOnline || isLoading}
            isLoading={isLoading}
          >
            {t('attendance.clockIn')}
          </Button>
        ) : (
          <Button
            variant="danger"
            size="lg"
            fullWidth
            onClick={handleClockOut}
            disabled={!isOnline || isLoading}
            isLoading={isLoading}
          >
            {t('attendance.clockOut')}
          </Button>
        )}
        
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={onNavigateToAdjustment}
        >
          {t('attendance.requestAdjustment')}
        </Button>
      </div>

      {/* Offline Warning */}
      {!isOnline && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">{t('attendance.offlineWarning')}</p>
        </div>
      )}
    </div>
  );
}


function ApprovalHistory() {
  const { t, i18n } = useTranslation();
  
  // Helper function to get translated leave type name
  const getLeaveTypeName = (leaveType?: { name?: string; nameId?: string }): string => {
    if (!leaveType) return 'N/A';
    const currentLang = i18n.language;
    if (currentLang === 'id' && leaveType.nameId) {
      return leaveType.nameId;
    }
    return leaveType.name || 'N/A';
  };
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave' | 'overtime'>('leave');
  const [attendanceHistoryPage, setAttendanceHistoryPage] = useState(1);
  const [leaveHistoryPage, setLeaveHistoryPage] = useState(1);
  const [overtimeHistoryPage, setOvertimeHistoryPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch direct reports
  const { data: allEmployees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll(),
  });

  // Filter out inactive employees
  const employees = allEmployees.filter(emp => emp.status === 'ACTIVE');

  // Get all processed (approved/rejected) requests from direct reports
  const { data: attendanceAdjustments = [] } = useQuery<AttendanceAdjustment[]>({
    queryKey: ['attendanceAdjustments', 'history'],
    queryFn: async () => {
      if (employees.length === 0) return [];
      const allAdjustments: AttendanceAdjustment[] = [];
      for (const emp of employees) {
        try {
          const adjustments = await attendanceService.getAdjustments(emp.id);
          allAdjustments.push(...adjustments.filter(a => a.status !== 'PENDING'));
        } catch (error) {
          // Skip if no access
        }
      }
      // Sort by requestedAt descending (most recent first)
      return allAdjustments.sort((a, b) => 
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );
    },
    enabled: employees.length > 0,
  });

  const { data: leaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['leaveRequests', 'history'],
    queryFn: async () => {
      if (employees.length === 0) return [];
      const allRequests: LeaveRequest[] = [];
      for (const emp of employees) {
        try {
          const requests = await leaveService.getRequests(emp.id);
          allRequests.push(...requests.filter(r => r.status !== 'PENDING'));
        } catch (error) {
          // Skip if no access
        }
      }
      // Sort by requestedAt descending (most recent first)
      return allRequests.sort((a, b) => 
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );
    },
    enabled: employees.length > 0,
  });

  const { data: overtimeRequests = [] } = useQuery<OvertimeRequest[]>({
    queryKey: ['overtimeRequests', 'history'],
    queryFn: async () => {
      if (employees.length === 0) return [];
      const allRequests: OvertimeRequest[] = [];
      for (const emp of employees) {
        try {
          const requests = await overtimeService.getRequests(emp.id);
          allRequests.push(...requests.filter(r => r.status !== 'PENDING'));
        } catch (error) {
          // Skip if no access
        }
      }
      // Sort by requestedAt descending (most recent first)
      return allRequests.sort((a, b) => 
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );
    },
    enabled: employees.length > 0,
  });

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : employeeId;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'APPROVED') {
      return <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">{t('manager.approved')}</span>;
    } else if (status === 'REJECTED') {
      return <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">{t('manager.rejected')}</span>;
    }
    return <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">{status}</span>;
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">{t('manager.approvalHistory')}</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'attendance'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600'
          }`}
        >
          {t('manager.attendanceAdjustments')} ({attendanceAdjustments.length})
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'leave'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600'
          }`}
        >
          {t('manager.leaveRequests')} ({leaveRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('overtime')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'overtime'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-600'
          }`}
        >
          {t('manager.overtimeRequests')} ({overtimeRequests.length})
        </button>
      </div>

      {/* Attendance Adjustments History */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {attendanceAdjustments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('manager.noHistory')}
            </div>
          ) : (() => {
            const totalPages = Math.ceil(attendanceAdjustments.length / itemsPerPage);
            const startIndex = (attendanceHistoryPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedAdjustments = attendanceAdjustments.slice(startIndex, endIndex);

            return (
              <>
                <div className="space-y-4">
                  {paginatedAdjustments.map((adj) => (
              <div key={adj.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-semibold">{getEmployeeName(adj.employeeId)}</div>
                      {getStatusBadge(adj.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {t('manager.requestedOn')}: {new Date(adj.requestedAt).toLocaleDateString()} {new Date(adj.requestedAt).toLocaleTimeString()}
                    </div>
                    {(adj.clockIn || adj.clockOut) && (
                      <div className="mt-2 text-sm">
                        <div className="font-medium mb-1">{t('manager.adjustmentDetails')}:</div>
                        {adj.clockIn && (
                          <div className="text-gray-600">
                            {t('attendance.clockIn')}: {new Date(adj.clockIn).toLocaleString()}
                          </div>
                        )}
                        {adj.clockOut && (
                          <div className="text-gray-600">
                            {t('attendance.clockOut')}: {new Date(adj.clockOut).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-sm mt-2">
                      <span className="font-medium">{t('manager.reason')}:</span> {adj.reason}
                    </div>
                    {adj.approvedAt && (
                      <div className="text-sm text-gray-600 mt-1">
                        {adj.status === 'APPROVED' ? t('manager.approvedOn') : t('manager.rejectedOn')}: {new Date(adj.approvedAt).toLocaleDateString()} {new Date(adj.approvedAt).toLocaleTimeString()}
                        {adj.approver && (
                          <span className="ml-2">
                            ({adj.status === 'APPROVED' ? t('manager.approvedBy') : t('manager.rejectedBy')}: {adj.approver.name} - {adj.approver.role === 'MANAGER' ? t('manager.manager') : t('manager.owner')})
                          </span>
                        )}
                      </div>
                    )}
                    {adj.rejectedReason && (
                      <div className="text-sm mt-2 text-red-600">
                        <span className="font-medium">{t('manager.rejectionReason')}:</span> {adj.rejectedReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg shadow-sm border">
                  <Pagination
                    currentPage={attendanceHistoryPage}
                    totalPages={totalPages}
                    onPageChange={setAttendanceHistoryPage}
                    totalItems={attendanceAdjustments.length}
                    itemsPerPage={itemsPerPage}
                  />
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Leave Requests History */}
      {activeTab === 'leave' && (
        <div className="space-y-4">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('manager.noHistory')}
            </div>
          ) : (() => {
            const totalPages = Math.ceil(leaveRequests.length / itemsPerPage);
            const startIndex = (leaveHistoryPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedRequests = leaveRequests.slice(startIndex, endIndex);

            return (
              <>
                <div className="space-y-4">
                  {paginatedRequests.map((request) => (
              <div key={request.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-semibold">{getEmployeeName(request.employeeId)}</div>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {getLeaveTypeName(request.leaveType)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(request.startDate).toLocaleDateString()} -{' '}
                      {new Date(request.endDate).toLocaleDateString()} ({request.days} {t('leave.days')})
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {t('manager.requestedOn')}: {new Date(request.requestedAt).toLocaleDateString()} {new Date(request.requestedAt).toLocaleTimeString()}
                    </div>
                    {request.approvedAt && (
                      <div className="text-sm text-gray-600 mt-1">
                        {request.status === 'APPROVED' ? t('manager.approvedOn') : t('manager.rejectedOn')}: {new Date(request.approvedAt).toLocaleDateString()} {new Date(request.approvedAt).toLocaleTimeString()}
                        {request.approver && (
                          <span className="ml-2">
                            ({request.status === 'APPROVED' ? t('manager.approvedBy') : t('manager.rejectedBy')}: {request.approver.name} - {request.approver.role === 'MANAGER' ? t('manager.manager') : t('manager.owner')})
                          </span>
                        )}
                      </div>
                    )}
                    {request.reason && (
                      <div className="text-sm mt-2">
                        <span className="font-medium">{t('manager.reason')}:</span> {request.reason}
                      </div>
                    )}
                    {request.rejectedReason && (
                      <div className="text-sm mt-2 text-red-600">
                        <span className="font-medium">{t('manager.rejectionReason')}:</span> {request.rejectedReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg shadow-sm border">
                  <Pagination
                    currentPage={leaveHistoryPage}
                    totalPages={totalPages}
                    onPageChange={setLeaveHistoryPage}
                    totalItems={leaveRequests.length}
                    itemsPerPage={itemsPerPage}
                  />
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Overtime Requests History */}
      {activeTab === 'overtime' && (
        <div className="space-y-4">
          {overtimeRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('manager.noHistory')}
            </div>
          ) : (() => {
            const totalPages = Math.ceil(overtimeRequests.length / itemsPerPage);
            const startIndex = (overtimeHistoryPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedRequests = overtimeRequests.slice(startIndex, endIndex);

            return (
              <>
                <div className="space-y-4">
                  {paginatedRequests.map((request) => (
              <div key={request.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-semibold">{getEmployeeName(request.employeeId)}</div>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(request.date).toLocaleDateString()} - {request.duration} {t('overtime.minutes')}
                    </div>
                    {(request.calculatedAmount || request.calculatedPay) && (
                      <div className="text-sm text-green-600 font-medium mt-1">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                        }).format(request.calculatedAmount || request.calculatedPay || 0)}
                      </div>
                    )}
                    <div className="text-sm text-gray-600 mt-1">
                      {t('manager.requestedOn')}: {new Date(request.requestedAt).toLocaleDateString()} {new Date(request.requestedAt).toLocaleTimeString()}
                    </div>
                    {request.approvedAt && (
                      <div className="text-sm text-gray-600 mt-1">
                        {request.status === 'APPROVED' ? t('manager.approvedOn') : t('manager.rejectedOn')}: {new Date(request.approvedAt).toLocaleDateString()} {new Date(request.approvedAt).toLocaleTimeString()}
                        {request.approver && (
                          <span className="ml-2">
                            ({request.status === 'APPROVED' ? t('manager.approvedBy') : t('manager.rejectedBy')}: {request.approver.name} - {request.approver.role === 'MANAGER' ? t('manager.manager') : t('manager.owner')})
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-sm mt-2">
                      <span className="font-medium">{t('manager.reason')}:</span> {request.reason}
                    </div>
                    {request.rejectedReason && (
                      <div className="text-sm mt-2 text-red-600">
                        <span className="font-medium">{t('manager.rejectionReason')}:</span> {request.rejectedReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg shadow-sm border">
                  <Pagination
                    currentPage={overtimeHistoryPage}
                    totalPages={totalPages}
                    onPageChange={setOvertimeHistoryPage}
                    totalItems={overtimeRequests.length}
                    itemsPerPage={itemsPerPage}
                  />
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function ManagerProfile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();

  const { data: employee, error, isLoading } = useQuery<Employee>({
    queryKey: ['employee', 'me'],
    queryFn: async () => {
      if (!user?.employee?.id) throw new Error('Employee not found');
      return employeeService.getOne(user.employee.id);
    },
    enabled: !!user?.employee?.id,
  });

  useEffect(() => {
    if (error) {
      const errorMessage = (error as any).response?.data?.message || (error as any).message || t('common.error');
      toast.showToast(errorMessage, 'error', 5000);
    }
  }, [error, toast, t]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-500">{t('common.error')}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">{t('profile.title')}</h2>

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">{t('profile.employeeCode')}</label>
          <div className="font-semibold mt-1">{employee.employeeCode}</div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">{t('profile.name')}</label>
          <div className="font-semibold mt-1">
            {employee.firstName} {employee.lastName}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">{t('profile.email')}</label>
          <div className="mt-1">{employee.user?.email || '-'}</div>
        </div>

        {employee.nik && (
          <div>
            <label className="text-sm font-medium text-gray-700">{t('profile.nik')}</label>
            <div className="mt-1">{employee.nik}</div>
          </div>
        )}

        {employee.phone && (
          <div>
            <label className="text-sm font-medium text-gray-700">{t('profile.phone')}</label>
            <div className="mt-1">{employee.phone}</div>
          </div>
        )}

        {employee.address && (
          <div>
            <label className="text-sm font-medium text-gray-700">{t('profile.address')}</label>
            <div className="mt-1">{employee.address}</div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700">{t('profile.joinDate')}</label>
          <div className="mt-1">
            {new Date(employee.joinDate).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">{t('profile.status')}</label>
          <div className="mt-1">
            <span
              className={`px-2 py-1 rounded text-xs ${
                employee.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {employee.status}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <ChangePassword />
    </div>
  );
}

export default function ManagerDashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial view from URL or default to 'attendance'
  const getInitialView = (): 'attendance' | 'schedule' | 'scheduleManagement' | 'inbox' | 'team' | 'history' | 'adjustment' | 'payslips' | 'profile' => {
    const tab = searchParams.get('tab');
    const validViews = ['attendance', 'schedule', 'scheduleManagement', 'inbox', 'team', 'history', 'adjustment', 'payslips', 'profile'];
    return (tab && validViews.includes(tab)) ? tab as any : 'attendance';
  };
  
  const [activeView, setActiveView] = useState<'attendance' | 'schedule' | 'scheduleManagement' | 'inbox' | 'team' | 'history' | 'adjustment' | 'payslips' | 'profile'>(getInitialView());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const isInitialMount = useRef(true);

  // Fetch employees for counting pending approvals (direct reports)
  const { data: allEmployees = [] } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll(),
  });

  // Filter to only direct reports
  const employees = useMemo(() => {
    if (!user?.employee?.id) return [];
    const employeeId = user.employee.id;
    return allEmployees.filter(emp => 
      emp.status === 'ACTIVE' && 
      emp.managerId === employeeId
    );
  }, [allEmployees, user?.employee?.id]);

  // Count pending approvals
  const { data: pendingApprovalsCount = 0 } = useQuery<number>({
    queryKey: ['pendingApprovalsCount', 'manager', user?.employee?.id],
    queryFn: async () => {
      if (employees.length === 0) return 0;
      let count = 0;
      
      // Count pending attendance adjustments
      for (const emp of employees) {
        try {
          const adjustments = await attendanceService.getAdjustments(emp.id);
          count += adjustments.filter(a => a.status === 'PENDING').length;
        } catch (error) {
          // Skip if no access
        }
      }
      
      // Count pending leave requests
      for (const emp of employees) {
        try {
          const requests = await leaveService.getRequests(emp.id);
          count += requests.filter(r => r.status === 'PENDING').length;
        } catch (error) {
          // Skip if no access
        }
      }
      
      // Count pending overtime requests
      for (const emp of employees) {
        try {
          const requests = await overtimeService.getRequests(emp.id);
          count += requests.filter(r => r.status === 'PENDING').length;
        } catch (error) {
          // Skip if no access
        }
      }
      
      return count;
    },
    enabled: employees.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds to keep count updated
  });

  // Update URL when activeView changes
  const handleViewChange = (view: 'attendance' | 'schedule' | 'scheduleManagement' | 'inbox' | 'team' | 'history' | 'adjustment' | 'payslips' | 'profile') => {
    setActiveView(view);
    setSearchParams({ tab: view }, { replace: true });
  };

  // Sync with URL on mount and when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const tab = searchParams.get('tab');
    const validViews = ['attendance', 'schedule', 'scheduleManagement', 'inbox', 'team', 'history', 'adjustment', 'payslips', 'profile'];
    
    if (isInitialMount.current) {
      // On initial mount, ensure URL has a tab parameter
      if (!tab) {
        setSearchParams({ tab: activeView }, { replace: true });
      }
      isInitialMount.current = false;
      return;
    }
    
    // After initial mount, sync state to URL changes (e.g., browser back/forward)
    if (tab && validViews.includes(tab) && tab !== activeView) {
      setActiveView(tab as any);
    }
  }, [searchParams, activeView, setSearchParams]);

  // Primary navigation items (most frequently used)
  const primaryNavItems = [
    { key: 'attendance', label: t('nav.attendance') },
    { key: 'schedule', label: t('nav.schedule') },
    { key: 'inbox', label: t('manager.approvalInbox') },
  ];

  // Secondary navigation items (grouped in "More" menu)
  const secondaryNavItems = [
    { key: 'profile', label: t('profile.profile') },
    { key: 'scheduleManagement', label: t('shiftSchedule.title') },
    { key: 'team', label: t('manager.teamOverview') },
    { key: 'history', label: t('manager.approvalHistory') },
    { key: 'payslips', label: t('payslip.myPayslips') },
    { key: 'adjustment', label: t('attendance.requestAdjustment') },
  ];

  // All navigation items for mobile menu
  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Mobile menu button and title */}
            <div className="flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                aria-label="Toggle menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <h1 className="text-xl font-semibold ml-2 md:ml-0">{t('dashboard.manager')}</h1>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center space-x-4 flex-1 justify-center">
              {/* Primary nav items */}
              <div className="flex space-x-2">
                {primaryNavItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleViewChange(item.key as any)}
                    className={`px-3 py-2 text-sm font-medium whitespace-nowrap relative ${
                      activeView === item.key
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span>{item.label}</span>
                      {item.key === 'inbox' && pendingApprovalsCount > 0 && (
                        <span className="ml-2 h-2 w-2 bg-red-500 rounded-full"></span>
                      )}
                    </span>
                  </button>
                ))}
              </div>

              {/* More menu dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className={`px-3 py-2 text-sm font-medium flex items-center space-x-1 ${
                    secondaryNavItems.some(item => activeView === item.key)
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <span>{t('common.more')}</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {moreMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMoreMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                      <div className="py-1">
                        {secondaryNavItems.map((item) => (
                          <button
                            key={item.key}
                            onClick={() => {
                              handleViewChange(item.key as any);
                              setMoreMenuOpen(false);
                            }}
                            className={`block w-full text-left px-4 py-2 text-sm ${
                              activeView === item.key
                                ? 'bg-indigo-50 text-indigo-600'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* User info, language switcher, and logout */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <span className="hidden sm:inline text-sm text-gray-600">{user?.email}</span>
              <LanguageSwitcher />
              <button
                onClick={logout}
                className="px-3 md:px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                {t('common.logout')}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {allNavItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      handleViewChange(item.key as any);
                      setMobileMenuOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-base font-medium rounded-md relative ${
                      activeView === item.key
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span>{item.label}</span>
                      {item.key === 'inbox' && pendingApprovalsCount > 0 && (
                        <span className="ml-2 h-2 w-2 bg-red-500 rounded-full"></span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6">
        {activeView === 'attendance' && <ManagerAttendance onNavigateToAdjustment={() => handleViewChange('adjustment')} />}
        {activeView === 'schedule' && <ManagerShiftSchedulePage />}
        {activeView === 'scheduleManagement' && <ManagerShiftScheduleManagementPage />}
        {activeView === 'inbox' && <ApprovalInbox />}
        {activeView === 'team' && <TeamOverview />}
        {activeView === 'history' && <ApprovalHistory />}
        {activeView === 'adjustment' && <ManagerAttendanceAdjustment />}
        {activeView === 'payslips' && <ManagerPayslipsPage />}
        {activeView === 'profile' && <ManagerProfile />}
      </main>

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
