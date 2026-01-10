import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast';
import { overtimeService, OvertimeRequest } from '../../services/api/overtimeService';
import { Button } from '../../components/common/Button';
import { ToastContainer } from '../../components/common/Toast';
import { Pagination } from '../../components/common/Pagination';

export default function OvertimePage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [overtimePage, setOvertimePage] = useState(1);
  const itemsPerPage = 10;

  // Fetch overtime requests
  const { data: requests = [], error: requestsError } = useQuery<OvertimeRequest[]>({
    queryKey: ['overtimeRequests'],
    queryFn: () => overtimeService.getRequests(),
  });

  // Handle query errors
  useEffect(() => {
    if (requestsError) {
      const errorMessage = (requestsError as any).response?.data?.message || (requestsError as any).message || t('overtime.loadError');
      toast.showToast(errorMessage, 'error', 5000);
    }
  }, [requestsError, toast, t]);

  // Create overtime request mutation
  const createRequestMutation = useMutation({
    mutationFn: overtimeService.createRequest,
    onSuccess: () => {
      toast.showToast(t('overtime.requestCreated'), 'success');
      setShowRequestForm(false);
      setDate('');
      setDuration('');
      setReason('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['overtimeRequests'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || '';
      // Check for specific error messages
      if (errorMessage.includes('Employee or employment not found') || 
          errorMessage.includes('Employment information not found') ||
          errorMessage.includes('Karyawan atau informasi pekerjaan tidak ditemukan')) {
        toast.showToast(t('overtime.employeeNotFound'), 'error');
      } else if (errorMessage.includes('Overtime request already exists') ||
                 errorMessage.includes('Permintaan lembur sudah ada')) {
        toast.showToast(t('overtime.alreadyExists'), 'error');
      } else if (errorMessage.includes('Cannot request overtime for future dates') ||
                 errorMessage.includes('Tidak dapat meminta lembur untuk tanggal masa depan')) {
        toast.showToast(t('overtime.futureDateError'), 'error');
      } else {
        toast.showToast(errorMessage || t('common.error'), 'error');
      }
    },
  });

  // Update overtime request mutation
  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      overtimeService.updateRequest(id, data),
    onSuccess: () => {
      toast.showToast(t('overtime.requestUpdated'), 'success');
      setShowRequestForm(false);
      setEditingRequestId(null);
      setDate('');
      setDuration('');
      setReason('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['overtimeRequests'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  // Delete overtime request mutation
  const deleteRequestMutation = useMutation({
    mutationFn: overtimeService.deleteRequest,
    onSuccess: () => {
      toast.showToast(t('overtime.requestDeleted'), 'success');
      setDeletingRequestId(null);
      queryClient.invalidateQueries({ queryKey: ['overtimeRequests'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
      setDeletingRequestId(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !duration || !reason) {
      toast.showToast(t('common.fillAllFields'), 'error');
      return;
    }
    if (editingRequestId) {
      // Update existing request
      updateRequestMutation.mutate({
        id: editingRequestId,
        data: {
          date,
          duration: parseInt(duration),
          reason,
          notes: notes || undefined,
        },
      });
    } else {
      // Create new request
      createRequestMutation.mutate({
        date,
        duration: parseInt(duration),
        reason,
        notes: notes || undefined,
      });
    }
  };

  const handleEdit = (request: OvertimeRequest) => {
    if (request.status !== 'PENDING') {
      toast.showToast(t('overtime.canOnlyEditPending'), 'error');
      return;
    }
    setEditingRequestId(request.id);
    setDate(request.date.split('T')[0]);
    setDuration(request.duration.toString());
    setReason(request.reason);
    setNotes(request.notes || '');
    setShowRequestForm(true);
  };

  const handleDelete = (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (request && request.status !== 'PENDING') {
      toast.showToast(t('overtime.canOnlyDeletePending'), 'error');
      return;
    }
    setDeletingRequestId(requestId);
  };

  const confirmDelete = () => {
    if (deletingRequestId) {
      deleteRequestMutation.mutate(deletingRequestId);
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{t('overtime.title')}</h2>
        <Button onClick={() => setShowRequestForm(true)}>
          {t('overtime.newRequest')}
        </Button>
      </div>

      {/* Request Form */}
      {showRequestForm && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="font-semibold mb-4">
            {editingRequestId ? t('overtime.editRequest') : t('overtime.newRequest')}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('overtime.date')}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border rounded-md"
                required
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('overtime.duration')} ({t('overtime.minutes')})
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full p-2 border rounded-md"
                required
                min="1"
                placeholder="60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('overtime.reason')}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2 border rounded-md"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('overtime.notes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 border rounded-md"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={
                  editingRequestId ? updateRequestMutation.isPending : createRequestMutation.isPending
                }
                className="flex-1"
              >
                {editingRequestId
                  ? updateRequestMutation.isPending
                    ? t('common.submitting')
                    : t('common.save')
                  : createRequestMutation.isPending
                  ? t('common.submitting')
                  : t('common.submit')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowRequestForm(false);
                  setEditingRequestId(null);
                  setDate('');
                  setDuration('');
                  setReason('');
                  setNotes('');
                }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Request List */}
      <div className="space-y-3">
        <h3 className="font-semibold">{t('overtime.myRequests')}</h3>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('overtime.noRequests')}
          </div>
        ) : (() => {
          const totalPages = Math.ceil(requests.length / itemsPerPage);
          const startIndex = (overtimePage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          const paginatedRequests = requests.slice(startIndex, endIndex);

          return (
            <>
              <div className="space-y-3">
                {paginatedRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white p-4 rounded-lg shadow-sm border"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">
                          {new Date(request.date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDuration(request.duration)}
                        </div>
                        {request.calculatedPay && (
                          <div className="text-sm text-green-600 font-medium mt-1">
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                            }).format(request.calculatedPay)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${getStatusColor(
                            request.status,
                          )}`}
                        >
                          {request.status}
                        </span>
                        {request.status === 'PENDING' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(request)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50"
                              title={t('common.edit')}
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={() => handleDelete(request.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50"
                              title={t('common.delete')}
                            >
                              {t('common.delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">{request.reason}</div>
                    {request.notes && (
                      <div className="text-sm text-gray-500 mt-1">{request.notes}</div>
                    )}
                    {request.rejectedReason && (
                      <div className="text-sm text-red-600 mt-2">
                        {t('overtime.rejectedReason')}: {request.rejectedReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg shadow-sm border">
                <Pagination
                  currentPage={overtimePage}
                  totalPages={totalPages}
                  onPageChange={setOvertimePage}
                  totalItems={requests.length}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            </>
          );
        })()}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingRequestId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('overtime.confirmDelete')}</h3>
            <p className="text-gray-600 mb-6">{t('overtime.deleteConfirmationMessage')}</p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setDeletingRequestId(null)}
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

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}

