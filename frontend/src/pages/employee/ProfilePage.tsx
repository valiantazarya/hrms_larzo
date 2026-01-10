import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { employeeService, Employee } from '../../services/api/employeeService';
import { Button } from '../../components/common/Button';
import { ToastContainer } from '../../components/common/Toast';
import { ChangePassword } from '../../components/common/ChangePassword';
import { Role } from '../../types';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: employee, error } = useQuery<Employee>({
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

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold">{t('profile.title')}</h2>

      {employee ? (
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <div>
            <label className="text-sm text-gray-600">{t('profile.employeeCode')}</label>
            <div className="font-semibold">{employee.employeeCode}</div>
          </div>

          <div>
            <label className="text-sm text-gray-600">{t('profile.name')}</label>
            <div className="font-semibold">
              {employee.firstName} {employee.lastName}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600">{t('profile.email')}</label>
            <div>{employee.user?.email || '-'}</div>
          </div>

          {employee.nik && (
            <div>
              <label className="text-sm text-gray-600">{t('profile.nik')}</label>
              <div>{employee.nik}</div>
            </div>
          )}

          {employee.phone && (
            <div>
              <label className="text-sm text-gray-600">{t('profile.phone')}</label>
              <div>{employee.phone}</div>
            </div>
          )}

          {employee.address && (
            <div>
              <label className="text-sm text-gray-600">{t('profile.address')}</label>
              <div>{employee.address}</div>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600">{t('profile.joinDate')}</label>
            <div>
              {new Date(employee.joinDate).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600">{t('profile.status')}</label>
            <div>
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

          {employee.employment && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3">{t('profile.employment')}</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-sm text-gray-600">{t('profile.employmentType')}</label>
                  <div>{employee.employment.type}</div>
                </div>
                {employee.employment.baseSalary && (
                  <div>
                    <label className="text-sm text-gray-600">{t('profile.baseSalary')}</label>
                    <div>
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                      }).format(employee.employment.baseSalary)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>
      )}

      {/* Change Password - Show for all roles except OWNER */}
      {user?.role !== Role.OWNER && <ChangePassword />}

      {/* Payslips Link */}
      <div className="mt-6">
        <Button
          onClick={() => navigate('/employee/payslips')}
          variant="secondary"
          fullWidth
        >
          {t('payslip.viewPayslips')}
        </Button>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}

