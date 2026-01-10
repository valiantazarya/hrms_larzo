import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '../../hooks/useToast';
import { authService } from '../../services/auth/authService';
import { Button } from './Button';

interface ChangePasswordProps {
  onSuccess?: () => void;
}

export function ChangePassword({ onSuccess }: ChangePasswordProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showForm, setShowForm] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authService.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      toast.showToast(t('auth.changePasswordSuccess'), 'success');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowForm(false);
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || t('auth.changePasswordError');
      toast.showToast(errorMessage, 'error', 5000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.showToast(t('common.fillAllFields'), 'error');
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.showToast(t('auth.passwordMinLength'), 'error');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.showToast(t('auth.passwordMismatch'), 'error');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      toast.showToast(t('auth.newPasswordMustBeDifferent'), 'error');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };

  const handleCancel = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <div className="mt-6">
        <Button
          onClick={() => setShowForm(true)}
          variant="primary"
          fullWidth
        >
          {t('auth.changePassword')}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
      <h3 className="text-lg font-semibold mb-4">{t('auth.changePassword')}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth.currentPassword')} <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoComplete="current-password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth.newPassword')} <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoComplete="new-password"
            minLength={8}
          />
          <p className="text-xs text-gray-500 mt-1">{t('auth.passwordMinLength')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth.confirmPassword')} <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoComplete="new-password"
            minLength={8}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={changePasswordMutation.isPending}
            fullWidth
          >
            {changePasswordMutation.isPending ? t('common.saving') : t('common.save')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={changePasswordMutation.isPending}
            fullWidth
          >
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}
