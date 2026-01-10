import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import EmployeeLayout from './pages/employee/EmployeeLayout';
import AttendancePage from './pages/employee/AttendancePage';
import AttendanceAdjustmentPage from './pages/employee/AttendanceAdjustmentPage';
import LeavePage from './pages/employee/LeavePage';
import OvertimePage from './pages/employee/OvertimePage';
import ProfilePage from './pages/employee/ProfilePage';
import PayslipsPage from './pages/employee/PayslipsPage';
import PayslipPage from './pages/employee/PayslipPage';
import ShiftSchedulePage from './pages/employee/ShiftSchedulePage';
import ManagerDashboard from './pages/manager/Dashboard';
import StockManagerDashboard from './pages/manager/StockManagerDashboard';
import ManagerPayslipPage from './pages/manager/ManagerPayslipPage';
import OwnerDashboard from './pages/owner/Dashboard';
import { Role } from './types';

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // Check if user exists (either from state or localStorage as fallback)
  // This handles the case where state hasn't updated yet after login
  const storedUser = localStorage.getItem('user');
  const hasUser = user || (storedUser && localStorage.getItem('accessToken'));

  if (!hasUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Use user from state, or parse from localStorage if state hasn't updated yet
  const currentUser = user || (storedUser ? JSON.parse(storedUser) : null);
  
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Role-based routing
  const userRole = currentUser.role as Role;
  
  if (userRole === Role.OWNER) {
    return (
      <Routes>
        <Route path="/owner/*" element={<OwnerDashboard />} />
        <Route path="*" element={<Navigate to="/owner" replace />} />
      </Routes>
    );
  }

  if (userRole === Role.MANAGER) {
    return (
      <Routes>
        <Route path="/manager/payslips/:payrollRunId" element={<ManagerPayslipPage />} />
        <Route path="/manager/*" element={<ManagerDashboard />} />
        <Route path="*" element={<Navigate to="/manager" replace />} />
      </Routes>
    );
  }

  if (userRole === Role.STOCK_MANAGER) {
    return (
      <Routes>
        <Route path="/manager/payslips/:payrollRunId" element={<ManagerPayslipPage />} />
        <Route path="/manager/*" element={<StockManagerDashboard />} />
        <Route path="*" element={<Navigate to="/manager" replace />} />
      </Routes>
    );
  }

  // Employee and Supervisor - Mobile-first with bottom navigation
  return (
    <Routes>
      <Route path="/employee" element={<EmployeeLayout />}>
        <Route index element={<Navigate to="/employee/attendance" replace />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="attendance/adjustment" element={<AttendanceAdjustmentPage />} />
        <Route path="leave" element={<LeavePage />} />
        <Route path="overtime" element={<OvertimePage />} />
        <Route path="me" element={<ProfilePage />} />
        <Route path="payslips" element={<PayslipsPage />} />
        <Route path="payslips/:payrollRunId" element={<PayslipPage />} />
        <Route path="schedule" element={<ShiftSchedulePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/employee/attendance" replace />} />
    </Routes>
  );
}

export default AppRoutes;

