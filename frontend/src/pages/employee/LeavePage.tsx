import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';
import { useToast } from '../../hooks/useToast';
import { leaveService, LeaveRequest, LeaveType, LeaveBalance } from '../../services/api/leaveService';
import { policyService, Policy } from '../../services/api/policyService';
import { Button } from '../../components/common/Button';
import { ToastContainer } from '../../components/common/Toast';
import { Pagination } from '../../components/common/Pagination';
import { Modal } from '../../components/common/Modal';

export default function LeavePage() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [leavePage, setLeavePage] = useState(1);
  const itemsPerPage = 10;

  // Fetch leave policy
  const { data: leavePolicy } = useQuery<Policy | null, Error>({
    queryKey: ['leavePolicy'],
    queryFn: async (): Promise<Policy | null> => {
      try {
        return await policyService.getByType('LEAVE_POLICY');
      } catch (error: any) {
        // Policy might not exist yet, return null instead of throwing
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: false, // Don't retry if policy doesn't exist
  });

  // Extract policy settings
  const policyConfig = leavePolicy?.config || {};
  const accrualMethod = policyConfig.accrualMethod || null;
  // Check if accrual is enabled (case-insensitive check for "NONE")
  const hasAccrual = accrualMethod && typeof accrualMethod === 'string' && accrualMethod.toUpperCase() !== 'NONE';

  // Helper function to get translated leave type name
  const getLeaveTypeName = (type: LeaveType): string => {
    const currentLang = i18n.language;
    if (currentLang === 'id' && type.nameId) {
      return type.nameId;
    }
    return type.name;
  };

  // Fetch leave types
  const { data: leaveTypes = [], error: leaveTypesError } = useQuery<LeaveType[]>({
    queryKey: ['leaveTypes'],
    queryFn: () => leaveService.getLeaveTypes(),
  });

  // Fetch leave requests
  const { data: requests = [], error: requestsError } = useQuery<LeaveRequest[]>({
    queryKey: ['leaveRequests'],
    queryFn: () => leaveService.getRequests(),
  });

  // Fetch balances for all leave types
  // Note: Backend recalculates balances on each fetch based on current leave type settings
  // This ensures balances always reflect owner's quota changes
  const { data: balances = [], error: balancesError, refetch: refetchBalances } = useQuery<LeaveBalance[]>({
    queryKey: ['leaveBalances'],
    queryFn: async () => {
      if (leaveTypes.length === 0) return [];
      const balancePromises = leaveTypes.map((type) =>
        leaveService.getBalance(type.id).catch(() => null)
      );
      const results = await Promise.all(balancePromises);
      return results.filter((b): b is LeaveBalance => b !== null);
    },
    enabled: leaveTypes.length > 0,
    // Refetch balances when leave types change (in case owner updated quotas)
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale to ensure fresh balances
  });

  // Handle query errors
  useEffect(() => {
    if (leaveTypesError) {
      const errorMessage = (leaveTypesError as any).response?.data?.message || (leaveTypesError as any).message || t('leave.loadError');
      toast.showToast(errorMessage, 'error', 5000);
    }
  }, [leaveTypesError, toast, t]);

  useEffect(() => {
    if (requestsError) {
      const errorMessage = (requestsError as any).response?.data?.message || (requestsError as any).message || t('leave.loadError');
      toast.showToast(errorMessage, 'error', 5000);
    }
  }, [requestsError, toast, t]);

  useEffect(() => {
    if (balancesError) {
      const errorMessage = (balancesError as any).response?.data?.message || (balancesError as any).message || t('leave.balanceLoadError');
      toast.showToast(errorMessage, 'error', 5000);
    }
  }, [balancesError, toast, t]);

  // Handle policy error (non-critical, policy might not be set up yet)
  // No need to show error toast as this is expected if policy hasn't been configured

  // Create a map of leaveTypeId -> balance for easy lookup
  const balanceMap = new Map(balances.map((b) => [b.leaveTypeId, b]));

  // Fetch balance for selected leave type (for form display)
  // Note: Backend recalculates on each fetch to reflect current owner quota settings
  const { data: selectedBalance } = useQuery<LeaveBalance>({
    queryKey: ['leaveBalance', selectedLeaveType],
    queryFn: () => leaveService.getBalance(selectedLeaveType),
    enabled: !!selectedLeaveType,
    staleTime: 0, // Always fetch fresh balance to reflect owner quota changes
  });

  // Create leave request mutation
  const createRequestMutation = useMutation({
    mutationFn: leaveService.createRequest,
    onSuccess: () => {
      toast.showToast(t('leave.requestCreated'), 'success');
      setShowRequestForm(false);
      setEditingRequestId(null);
      setSelectedLeaveType('');
      setStartDate('');
      setEndDate('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  // Update leave request mutation
  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      leaveService.updateRequest(id, data),
    onSuccess: () => {
      toast.showToast(t('leave.requestUpdated'), 'success');
      setShowRequestForm(false);
      setEditingRequestId(null);
      setSelectedLeaveType('');
      setStartDate('');
      setEndDate('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  // Delete leave request mutation
  const deleteRequestMutation = useMutation({
    mutationFn: leaveService.deleteRequest,
    onSuccess: () => {
      toast.showToast(t('leave.requestDeleted'), 'success');
      setDeletingRequestId(null);
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
      setDeletingRequestId(null);
    },
  });

  // Calculate number of days between start and end date (excluding Monday)
  // Working days: Tuesday to Sunday
  // Uses Luxon for consistent date handling with backend (Asia/Jakarta timezone)
  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    
    // Parse dates in Asia/Jakarta timezone to match backend
    const startDate = DateTime.fromISO(start, { zone: 'Asia/Jakarta' }).startOf('day');
    const endDate = DateTime.fromISO(end, { zone: 'Asia/Jakarta' }).startOf('day');
    
    if (!startDate.isValid || !endDate.isValid) {
      return 0;
    }
    
    if (endDate < startDate) {
      return 0;
    }
    
    let days = 0;
    let current = startDate;
    
    // Include both start and end dates (inclusive)
    while (current <= endDate) {
      // weekday: 1 = Monday, 7 = Sunday
      // Working days: Tuesday (2) to Sunday (7)
      // Monday (1) is non-working day, excluded from leave calculation
      if (current.weekday >= 2 && current.weekday <= 7) {
        days += 1;
      }
      current = current.plus({ days: 1 });
    }
    
    return days;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveType || !startDate || !endDate) {
      toast.showToast(t('common.fillAllFields'), 'error');
      return;
    }

    // Validate date range using Luxon for consistent timezone handling
    const startDateParsed = DateTime.fromISO(startDate, { zone: 'Asia/Jakarta' }).startOf('day');
    const endDateParsed = DateTime.fromISO(endDate, { zone: 'Asia/Jakarta' }).startOf('day');
    
    if (!startDateParsed.isValid || !endDateParsed.isValid) {
      toast.showToast(t('leave.invalidDateRange'), 'error');
      return;
    }
    
    if (endDateParsed < startDateParsed) {
      toast.showToast(t('leave.invalidDateRange'), 'error');
      return;
    }

    // Get selected leave type
    const selectedType = leaveTypes.find((type) => type.id === selectedLeaveType);
    if (!selectedType) {
      toast.showToast(t('common.error'), 'error');
      return;
    }

    // Calculate requested days
    const requestedDays = calculateDays(startDate, endDate);

    // Check balance for paid leave types
    if (selectedType.isPaid) {
      const currentBalance = balanceMap.get(selectedLeaveType);
      if (!currentBalance) {
        toast.showToast(t('leave.balanceNotFound'), 'error');
        return;
      }

      // The balance field already accounts for maxBalance, accrual, used, carryover, and expiry
      // So we can use it directly as the available balance
      const availableBalance = Number(currentBalance.balance);

      if (availableBalance < requestedDays) {
        toast.showToast(
          t('leave.insufficientBalance', {
            requested: requestedDays,
            available: availableBalance.toFixed(1),
          }),
          'error'
        );
        return;
      }
    }

    if (editingRequestId) {
      // Update existing request
      updateRequestMutation.mutate({
        id: editingRequestId,
        data: {
          leaveTypeId: selectedLeaveType,
          startDate,
          endDate,
          reason: reason || undefined,
        },
      });
    } else {
      // Create new request
      createRequestMutation.mutate({
        leaveTypeId: selectedLeaveType,
        startDate,
        endDate,
        reason: reason || undefined,
      });
    }
  };

  const handleEdit = (request: LeaveRequest) => {
    if (request.status !== 'PENDING') {
      toast.showToast(t('leave.canOnlyEditPending'), 'error');
      return;
    }
    setEditingRequestId(request.id);
    setSelectedLeaveType(request.leaveTypeId);
    setStartDate(request.startDate.split('T')[0]);
    setEndDate(request.endDate.split('T')[0]);
    setReason(request.reason || '');
    setShowRequestForm(true);
  };

  const handleDelete = (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (request && request.status !== 'PENDING') {
      toast.showToast(t('leave.canOnlyDeletePending'), 'error');
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

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{t('leave.title')}</h2>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
            queryClient.invalidateQueries({ queryKey: ['leaveBalance'] });
            refetchBalances();
          }}
        >
          {t('leave.refreshBalances')}
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-4">
        {leaveTypes.map((type) => {
          const balance = balanceMap.get(type.id);
          const used = balance ? Number(balance.used) : 0;
          const maxBalance = type.maxBalance;
          
          // The balance field already accounts for maxBalance, accrual, used, carryover, and expiry
          // So we can use it directly as the available balance
          const daysAvailable = balance ? Number(balance.balance) : 0;
          
          const isAtMax = daysAvailable <= 0;
          
          return (
            <div
              key={type.id}
              className="bg-white p-4 rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setSelectedLeaveType(type.id);
                setEditingRequestId(null); // Clear editing state when selecting a new type
                setStartDate('');
                setEndDate('');
                setReason('');
                setShowRequestForm(true);
              }}
            >
              <div className="text-sm text-gray-600">{getLeaveTypeName(type)}</div>
              <div className="text-2xl font-bold mt-1">
                {daysAvailable >= 0 ? daysAvailable.toFixed(1) : '0.0'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t('leave.daysAvailable')}
              </div>
              {maxBalance && (
                <div className="text-xs text-gray-400 mt-1">
                  {t('leave.maxBalance')}: {maxBalance} {t('leave.days')} | {t('leave.used')}: {used.toFixed(1)} {t('leave.days')}
                  {hasAccrual && balance && (
                    <span className="ml-2">
                      | {t('leave.accrued')}: {Number(balance.accrued).toFixed(1)} {t('leave.days')}
                    </span>
                  )}
                </div>
              )}
              {isAtMax && (
                <div className="text-xs text-red-600 mt-1 font-medium">
                  {t('leave.noDaysAvailable')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Request Form */}
      {/* Request Form Modal */}
      <Modal
        isOpen={showRequestForm}
        onClose={() => {
          setShowRequestForm(false);
          setEditingRequestId(null);
          setSelectedLeaveType('');
          setStartDate('');
          setEndDate('');
          setReason('');
        }}
        title={editingRequestId ? t('leave.editRequest') : t('leave.newRequest')}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('leave.leaveType')}
              </label>
              <select
                value={selectedLeaveType}
                onChange={(e) => setSelectedLeaveType(e.target.value)}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">{t('common.select')}</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {getLeaveTypeName(type)}
                  </option>
                ))}
              </select>
            </div>

            {selectedBalance && (() => {
              const selectedType = leaveTypes.find((type) => type.id === selectedLeaveType);
              // The balance field already accounts for maxBalance, accrual, used, carryover, and expiry
              const availableBalance = Number(selectedBalance.balance);
              
              return (
                <div className="bg-blue-50 p-2 rounded text-sm">
                  {t('leave.availableBalance')}: {availableBalance.toFixed(1)} {t('leave.days')}
                  {selectedType?.maxBalance && (
                    <span className="text-gray-600 ml-2">
                      ({t('leave.maxBalance')}: {selectedType.maxBalance} | {t('leave.used')}: {Number(selectedBalance.used).toFixed(1)})
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Show calculated days and balance check */}
            {startDate && endDate && selectedLeaveType && (
              (() => {
                const requestedDays = calculateDays(startDate, endDate);
                const selectedType = leaveTypes.find((type) => type.id === selectedLeaveType);
                const currentBalance = balanceMap.get(selectedLeaveType);
                
                // The balance field already accounts for maxBalance, accrual, used, carryover, and expiry
                const availableBalance = currentBalance ? Number(currentBalance.balance) : 0;
                
                const isInsufficient = selectedType?.isPaid && availableBalance < requestedDays;
                
                return (
                  <div className={`p-2 rounded text-sm ${
                    isInsufficient ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
                  }`}>
                    <div>
                      {t('leave.requestedDays')}: {requestedDays} {t('leave.days')}
                    </div>
                    {selectedType?.isPaid && (
                      <div className="mt-1">
                        {isInsufficient ? (
                          <span className="font-semibold">
                            {t('leave.insufficientBalance', {
                              requested: requestedDays,
                              available: availableBalance.toFixed(1),
                            })}
                          </span>
                        ) : (
                          <span>
                            {t('leave.availableBalance')}: {availableBalance.toFixed(1)} {t('leave.days')}
                            {selectedType?.maxBalance && (
                              <span className="text-gray-600 ml-2">
                                ({t('leave.maxBalance')}: {selectedType.maxBalance} - {t('leave.used')}: {currentBalance ? Number(currentBalance.used).toFixed(1) : '0.0'})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()
            )}

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('leave.startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('leave.endDate')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border rounded-md"
                required
                min={startDate}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('leave.reason')}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2 border rounded-md"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={
                  (editingRequestId ? updateRequestMutation.isPending : createRequestMutation.isPending) ||
                  (() => {
                    if (!startDate || !endDate || !selectedLeaveType) return false;
                    const requestedDays = calculateDays(startDate, endDate);
                    const selectedType = leaveTypes.find((type) => type.id === selectedLeaveType);
                    if (selectedType?.isPaid) {
                      const currentBalance = balanceMap.get(selectedLeaveType);
                      if (!currentBalance) return true;
                      
                      // The balance field already accounts for maxBalance, accrual, used, carryover, and expiry
                      const availableBalance = Number(currentBalance.balance);
                      
                      return availableBalance < requestedDays;
                    }
                    return false;
                  })()
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
                  setSelectedLeaveType('');
                  setStartDate('');
                  setEndDate('');
                  setReason('');
                }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
      </Modal>

      {/* Request List */}
      <div className="space-y-3">
        <h3 className="font-semibold">{t('leave.myRequests')}</h3>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('leave.noRequests')}
          </div>
        ) : (() => {
          const totalPages = Math.ceil(requests.length / itemsPerPage);
          const startIndex = (leavePage - 1) * itemsPerPage;
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
                          {request.leaveType ? getLeaveTypeName(request.leaveType) : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(request.startDate).toLocaleDateString()} -{' '}
                          {new Date(request.endDate).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.days} {t('leave.days')}
                        </div>
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
                    {request.reason && (
                      <div className="text-sm text-gray-600 mt-2">{request.reason}</div>
                    )}
                    {request.rejectedReason && (
                      <div className="text-sm text-red-600 mt-2">
                        {t('leave.rejectedReason')}: {request.rejectedReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg shadow-sm border">
                <Pagination
                  currentPage={leavePage}
                  totalPages={totalPages}
                  onPageChange={setLeavePage}
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
            <h3 className="text-lg font-semibold mb-4">{t('leave.confirmDelete')}</h3>
            <p className="text-gray-600 mb-6">{t('leave.deleteConfirmationMessage')}</p>
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

