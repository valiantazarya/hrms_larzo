import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../hooks/useToast';
import { useOnline } from '../../hooks/useOnline';
import { attendanceService, Attendance } from '../../services/api/attendanceService';
import { Button } from '../../components/common/Button';
import { ToastContainer } from '../../components/common/Toast';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';
import { DateTime } from 'luxon';
import ManagerPayslipsPage from './ManagerPayslipsPage';
import ManagerShiftSchedulePage from './ManagerShiftSchedulePage';
import ShiftSchedulePage from '../owner/ShiftSchedulePage';
import ManagerAttendanceAdjustment from './ManagerAttendanceAdjustment';
import { ChangePassword } from '../../components/common/ChangePassword';
import { employeeService, Employee } from '../../services/api/employeeService';

function ManagerAttendance({ onNavigateToAdjustment }: { onNavigateToAdjustment: () => void }) {
  const { t } = useTranslation();
  const isOnline = useOnline();
  const toast = useToast();
  const [status, setStatus] = useState({
    clockedIn: false,
  });

  const queryClient = useQueryClient();

  // Fetch today's attendance
  const { data: todayAttendance, error: attendanceError } = useQuery<Attendance | null>({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceService.getToday(),
  });

  // Handle query errors
  useEffect(() => {
    if (attendanceError) {
      const errorMessage = (attendanceError as any).response?.data?.message || (attendanceError as any).message || t('attendance.loadError');
      toast.showToast(errorMessage, 'error');
    }
  }, [attendanceError, toast, t]);

  // Update status from API data
  useEffect(() => {
    if (todayAttendance) {
      setStatus({
        clockedIn: !!todayAttendance.clockIn && !todayAttendance.clockOut,
      });
    } else {
      setStatus({
        clockedIn: false,
      });
    }
  }, [todayAttendance]);

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    });
  };

  const clockInMutation = useMutation({
    mutationFn: ({ latitude, longitude }: { latitude?: number; longitude?: number }) =>
      attendanceService.clockIn(undefined, latitude, longitude),
    onSuccess: () => {
      toast.showToast(t('attendance.clockedIn'), 'success');
      queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
    },
    onError: (error: any) => {
      // Extract error message from various possible locations
      const errorMessage = 
        error.response?.data?.message || 
        error.response?.data?.error || 
        (Array.isArray(error.response?.data?.errors) ? error.response?.data?.errors[0] : null) ||
        error.message || 
        '';
      
      // Check if it's the "already clocked in" error - match exact backend message
      if (
        errorMessage.includes('Already clocked in today') ||
        errorMessage.includes('Already clocked in') ||
        errorMessage.includes('sudah absen') ||
        errorMessage.toLowerCase().includes('already clocked')
      ) {
        // Show dedicated error message for already clocked in
        toast.showToast(t('attendance.alreadyClockedIn'), 'error', 5000);
        queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
      } else if (
        errorMessage.includes('shift scheduled') ||
        errorMessage.includes('do not have a shift') ||
        errorMessage.includes('tidak memiliki shift') ||
        errorMessage.toLowerCase().includes('shift')
      ) {
        // Show error for shift validation
        toast.showToast(errorMessage || t('attendance.noShiftError'), 'error', 5000);
      } else {
        // Show generic error for other failures
        const finalMessage = errorMessage || t('attendance.clockInError');
        toast.showToast(finalMessage, 'error', 5000);
      }
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: ({ latitude, longitude }: { latitude?: number; longitude?: number }) =>
      attendanceService.clockOut(undefined, latitude, longitude),
    onSuccess: () => {
      toast.showToast(t('attendance.clockedOut'), 'success');
      queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
    },
    onError: (error: any) => {
      toast.showToast(error.response?.data?.message || t('attendance.clockOutError'), 'error');
    },
  });

  const handleClockIn = async () => {
    if (!isOnline) {
      toast.showToast(t('attendance.offlineError'), 'error');
      return;
    }

    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      try {
        const location = await getCurrentLocation();
        latitude = location.latitude;
        longitude = location.longitude;
      } catch (error: any) {
        // If location is denied or unavailable, still try to clock in
        // The backend will handle validation if geofencing is enabled
      }

      clockInMutation.mutate({ latitude, longitude });
    } catch (error: any) {
      toast.showToast(error.message || t('attendance.clockInError'), 'error');
    }
  };

  const handleClockOut = async () => {
    if (!isOnline) {
      toast.showToast(t('attendance.offlineError'), 'error');
      return;
    }

    try {
      let latitude: number | undefined;
      let longitude: number | undefined;

      try {
        const location = await getCurrentLocation();
        latitude = location.latitude;
        longitude = location.longitude;
      } catch (error: any) {
        // If location is denied or unavailable, still try to clock out
        // The backend will handle validation if geofencing is enabled
      }

      clockOutMutation.mutate({ latitude, longitude });
    } catch (error: any) {
      toast.showToast(error.message || t('attendance.clockOutError'), 'error');
    }
  };

  const isLoading =
    clockInMutation.isPending ||
    clockOutMutation.isPending;

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '-';
    return DateTime.fromISO(isoString).setZone('Asia/Jakarta').toFormat('HH:mm');
  };

  const formatDuration = (minutes?: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}j ${mins}m`;
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('attendance.todayStatus')}</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">{t('attendance.clockIn')}:</span>
            <span className="font-medium">{formatTime(todayAttendance?.clockIn)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('attendance.clockOut')}:</span>
            <span className="font-medium">{formatTime(todayAttendance?.clockOut)}</span>
          </div>
          {todayAttendance?.workDuration !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">{t('attendance.workDuration')}:</span>
              <span className="font-medium">{formatDuration(todayAttendance.workDuration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Action Button */}
      <div className="space-y-4">
        {!status.clockedIn ? (
          <Button
            variant="success"
            size="lg"
            fullWidth
            onClick={handleClockIn}
            disabled={!isOnline || isLoading}
            isLoading={isLoading}
          >
            {t('attendance.clockIn')}
          </Button>
        ) : (
          <Button
            variant="danger"
            size="lg"
            fullWidth
            onClick={handleClockOut}
            disabled={!isOnline || isLoading}
            isLoading={isLoading}
          >
            {t('attendance.clockOut')}
          </Button>
        )}
        
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={onNavigateToAdjustment}
        >
          {t('attendance.requestAdjustment')}
        </Button>
      </div>

      {/* Offline Warning */}
      {!isOnline && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">{t('attendance.offlineWarning')}</p>
        </div>
      )}
    </div>
  );
}

function StockManagerProfile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();

  const { data: employee, error, isLoading } = useQuery<Employee>({
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
      <h2 className="text-2xl font-bold mb-6">{t('profile.title')}</h2>

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">{t('profile.employeeCode')}</label>
          <div className="font-semibold mt-1">{employee.employeeCode}</div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">{t('profile.name')}</label>
          <div className="font-semibold mt-1">
            {employee.firstName} {employee.lastName}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">{t('profile.email')}</label>
          <div className="mt-1">{employee.user?.email || '-'}</div>
        </div>

        {employee.nik && (
          <div>
            <label className="text-sm font-medium text-gray-700">{t('profile.nik')}</label>
            <div className="mt-1">{employee.nik}</div>
          </div>
        )}

        {employee.phone && (
          <div>
            <label className="text-sm font-medium text-gray-700">{t('profile.phone')}</label>
            <div className="mt-1">{employee.phone}</div>
          </div>
        )}

        {employee.address && (
          <div>
            <label className="text-sm font-medium text-gray-700">{t('profile.address')}</label>
            <div className="mt-1">{employee.address}</div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700">{t('profile.joinDate')}</label>
          <div className="mt-1">
            {new Date(employee.joinDate).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">{t('profile.status')}</label>
          <div className="mt-1">
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
      </div>

      {/* Change Password */}
      <ChangePassword />
    </div>
  );
}

export default function StockManagerDashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial view from URL or default to 'attendance'
  const getInitialView = (): 'attendance' | 'schedule' | 'scheduleManagement' | 'adjustment' | 'payslips' | 'profile' => {
    const tab = searchParams.get('tab');
    const validViews = ['attendance', 'schedule', 'scheduleManagement', 'adjustment', 'payslips', 'profile'];
    return (tab && validViews.includes(tab)) ? tab as any : 'attendance';
  };
  
  const [activeView, setActiveView] = useState<'attendance' | 'schedule' | 'scheduleManagement' | 'adjustment' | 'payslips' | 'profile'>(getInitialView());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const isInitialMount = useRef(true);

  // Update URL when activeView changes
  const handleViewChange = (view: 'attendance' | 'schedule' | 'scheduleManagement' | 'adjustment' | 'payslips' | 'profile') => {
    setActiveView(view);
    setSearchParams({ tab: view }, { replace: true });
  };

  // Sync with URL on mount and when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const tab = searchParams.get('tab');
    const validViews = ['attendance', 'schedule', 'scheduleManagement', 'adjustment', 'payslips', 'profile'];
    
    if (isInitialMount.current) {
      // On initial mount, ensure URL has a tab parameter
      if (!tab) {
        setSearchParams({ tab: activeView }, { replace: true });
      }
      isInitialMount.current = false;
      return;
    }
    
    // After initial mount, sync state to URL changes (e.g., browser back/forward)
    if (tab && validViews.includes(tab) && tab !== activeView) {
      setActiveView(tab as any);
    }
  }, [searchParams, activeView, setSearchParams]);

  // Primary navigation items (most frequently used)
  const primaryNavItems = [
    { key: 'attendance', label: t('nav.attendance') },
    { key: 'schedule', label: t('nav.schedule') },
  ];

  // Secondary navigation items (grouped in "More" menu)
  const secondaryNavItems = [
    { key: 'profile', label: t('profile.profile') },
    { key: 'scheduleManagement', label: t('shiftSchedule.title') },
    { key: 'adjustment', label: t('attendance.adjustmentRequests') },
    { key: 'payslips', label: t('payslip.myPayslips') },
  ];

  // All navigation items for mobile menu
  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Mobile menu button and title */}
            <div className="flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                aria-label="Toggle menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <h1 className="text-xl font-semibold ml-2 md:ml-0">{t('dashboard.stockManager')}</h1>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center space-x-4 flex-1 justify-center">
              {/* Primary nav items */}
              <div className="flex space-x-2">
                {primaryNavItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleViewChange(item.key as any)}
                    className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${
                      activeView === item.key
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* More menu dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className={`px-3 py-2 text-sm font-medium flex items-center space-x-1 ${
                    secondaryNavItems.some(item => activeView === item.key)
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <span>{t('common.more')}</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {moreMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMoreMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                      <div className="py-1">
                        {secondaryNavItems.map((item) => (
                          <button
                            key={item.key}
                            onClick={() => {
                              handleViewChange(item.key as any);
                              setMoreMenuOpen(false);
                            }}
                            className={`block w-full text-left px-4 py-2 text-sm ${
                              activeView === item.key
                                ? 'bg-indigo-50 text-indigo-600'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* User info, language switcher, and logout */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <span className="hidden sm:inline text-sm text-gray-600">{user?.email}</span>
              <LanguageSwitcher />
              <button
                onClick={logout}
                className="px-3 md:px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                {t('common.logout')}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {allNavItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      handleViewChange(item.key as any);
                      setMobileMenuOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-base font-medium rounded-md ${
                      activeView === item.key
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6">
        {activeView === 'attendance' && <ManagerAttendance onNavigateToAdjustment={() => handleViewChange('adjustment')} />}
        {activeView === 'schedule' && <ManagerShiftSchedulePage />}
        {activeView === 'scheduleManagement' && <ShiftSchedulePage />}
        {activeView === 'adjustment' && <ManagerAttendanceAdjustment />}
        {activeView === 'payslips' && <ManagerPayslipsPage />}
        {activeView === 'profile' && <StockManagerProfile />}
      </main>

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  );
}
