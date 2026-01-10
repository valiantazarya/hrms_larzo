import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../hooks/useToast';
import { payrollService, PayrollRun, PayrollItem } from '../../services/api/payrollService';
import { Button } from '../../components/common/Button';
import { ToastContainer } from '../../components/common/Toast';

export default function PayrollPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRun, setEditingRun] = useState<PayrollRun | null>(null);
  const [deletingRun, setDeletingRun] = useState<PayrollRun | null>(null);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [editingItem, setEditingItem] = useState<PayrollItem | null>(null);
  const [itemEditForm, setItemEditForm] = useState<{
    bonuses: number;
    allowances: number;
    transportBonus: number;
    lunchBonus: number;
    thr: number;
    deductions: number;
  }>({
    bonuses: 0,
    allowances: 0,
    transportBonus: 0,
    lunchBonus: 0,
    thr: 0,
    deductions: 0,
  });
  const [formData, setFormData] = useState({
    periodYear: new Date().getFullYear(),
    periodMonth: new Date().getMonth() + 1,
    notes: '',
  });

  const { data: payrollRuns = [] } = useQuery<PayrollRun[]>({
    queryKey: ['payrollRuns'],
    queryFn: () => payrollService.getPayrollRuns(),
  });

  const { data: payrollRun } = useQuery<PayrollRun>({
    queryKey: ['payrollRun', selectedRun?.id],
    queryFn: () => payrollService.getPayrollRun(selectedRun!.id),
    enabled: !!selectedRun,
  });

  const createMutation = useMutation({
    mutationFn: payrollService.createPayrollRun,
    onSuccess: () => {
      toast.showToast(t('payroll.runCreated'), 'success');
      setShowCreateForm(false);
      setEditingRun(null);
      setFormData({
        periodYear: new Date().getFullYear(),
        periodMonth: new Date().getMonth() + 1,
        notes: '',
      });
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      payrollService.updatePayrollRun(id, data),
    onSuccess: () => {
      toast.showToast(t('payroll.runUpdated'), 'success');
      setShowCreateForm(false);
      setEditingRun(null);
      setFormData({
        periodYear: new Date().getFullYear(),
        periodMonth: new Date().getMonth() + 1,
        notes: '',
      });
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      queryClient.invalidateQueries({ queryKey: ['payrollRun'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: payrollService.deletePayrollRun,
    onSuccess: () => {
      toast.showToast(t('payroll.runDeleted'), 'success');
      setDeletingRun(null);
      setSelectedRun(null);
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      queryClient.invalidateQueries({ queryKey: ['payrollRun'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
      setDeletingRun(null);
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: payrollService.recalculateTotal,
    onSuccess: async () => {
      toast.showToast(t('payroll.totalRecalculated'), 'success');
      await queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      await queryClient.invalidateQueries({ queryKey: ['payrollRun'] });
      await queryClient.refetchQueries({ queryKey: ['payrollRun', selectedRun?.id] });
      await queryClient.refetchQueries({ queryKey: ['payrollRuns'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const lockMutation = useMutation({
    mutationFn: payrollService.lockPayrollRun,
    onSuccess: () => {
      toast.showToast(t('payroll.runLocked'), 'success');
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      queryClient.invalidateQueries({ queryKey: ['payrollRun'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, payrollRunId, data }: { itemId: string; payrollRunId: string; data: any }) =>
      payrollService.updatePayrollItem(itemId, payrollRunId, data),
    onSuccess: async () => {
      toast.showToast(t('payroll.itemUpdated'), 'success');
      setEditingItem(null);
      // Invalidate both payroll run and payroll runs list to refresh totals
      await queryClient.invalidateQueries({ queryKey: ['payrollRun'] });
      await queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      // Refetch to ensure data is updated
      await queryClient.refetchQueries({ queryKey: ['payrollRun', selectedRun?.id] });
      await queryClient.refetchQueries({ queryKey: ['payrollRuns'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('common.error'), 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRun) {
      updateMutation.mutate({ id: editingRun.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (run: PayrollRun) => {
    if (run.status === 'LOCKED' || run.status === 'PAID') {
      toast.showToast(t('payroll.cannotEditLocked'), 'error');
      return;
    }
    setEditingRun(run);
    setFormData({
      periodYear: run.periodYear,
      periodMonth: run.periodMonth,
      notes: run.notes || '',
    });
    setShowCreateForm(true);
  };

  const handleDelete = (run: PayrollRun) => {
    if (run.status === 'LOCKED' || run.status === 'PAID') {
      toast.showToast(t('payroll.cannotDeleteLocked'), 'error');
      return;
    }
    setDeletingRun(run);
  };

  const confirmDelete = () => {
    if (deletingRun) {
      deleteMutation.mutate(deletingRun.id);
    }
  };

  const handleEditItem = (item: PayrollItem) => {
    if (payrollRun?.status === 'LOCKED' || payrollRun?.status === 'PAID') {
      toast.showToast(t('payroll.cannotEditLocked'), 'error');
      return;
    }
    setEditingItem(item);
    setItemEditForm({
      bonuses: item.bonuses || 0,
      allowances: item.allowances || 0,
      transportBonus: item.transportBonus || 0,
      lunchBonus: item.lunchBonus || 0,
      thr: item.thr || 0,
      deductions: item.deductions || 0,
    });
  };

  const handleSaveItem = () => {
    if (!editingItem || !selectedRun) return;
    updateItemMutation.mutate({
      itemId: editingItem.id,
      payrollRunId: selectedRun.id,
      data: itemEditForm,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LOCKED':
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t('payroll.title')}</h2>
        <Button
          onClick={() => {
            setShowCreateForm(true);
            setEditingRun(null);
            setFormData({
              periodYear: new Date().getFullYear(),
              periodMonth: new Date().getMonth() + 1,
              notes: '',
            });
          }}
        >
          {t('payroll.createRun')}
        </Button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingRun ? t('payroll.editRun') : t('payroll.createRun')}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('payroll.periodYear')}</label>
                <input
                  type="number"
                  value={formData.periodYear}
                  onChange={(e) => setFormData({ ...formData, periodYear: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded-md"
                  required
                  min="2020"
                  max="2100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('payroll.periodMonth')}</label>
                <select
                  value={formData.periodMonth}
                  onChange={(e) => setFormData({ ...formData, periodMonth: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  {monthNames.map((month, index) => (
                    <option key={index + 1} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('payroll.notes')}</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-2 border rounded-md"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t('common.saving')
                  : editingRun
                  ? t('common.save')
                  : t('common.create')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingRun(null);
                  setFormData({
                    periodYear: new Date().getFullYear(),
                    periodMonth: new Date().getMonth() + 1,
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

      <div className="space-y-4">
        {payrollRuns.map((run) => (
          <div
            key={run.id}
            className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md"
          >
            <div className="flex justify-between items-start">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => setSelectedRun(run)}
              >
                <div className="font-semibold">
                  {monthNames[run.periodMonth - 1]} {run.periodYear}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {run.items?.length || 0} {t('payroll.employees')}
                </div>
                {run.totalAmount && (
                  <div className="text-lg font-bold text-green-600 mt-2">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                    }).format(run.totalAmount)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(run.status)}`}>
                  {run.status}
                </span>
                {(run.status === 'DRAFT' || run.status === 'PROCESSING') && (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(run);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50"
                      title={t('common.edit')}
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(run);
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50"
                      title={t('common.delete')}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                )}
              </div>
            </div>
            {run.lockedAt && (
              <div className="text-xs text-gray-500 mt-2">
                {t('payroll.lockedAt')}: {new Date(run.lockedAt).toLocaleString('id-ID')}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedRun && payrollRun && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {monthNames[payrollRun.periodMonth - 1]} {payrollRun.periodYear}
            </h3>
            <div className="flex gap-2">
              {(payrollRun.status === 'DRAFT' || payrollRun.status === 'PROCESSING') && (
                <Button
                  variant="secondary"
                  onClick={() => recalculateMutation.mutate(payrollRun.id)}
                  disabled={recalculateMutation.isPending}
                >
                  {recalculateMutation.isPending ? t('payroll.recalculating') : t('payroll.recalculate')}
                </Button>
              )}
              {payrollRun.status === 'DRAFT' && (
                <Button
                  onClick={() => lockMutation.mutate(payrollRun.id)}
                  disabled={lockMutation.isPending}
                >
                  {lockMutation.isPending ? t('payroll.locking') : t('payroll.lock')}
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('payroll.employee')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('payroll.rate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('payroll.basePay')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('payroll.overtime')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('payroll.allowances')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('payroll.bonuses')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('payroll.transportBonus')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('payroll.lunchBonus')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('payroll.thr')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('payroll.grossPay')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('payroll.deductions')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('payroll.netPay')}
                  </th>
                  {(payrollRun?.status === 'DRAFT' || payrollRun?.status === 'PROCESSING') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('common.actions')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrollRun.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.employee?.firstName} {item.employee?.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.employmentType === 'MONTHLY' && item.baseSalary && (
                        <div>
                          <div className="text-xs text-gray-500">{t('payroll.monthly')}</div>
                          <div>{new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                          }).format(item.baseSalary)}</div>
                        </div>
                      )}
                      {item.employmentType === 'HOURLY' && item.hourlyRate && (
                        <div>
                          <div className="text-xs text-gray-500">{t('payroll.hourly')}</div>
                          <div>{new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                          }).format(item.hourlyRate)}/hr</div>
                        </div>
                      )}
                      {item.employmentType === 'DAILY' && item.dailyRate && (
                        <div>
                          <div className="text-xs text-gray-500">{t('payroll.daily')}</div>
                          <div>{new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                          }).format(item.dailyRate)}/day</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                      }).format(item.basePay)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                      }).format(item.overtimePay)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                      }).format(item.allowances)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                      }).format(item.bonuses)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                      }).format(item.transportBonus || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                      }).format(item.lunchBonus || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                      }).format(item.thr || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium group relative">
                      <div className="cursor-help">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                        }).format(item.grossPay)}
                      </div>
                      <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        <div className="font-semibold mb-2">{t('payroll.grossPay')} {t('payroll.calculation')}:</div>
                        <div className="space-y-1">
                          <div>Base Pay: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.basePay)}</div>
                          <div>+ Overtime: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.overtimePay)}</div>
                          <div>+ Allowances: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.allowances)}</div>
                          <div>+ Bonuses: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.bonuses)}</div>
                          <div>+ Transport: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.transportBonus || 0)}</div>
                          <div>+ Lunch: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.lunchBonus || 0)}</div>
                          <div>+ THR: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.thr || 0)}</div>
                          <div>- Deductions: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.deductions)}</div>
                          <div className="border-t border-gray-700 pt-1 mt-1">
                            <div className="text-gray-400 text-xs mb-1">
                              Calculated: {(() => {
                                const calculated = Number(item.basePay || 0) +
                                  Number(item.overtimePay || 0) +
                                  Number(item.allowances || 0) +
                                  Number(item.bonuses || 0) +
                                  Number(item.transportBonus || 0) +
                                  Number(item.lunchBonus || 0) +
                                  Number(item.thr || 0) -
                                  Number(item.deductions || 0);
                                return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(calculated);
                              })()}
                            </div>
                            <div className="font-semibold">
                              Stored: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.grossPay)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 group relative">
                      <div className="cursor-help">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                        }).format(
                          Number(item.bpjsKesehatanEmployee || 0) +
                          Number(item.bpjsKetenagakerjaanEmployee || 0) +
                          Number(item.pph21 || 0) +
                          Number(item.deductions || 0)
                        )}
                      </div>
                      <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        <div className="font-semibold mb-2">{t('payroll.deductions')} {t('payroll.calculation')}:</div>
                        <div className="space-y-1">
                          <div>BPJS Kesehatan: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.bpjsKesehatanEmployee || 0)}</div>
                          <div>BPJS Ketenagakerjaan: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.bpjsKetenagakerjaanEmployee || 0)}</div>
                          <div>PPh 21: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.pph21 || 0)}</div>
                          <div>Other Deductions: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.deductions)}</div>
                          <div className="border-t border-gray-700 pt-1 mt-1 font-semibold">
                            = {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                              Number(item.bpjsKesehatanEmployee || 0) +
                              Number(item.bpjsKetenagakerjaanEmployee || 0) +
                              Number(item.pph21 || 0) +
                              Number(item.deductions || 0)
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 group relative">
                      <div className="cursor-help">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                        }).format(item.netPay)}
                      </div>
                      <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        <div className="font-semibold mb-2">{t('payroll.netPay')} {t('payroll.calculation')}:</div>
                        <div className="space-y-1">
                          <div>Gross Pay: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.grossPay)}</div>
                          <div>- BPJS Kesehatan: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.bpjsKesehatanEmployee || 0)}</div>
                          <div>- BPJS Ketenagakerjaan: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.bpjsKetenagakerjaanEmployee || 0)}</div>
                          <div>- PPh 21: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.pph21 || 0)}</div>
                          <div className="border-t border-gray-700 pt-1 mt-1 font-semibold">
                            = {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.netPay)}
                          </div>
                        </div>
                      </div>
                    </td>
                    {(payrollRun?.status === 'DRAFT' || payrollRun?.status === 'PROCESSING') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          {t('common.edit')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRun && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('payroll.confirmDelete')}</h3>
            <p className="text-gray-600 mb-6">
              {t('payroll.deleteConfirmationMessage', {
                period: `${monthNames[deletingRun.periodMonth - 1]} ${deletingRun.periodYear}`,
              })}
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setDeletingRun(null)}
                disabled={deleteMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                isLoading={deleteMutation.isPending}
              >
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payroll Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {t('payroll.editItem')} - {editingItem.employee?.firstName} {editingItem.employee?.lastName}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('payroll.allowances')}</label>
                <input
                  type="number"
                  value={itemEditForm.allowances}
                  onChange={(e) => setItemEditForm({ ...itemEditForm, allowances: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-md"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('payroll.bonuses')}</label>
                <input
                  type="number"
                  value={itemEditForm.bonuses}
                  onChange={(e) => setItemEditForm({ ...itemEditForm, bonuses: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-md"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('payroll.transportBonus')}</label>
                <input
                  type="number"
                  value={itemEditForm.transportBonus}
                  onChange={(e) => setItemEditForm({ ...itemEditForm, transportBonus: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-md"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('payroll.lunchBonus')}</label>
                <input
                  type="number"
                  value={itemEditForm.lunchBonus}
                  onChange={(e) => setItemEditForm({ ...itemEditForm, lunchBonus: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-md"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('payroll.thr')}</label>
                <input
                  type="number"
                  value={itemEditForm.thr}
                  onChange={(e) => setItemEditForm({ ...itemEditForm, thr: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-md"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('payroll.deductions')}</label>
                <input
                  type="number"
                  value={itemEditForm.deductions}
                  onChange={(e) => setItemEditForm({ ...itemEditForm, deductions: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border rounded-md"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button
                variant="secondary"
                onClick={() => setEditingItem(null)}
                disabled={updateItemMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSaveItem}
                disabled={updateItemMutation.isPending}
                isLoading={updateItemMutation.isPending}
              >
                {t('common.save')}
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

