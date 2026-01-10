import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { attendanceService, Attendance, AttendanceAdjustment } from '../../services/api/attendanceService';
import { Button } from '../../components/common/Button';
import { ToastContainer } from '../../components/common/Toast';
import { DateTime } from 'luxon';
import { Pagination } from '../../components/common/Pagination';

export default function AttendanceAdjustmentPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<string | null>(null);
  const [deletingAdjustmentId, setDeletingAdjustmentId] = useState<string | null>(null);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState('');
  const [clockIn, setClockIn] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [reason, setReason] = useState('');
  const [adjustmentPage, setAdjustmentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch attendance records (last 30 days)
  // Use startOf('day') to ensure we get today's date correctly in Asia/Jakarta timezone
  const today = DateTime.now().setZone('Asia/Jakarta').startOf('day');
  const endDate = today.toISODate() || '';
  const startDate = today.minus({ days: 30 }).toISODate() || '';

  const { data: attendances = [], error: attendancesError } = useQuery<Attendance[]>({
    queryKey: ['attendance', 'list', startDate, endDate],
    queryFn: () => attendanceService.getList(startDate, endDate),
  });

  // Fetch adjustment requests
  const { data: adjustments = [], error: adjustmentsError } = useQuery<AttendanceAdjustment[]>({
    queryKey: ['attendanceAdjustments'],
    queryFn: () => attendanceService.getAdjustments(),
  });

  // Handle query errors
  useEffect(() => {
    if (attendancesError) {
      const errorMessage = (attendancesError as any).response?.data?.message || (attendancesError as any).message || t('attendance.loadError');
      toast.showToast(errorMessage, 'error', 5000);
    }
  }, [attendancesError, toast, t]);

  useEffect(() => {
    if (adjustmentsError) {
      const errorMessage = (adjustmentsError as any).response?.data?.message || (adjustmentsError as any).message || t('attendance.adjustmentLoadError');
      toast.showToast(errorMessage, 'error', 5000);
    }
  }, [adjustmentsError, toast, t]);

  // Create adjustment request mutation
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
      const errorMessage = error.response?.data?.message || error.message || '';
      const status = error.response?.status;
      
      // Ensure we have a message to display
      let messageToShow = t('common.error');
      
      // Handle 400 Bad Request errors with specific messages
      if (status === 400) {
        if (errorMessage.includes('An adjustment request already exists') ||
            errorMessage.includes('adjustment request already exists') ||
            errorMessage.includes('Permintaan koreksi sudah ada')) {
          messageToShow = t('attendance.adjustmentAlreadyExists');
        } else if (errorMessage.includes('Attendance not found') ||
                   errorMessage.includes('Absensi tidak ditemukan')) {
          messageToShow = t('attendance.attendanceNotFound');
        } else if (errorMessage) {
          messageToShow = errorMessage;
        }
      } else if (errorMessage) {
        messageToShow = errorMessage;
      }
      
      // Show error toast with longer duration (5 seconds for errors)
      toast.showToast(messageToShow, 'error', 5000);
    },
  });

  const formatForAPI = (localDateTime: string): string | undefined => {
    if (!localDateTime) return undefined;
    // Convert from local datetime format (YYYY-MM-DDTHH:mm) to ISO string
    const dt = DateTime.fromFormat(localDateTime, "yyyy-MM-dd'T'HH:mm", { zone: 'Asia/Jakarta' });
    return dt.toISO() || undefined;
  };

  // Update adjustment mutation
  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      attendanceService.updateAdjustment(id, data),
    onSuccess: () => {
      toast.showToast(t('attendance.adjustmentRequestUpdated'), 'success');
      setEditingAdjustmentId(null);
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

  // Delete adjustment mutation
  const deleteRequestMutation = useMutation({
    mutationFn: attendanceService.deleteAdjustment,
    onSuccess: () => {
      toast.showToast(t('attendance.adjustmentRequestDeleted'), 'success');
      setDeletingAdjustmentId(null);
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
      setDeletingAdjustmentId(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendanceId || !reason) {
      toast.showToast(t('common.fillAllFields'), 'error', 5000);
      return;
    }

    if (reason.length < 10) {
      toast.showToast(t('attendance.reasonMinLength'), 'error', 5000);
      return;
    }

    if (editingAdjustmentId) {
      // Update existing adjustment
      updateRequestMutation.mutate({
        id: editingAdjustmentId,
        data: {
          clockIn: formatForAPI(clockIn),
          clockOut: formatForAPI(clockOut),
          reason,
        },
      });
    } else {
      // Create new adjustment
      createRequestMutation.mutate({
        attendanceId: selectedAttendanceId,
        clockIn: formatForAPI(clockIn),
        clockOut: formatForAPI(clockOut),
        reason,
      });
    }
  };

  const handleEdit = (adjustment: AttendanceAdjustment) => {
    if (adjustment.status !== 'PENDING') {
      toast.showToast(t('attendance.canOnlyEditPending'), 'error', 5000);
      return;
    }
    setEditingAdjustmentId(adjustment.id);
    setSelectedAttendanceId(adjustment.attendanceId);
    setClockIn(formatForInput(adjustment.clockIn));
    setClockOut(formatForInput(adjustment.clockOut));
    setReason(adjustment.reason);
    setShowRequestForm(true);
  };

  const handleDelete = (adjustmentId: string) => {
    const adjustment = adjustments.find(a => a.id === adjustmentId);
    if (adjustment && adjustment.status !== 'PENDING') {
      toast.showToast(t('attendance.canOnlyDeletePending'), 'error', 5000);
      return;
    }
    setDeletingAdjustmentId(adjustmentId);
  };

  const confirmDelete = () => {
    if (deletingAdjustmentId) {
      deleteRequestMutation.mutate(deletingAdjustmentId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return DateTime.fromISO(dateString).setZone('Asia/Jakarta').toFormat('dd/MM/yyyy HH:mm');
  };

  const formatDate = (dateString: string) => {
    return DateTime.fromISO(dateString).setZone('Asia/Jakarta').toFormat('dd/MM/yyyy');
  };

  const formatForInput = (isoString: string | null): string => {
    if (!isoString) return '';
    const dt = DateTime.fromISO(isoString).setZone('Asia/Jakarta');
    return dt.toFormat("yyyy-MM-dd'T'HH:mm");
  };

  const handleSelectAttendance = (attendance: Attendance) => {
    setSelectedAttendanceId(attendance.id);
    setClockIn(formatForInput(attendance.clockIn));
    setClockOut(formatForInput(attendance.clockOut));
    setShowRequestForm(true);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <Button onClick={() => navigate(-1)} variant="secondary" className="mb-4">
          ← {t('common.back')}
        </Button>
        <h1 className="text-2xl font-bold mb-2">{t('attendance.adjustmentRequests')}</h1>
        <p className="text-gray-600 text-sm">{t('attendance.adjustmentDescription')}</p>
      </div>

      {/* Request Form */}
      {showRequestForm && (
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
                  const attendance = attendances.find(a => a.id === e.target.value);
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
                {attendances.map((att) => (
                  <option key={att.id} value={att.id}>
                    {formatDate(att.date)} - {att.clockIn ? formatDateTime(att.clockIn) : t('attendance.noClockIn')}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('attendance.clockIn')} ({t('attendance.corrected')})
                </label>
                <input
                  type="datetime-local"
                  value={clockIn}
                  onChange={(e) => setClockIn(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('attendance.leaveEmptyIfNoChange')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('attendance.clockOut')} ({t('attendance.corrected')})
                </label>
                <input
                  type="datetime-local"
                  value={clockOut}
                  onChange={(e) => setClockOut(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('attendance.leaveEmptyIfNoChange')}
                </p>
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
                rows={4}
                placeholder={t('attendance.reasonPlaceholder')}
                required
                minLength={10}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('attendance.reasonMinLength')} (10 {t('common.characters')})
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={
                  (editingAdjustmentId ? updateRequestMutation.isPending : createRequestMutation.isPending) ||
                  !selectedAttendanceId ||
                  !reason ||
                  reason.length < 10
                }
              >
                {editingAdjustmentId
                  ? updateRequestMutation.isPending
                    ? t('common.submitting')
                    : t('common.save')
                  : createRequestMutation.isPending
                  ? t('common.submitting')
                  : t('attendance.requestAdjustment')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowRequestForm(false);
                  setEditingAdjustmentId(null);
                  setSelectedAttendanceId('');
                  setClockIn('');
                  setClockOut('');
                  setReason('');
                }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Request Button */}
      {!showRequestForm && (
        <div className="mb-6">
          <Button onClick={() => setShowRequestForm(true)}>
            {t('attendance.requestAdjustment')}
          </Button>
        </div>
      )}

      {/* Adjustment Requests List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">{t('attendance.myAdjustmentRequests')}</h2>
        </div>
        {adjustments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {t('attendance.noAdjustmentRequests')}
          </div>
        ) : (() => {
          const totalPages = Math.ceil(adjustments.length / itemsPerPage);
          const startIndex = (adjustmentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          const paginatedAdjustments = adjustments.slice(startIndex, endIndex);

          return (
            <>
              <div className="divide-y">
                {paginatedAdjustments.map((adjustment) => {
                  const attendance = attendances.find(a => a.id === adjustment.attendanceId);
                  return (
                    <div key={adjustment.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">
                        {attendance ? formatDate(attendance.date) : t('attendance.attendance')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {t('attendance.requestedOn')}: {formatDateTime(adjustment.requestedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(adjustment.status)}`}>
                        {adjustment.status}
                      </span>
                      {adjustment.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(adjustment)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50"
                            title={t('common.edit')}
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={() => handleDelete(adjustment.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50"
                            title={t('common.delete')}
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-2">
                    {adjustment.clockIn && (
                      <div>
                        <span className="text-gray-600">{t('attendance.clockIn')}:</span>{' '}
                        {formatDateTime(adjustment.clockIn)}
                      </div>
                    )}
                    {adjustment.clockOut && (
                      <div>
                        <span className="text-gray-600">{t('attendance.clockOut')}:</span>{' '}
                        {formatDateTime(adjustment.clockOut)}
                      </div>
                    )}
                  </div>

                  <div className="text-sm mb-2">
                    <span className="text-gray-600">{t('attendance.reason')}:</span>{' '}
                    {adjustment.reason}
                  </div>

                  {adjustment.status === 'REJECTED' && adjustment.rejectedReason && (
                    <div className="text-sm text-red-600">
                      <span className="font-medium">{t('attendance.rejectionReason')}:</span>{' '}
                      {adjustment.rejectedReason}
                    </div>
                  )}

                  {adjustment.status === 'APPROVED' && adjustment.approvedAt && (
                    <div className="text-sm text-green-600">
                      {t('attendance.approvedOn')}: {formatDateTime(adjustment.approvedAt)}
                      {adjustment.approver && (
                        <span className="ml-2">
                          ({t('manager.approvedBy')}: {adjustment.approver.name} - {adjustment.approver.role === 'MANAGER' ? t('manager.manager') : t('manager.owner')})
                        </span>
                      )}
                    </div>
                  )}
                </div>
                  );
                })}
              </div>
              <div className="bg-white rounded-lg shadow-sm border">
                <Pagination
                  currentPage={adjustmentPage}
                  totalPages={totalPages}
                  onPageChange={setAdjustmentPage}
                  totalItems={adjustments.length}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            </>
          );
        })()}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingAdjustmentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('attendance.confirmDelete')}</h3>
            <p className="text-gray-600 mb-6">{t('attendance.deleteConfirmationMessage')}</p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setDeletingAdjustmentId(null)}
                disabled={deleteRequestMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                disabled={deleteRequestMutation.isPending}
                isLoading={deleteRequestMutation.isPending}
              >
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Container - Must be here because this page uses its own toast instance */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}

