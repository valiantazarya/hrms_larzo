import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { payrollService, Payslip } from '../../services/api/payrollService';
import { Button } from '../../components/common/Button';
import { ToastContainer } from '../../components/common/Toast';

export default function PayslipPage() {
  const { t } = useTranslation();
  const { payrollRunId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: payslip, isLoading, error } = useQuery<Payslip>({
    queryKey: ['payslip', payrollRunId],
    queryFn: () => payrollService.getPayslip(payrollRunId!),
    enabled: !!payrollRunId,
  });

  useEffect(() => {
    if (error) {
      const errorMessage = (error as any).response?.data?.message || (error as any).message || t('payslip.loadError');
      toast.showToast(errorMessage, 'error', 5000);
    }
  }, [error, toast, t]);

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('common.loading')}</p>
      </div>
    );
  }

  if (!payslip) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600">{t('payslip.notFound')}</p>
        <Button onClick={() => navigate('/employee/me')} className="mt-4">
          {t('common.back')}
        </Button>
      </div>
    );
  }

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const item = payslip.payrollItem;
  const breakdown = typeof item.breakdown === 'string' ? JSON.parse(item.breakdown) : item.breakdown;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Button 
        onClick={() => navigate(-1)} 
        variant="secondary" 
        className="mb-4"
      >
        ← {t('common.back')}
      </Button>

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="border-b pb-4 mb-4">
          <h2 className="text-2xl font-bold">{t('payslip.title')}</h2>
          <div className="text-sm text-gray-600 mt-2">
            {monthNames[payslip.payrollRun.periodMonth - 1]} {payslip.payrollRun.periodYear}
          </div>
        </div>

        {/* Company Info */}
        {payslip.employee?.company && (
          <div className="mb-4 text-sm">
            <div className="font-semibold">{payslip.employee.company.name}</div>
            {payslip.employee.company.address && (
              <div className="text-gray-600">{payslip.employee.company.address}</div>
            )}
          </div>
        )}

        {/* Employee Info */}
        <div className="mb-6">
          <div className="font-semibold">
            {payslip.employee?.firstName} {payslip.employee?.lastName}
          </div>
          <div className="text-sm text-gray-600">
            {t('profile.employeeCode')}: {payslip.employee?.employeeCode}
          </div>
        </div>

        {/* Earnings */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">{t('payslip.earnings')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>{t('payslip.basePay')}</span>
              <span className="font-medium">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                }).format(item.basePay)}
              </span>
            </div>
            {item.overtimePay > 0 && (
              <div className="flex justify-between">
                <span>{t('payslip.overtime')}</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(item.overtimePay)}
                </span>
              </div>
            )}
            {item.allowances > 0 && (
              <div className="flex justify-between">
                <span>{t('payslip.allowances')}</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(item.allowances)}
                </span>
              </div>
            )}
            {item.bonuses > 0 && (
              <div className="flex justify-between">
                <span>{t('payslip.bonuses')}</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(item.bonuses)}
                </span>
              </div>
            )}
            {item.transportBonus > 0 && (
              <div className="flex justify-between">
                <span>{t('payslip.transportBonus')}</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(item.transportBonus)}
                </span>
              </div>
            )}
            {item.lunchBonus > 0 && (
              <div className="flex justify-between">
                <span>{t('payslip.lunchBonus')}</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(item.lunchBonus)}
                </span>
              </div>
            )}
            {item.thr > 0 && (
              <div className="flex justify-between">
                <span>{t('payslip.thr')}</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(item.thr)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Deductions */}
        <div className="mb-4 border-t pt-4">
          <h3 className="font-semibold mb-2">{t('payslip.deductions')}</h3>
          <div className="space-y-2">
            {item.bpjsKesehatanEmployee > 0 && (
              <div className="flex justify-between">
                <span>{t('payslip.bpjsKesehatan')}</span>
                <span className="font-medium text-red-600">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(item.bpjsKesehatanEmployee)}
                </span>
              </div>
            )}
            {item.bpjsKetenagakerjaanEmployee > 0 && (
              <div className="flex justify-between">
                <span>{t('payslip.bpjsKetenagakerjaan')}</span>
                <span className="font-medium text-red-600">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(item.bpjsKetenagakerjaanEmployee)}
                </span>
              </div>
            )}
            {item.pph21 > 0 && (
              <div className="flex justify-between">
                <span>{t('payslip.pph21')}</span>
                <span className="font-medium text-red-600">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(item.pph21)}
                </span>
              </div>
            )}
            {item.deductions > 0 && (
              <div className="flex justify-between">
                <span>{t('payslip.otherDeductions')}</span>
                <span className="font-medium text-red-600">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(item.deductions)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-lg">
            <span className="font-semibold">{t('payslip.grossPay')}</span>
            <span className="font-bold">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
              }).format(item.grossPay)}
            </span>
          </div>
          <div className="flex justify-between text-xl">
            <span className="font-bold">{t('payslip.netPay')}</span>
            <span className="font-bold text-green-600">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
              }).format(item.netPay)}
            </span>
          </div>
        </div>

        {/* Breakdown */}
        {breakdown && (
          <div className="mt-6 border-t pt-4 text-sm text-gray-600">
            <div className="grid grid-cols-2 gap-2">
              {breakdown.attendances && (
                <div>
                  {t('payslip.attendanceDays')}: {breakdown.attendances}
                </div>
              )}
              {breakdown.totalHours && (
                <div>
                  {t('payslip.totalHours')}: {breakdown.totalHours.toFixed(1)}
                </div>
              )}
              {breakdown.overtimeHours && (
                <div>
                  {t('payslip.overtimeHours')}: {breakdown.overtimeHours.toFixed(1)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}

