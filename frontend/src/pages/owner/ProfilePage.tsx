import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { employeeService, Employee } from '../../services/api/employeeService';
import { Button } from '../../components/common/Button';
import { ToastContainer } from '../../components/common/Toast';
import { ChangePassword } from '../../components/common/ChangePassword';

export default function OwnerProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    nik: '',
    phone: '',
    address: '',
  });

  const { data: employee, error, isLoading } = useQuery<Employee>({
    queryKey: ['employee', 'me'],
    queryFn: async () => {
      if (!user?.employee?.id) throw new Error('Employee not found');
      return employeeService.getOne(user.employee.id);
    },
    enabled: !!user?.employee?.id,
  });

  // Initialize form data when employee data is loaded
  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.user?.email || '',
        nik: employee.nik || '',
        phone: employee.phone || '',
        address: employee.address || '',
      });
    }
  }, [employee]);

  useEffect(() => {
    if (error) {
      const errorMessage = (error as any).response?.data?.message || (error as any).message || t('common.error');
      toast.showToast(errorMessage, 'error', 5000);
    }
  }, [error, toast, t]);

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (!user?.employee?.id) throw new Error('Employee not found');
      return employeeService.update(user.employee.id, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        nik: data.nik || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
      });
    },
    onSuccess: async () => {
      toast.showToast(t('profile.updated'), 'success');
      setIsEditing(false);
      await queryClient.invalidateQueries({ queryKey: ['employee', 'me'] });
      await queryClient.refetchQueries({ queryKey: ['employee', 'me'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || t('common.error');
      toast.showToast(errorMessage, 'error', 5000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.showToast(t('common.fillAllFields'), 'error');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.showToast(t('auth.email') + ' ' + t('common.error'), 'error');
      return;
    }

    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.user?.email || '',
        nik: employee.nik || '',
        phone: employee.phone || '',
        address: employee.address || '',
      });
    }
    setIsEditing(false);
  };

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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t('profile.title')}</h2>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="primary"
          >
            {t('common.edit')}
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
        {/* Employee Code - Read Only */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.employeeCode')}
          </label>
          <div className="text-gray-900 font-semibold">{employee.employeeCode}</div>
        </div>

        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('owner.firstName')} <span className="text-red-500">*</span>
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          ) : (
            <div className="text-gray-900">{employee.firstName}</div>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('owner.lastName')} <span className="text-red-500">*</span>
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          ) : (
            <div className="text-gray-900">{employee.lastName}</div>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.email')} <span className="text-red-500">*</span>
          </label>
          {isEditing ? (
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          ) : (
            <div className="text-gray-900">{employee.user?.email || '-'}</div>
          )}
        </div>

        {/* NIK */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.nik')}
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.nik}
              onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ) : (
            <div className="text-gray-900">{employee.nik || '-'}</div>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.phone')}
          </label>
          {isEditing ? (
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ) : (
            <div className="text-gray-900">{employee.phone || '-'}</div>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.address')}
          </label>
          {isEditing ? (
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
            />
          ) : (
            <div className="text-gray-900">{employee.address || '-'}</div>
          )}
        </div>

        {/* Join Date - Read Only */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.joinDate')}
          </label>
          <div className="text-gray-900">
            {new Date(employee.joinDate).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>

        {/* Status - Read Only */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.status')}
          </label>
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

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              variant="primary"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
          </div>
        )}
      </form>

      {/* Change Password */}
      <ChangePassword />

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
