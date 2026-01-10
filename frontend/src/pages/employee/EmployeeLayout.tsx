import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { MobileLayout } from '../../components/layout/MobileLayout';
import { BottomNav } from '../../components/layout/BottomNav';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';

export default function EmployeeLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    {
      path: '/employee/attendance',
      icon: '🕐',
      label: 'Attendance',
      labelKey: 'nav.attendance',
    },
    {
      path: '/employee/schedule',
      icon: '📋',
      label: 'Schedule',
      labelKey: 'nav.schedule',
    },
    {
      path: '/employee/leave',
      icon: '📅',
      label: 'Leave',
      labelKey: 'nav.leave',
    },
    {
      path: '/employee/overtime',
      icon: '⏰',
      label: 'Overtime',
      labelKey: 'nav.overtime',
    },
    {
      path: '/employee/me',
      icon: '👤',
      label: 'Profile',
      labelKey: 'nav.profile',
    },
  ];

  return (
    <MobileLayout
      bottomNav={<BottomNav items={navItems} />}
    >
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-semibold">{t('dashboard.employee')}</h1>
          <div className="flex items-center space-x-2">
            <LanguageSwitcher />
            <button
              onClick={logout}
              className="px-3 md:px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              aria-label={t('common.logout')}
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <Outlet />
    </MobileLayout>
  );
}

