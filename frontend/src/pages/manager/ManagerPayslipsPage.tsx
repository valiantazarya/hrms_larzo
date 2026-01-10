import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { payrollService } from '../../services/api/payrollService';
import { ToastContainer } from '../../components/common/Toast';
import { Pagination } from '../../components/common/Pagination';

export default function ManagerPayslipsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const [payslipPage, setPayslipPage] = useState(1);
  const itemsPerPage = 10;

  const { data: payslips = [], isLoading, error } = useQuery({
    queryKey: ['payslips'],
    queryFn: () => payrollService.getMyPayslips(),
  });

  useEffect(() => {
    if (error) {
      const errorMessage = (error as any).response?.data?.message || (error as any).message || t('payslip.loadError');
      toast.showToast(errorMessage, 'error', 5000);
    }
  }, [error, toast, t]);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">{t('payslip.myPayslips')}</h2>

      {payslips.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {t('payslip.noPayslips')}
        </div>
      ) : (() => {
        const totalPages = Math.ceil(payslips.length / itemsPerPage);
        const startIndex = (payslipPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedPayslips = payslips.slice(startIndex, endIndex);

        return (
          <>
            <div className="space-y-4">
              {paginatedPayslips.map((payslip: any) => (
                <div
                  key={payslip.id}
                  className="bg-white p-4 rounded-lg shadow-sm border cursor-pointer hover:shadow-md"
                  onClick={() => navigate(`/manager/payslips/${payslip.payrollRun.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">
                        {monthNames[payslip.payrollRun.periodMonth - 1]} {payslip.payrollRun.periodYear}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {new Date(payslip.payrollRun.runDate || '').toLocaleDateString('id-ID')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                        }).format(payslip.netPay)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {payslip.payrollRun.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              currentPage={payslipPage}
              totalPages={totalPages}
              onPageChange={setPayslipPage}
              totalItems={payslips.length}
              itemsPerPage={itemsPerPage}
            />
          </>
        );
      })()}

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
