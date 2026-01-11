import { apiClient } from './apiClient';

export interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  onLeaveDays: number;
  totalHours: number;
  totalLateMinutes?: number;
  lateByEmployee?: Array<{
    employee: {
      id: string;
      employeeCode: string;
      firstName: string;
      lastName: string;
    };
    totalLateMinutes: number;
    totalLateHours: number;
    lateCount: number;
  }>;
  attendances: any[];
}

export interface LeaveUsage {
  totalRequests: number;
  totalDays: number;
  byLeaveType: Record<string, { count: number; days: number }>;
  leaveRequests: any[];
}

export interface OvertimeCost {
  totalRequests: number;
  totalHours: number;
  totalCost: number;
  overtimeRequests: any[];
}

export interface PayrollTotals {
  payrollRuns: any[];
  totals: {
    grossPay: number;
    netPay: number;
    bpjsEmployee: number;
    bpjsEmployer: number;
    pph21: number;
  };
  items?: any[];
}

export const reportingService = {
  async getAttendanceSummary(
    startDate: string,
    endDate: string,
    employeeId?: string,
  ): Promise<AttendanceSummary> {
    const response = await apiClient.get('/reports/attendance', {
      params: { startDate, endDate, employeeId },
    });
    return response.data;
  },

  async getLeaveUsage(
    startDate: string,
    endDate: string,
    employeeId?: string,
  ): Promise<LeaveUsage> {
    const response = await apiClient.get('/reports/leave', {
      params: { startDate, endDate, employeeId },
    });
    return response.data;
  },

  async getOvertimeCost(
    startDate: string,
    endDate: string,
    employeeId?: string,
  ): Promise<OvertimeCost> {
    const response = await apiClient.get('/reports/overtime', {
      params: { startDate, endDate, employeeId },
    });
    return response.data;
  },

  async getPayrollTotals(
    periodYear?: number,
    periodMonth?: number,
  ): Promise<PayrollTotals> {
    const response = await apiClient.get('/reports/payroll', {
      params: { periodYear, periodMonth },
    });
    return response.data;
  },
};

