import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useOnline } from '../../hooks/useOnline';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/common/Button';
import { attendanceService, Attendance } from '../../services/api/attendanceService';
import { DateTime } from 'luxon';

interface AttendanceStatus {
  clockedIn: boolean;
  clockInTime?: string;
  clockOutTime?: string;
  workDuration?: number; // minutes
}

export default function AttendancePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isOnline = useOnline();
  const toast = useToast();
  const [status, setStatus] = useState<AttendanceStatus>({
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
      const error = attendanceError as any;
      const errorMessage = 
        error.response?.data?.message || 
        error.response?.data?.error || 
        (Array.isArray(error.response?.data?.errors) ? error.response?.data?.errors[0] : null) ||
        error.message || 
        t('attendance.loadError');
      toast.error(errorMessage, 5000);
    }
  }, [attendanceError, toast, t]);

  // Update status from API data
  useEffect(() => {
    if (todayAttendance) {
      setStatus({
        clockedIn: !!todayAttendance.clockIn && !todayAttendance.clockOut,
        clockInTime: todayAttendance.clockIn || undefined,
        clockOutTime: todayAttendance.clockOut || undefined,
        workDuration: todayAttendance.workDuration || undefined,
      });
    } else {
      setStatus({
        clockedIn: false,
      });
    }
  }, [todayAttendance]);

  const clockInMutation = useMutation({
    mutationFn: ({ latitude, longitude }: { latitude?: number; longitude?: number }) =>
      attendanceService.clockIn(undefined, latitude, longitude),
    onSuccess: () => {
      toast.success(t('attendance.clockedIn'));
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
        toast.error(t('attendance.alreadyClockedIn'), 5000);
        // Refresh attendance data to update UI
        queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
      } else if (
        errorMessage.includes('shift scheduled') ||
        errorMessage.includes('do not have a shift') ||
        errorMessage.includes('tidak memiliki shift') ||
        errorMessage.toLowerCase().includes('shift')
      ) {
        // Show error for shift validation
        const shiftErrorMessage = errorMessage || t('attendance.noShiftError');
        toast.error(shiftErrorMessage, 5000);
      } else {
        // Show generic error for other failures
        const finalMessage = errorMessage || t('attendance.clockInError');
        toast.error(finalMessage, 5000);
      }
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: ({ latitude, longitude }: { latitude?: number; longitude?: number }) =>
      attendanceService.clockOut(undefined, latitude, longitude),
    onSuccess: () => {
      toast.success(t('attendance.clockedOut'));
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
      
      // Check for shift validation error
      if (
        errorMessage.includes('shift scheduled') ||
        errorMessage.includes('do not have a shift') ||
        errorMessage.includes('tidak memiliki shift') ||
        errorMessage.toLowerCase().includes('shift')
      ) {
        toast.error(errorMessage || t('attendance.noShiftError'), 5000);
      } else {
        const finalMessage = errorMessage || t('attendance.clockOutError');
        toast.error(finalMessage, 5000);
      }
    },
  });


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

  const handleClockIn = async () => {
    if (!isOnline) {
      toast.error(t('attendance.offlineError'));
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
      toast.error(error.message || t('attendance.clockInError'));
    }
  };

  const handleClockOut = async () => {
    if (!isOnline) {
      toast.error(t('attendance.offlineError'));
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
      toast.error(error.message || t('attendance.clockOutError'));
    }
  };

  const isLoading =
    clockInMutation.isPending ||
    clockOutMutation.isPending;

  const formatTime = (isoString?: string) => {
    if (!isoString) return '-';
    return DateTime.fromISO(isoString).setZone('Asia/Jakarta').toFormat('HH:mm');
  };

  const formatDuration = (minutes?: number) => {
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
            <span className="font-medium">{formatTime(status.clockInTime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('attendance.clockOut')}:</span>
            <span className="font-medium">{formatTime(status.clockOutTime)}</span>
          </div>
          {status.workDuration !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">{t('attendance.workDuration')}:</span>
              <span className="font-medium">{formatDuration(status.workDuration)}</span>
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
      </div>

      {/* Adjustment Request Link */}
      <div className="mt-6">
        <Button
          variant="secondary"
          fullWidth
          onClick={() => navigate('/employee/attendance/adjustment')}
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

