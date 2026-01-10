import { apiClient } from './apiClient';

export interface PayrollRun {
  id: string;
  companyId: string;
  periodYear: number;
  periodMonth: number;
  status: string;
  runDate: string | null;
  lockedAt: string | null;
  lockedBy: string | null;
  totalAmount: number | null;
  notes: string | null;
  items?: PayrollItem[];
}

export interface PayrollItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employmentType: string;
  baseSalary: number | null;
  hourlyRate: number | null;
  dailyRate: number | null;
  basePay: number;
  overtimePay: number;
  allowances: number;
  bonuses: number;
  transportBonus: number;
  lunchBonus: number;
  thr: number;
  deductions: number;
  bpjsKesehatanEmployee: number;
  bpjsKesehatanEmployer: number;
  bpjsKetenagakerjaanEmployee: number;
  bpjsKetenagakerjaanEmployer: number;
  pph21: number;
  grossPay: number;
  netPay: number;
  breakdown: any;
  notes: string | null;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  };
}

export interface Payslip {
  payrollRun: {
    id: string;
    periodYear: number;
    periodMonth: number;
    status: string;
    runDate: string | null;
  };
  employee: any;
  payrollItem: PayrollItem;
}

export const payrollService = {
  async getPayrollRuns(): Promise<PayrollRun[]> {
    const response = await apiClient.get('/payroll/runs');
    return response.data;
  },

  async getPayrollRun(id: string): Promise<PayrollRun> {
    const response = await apiClient.get(`/payroll/runs/${id}`);
    return response.data;
  },

  async createPayrollRun(data: {
    periodYear: number;
    periodMonth: number;
    notes?: string;
  }): Promise<PayrollRun> {
    const response = await apiClient.post('/payroll/runs', data);
    return response.data;
  },

  async updatePayrollRun(
    id: string,
    data: {
      periodYear?: number;
      periodMonth?: number;
      notes?: string;
    },
  ): Promise<PayrollRun> {
    const response = await apiClient.put(`/payroll/runs/${id}`, data);
    return response.data;
  },

  async deletePayrollRun(id: string): Promise<void> {
    await apiClient.delete(`/payroll/runs/${id}`);
  },

  async recalculateTotal(id: string): Promise<PayrollRun> {
    const response = await apiClient.put(`/payroll/runs/${id}/recalculate`);
    return response.data;
  },

  async lockPayrollRun(id: string): Promise<PayrollRun> {
    const response = await apiClient.put(`/payroll/runs/${id}/lock`);
    return response.data;
  },

  async updatePayrollItem(
    itemId: string,
    payrollRunId: string,
    data: {
      allowances?: number;
      bonuses?: number;
      transportBonus?: number;
      lunchBonus?: number;
      thr?: number;
      deductions?: number;
      pph21?: number;
      notes?: string;
    },
  ): Promise<PayrollItem> {
    const response = await apiClient.put(`/payroll/items/${itemId}`, data, {
      params: { payrollRunId },
    });
    return response.data;
  },

  async getMyPayslips(): Promise<any[]> {
    const response = await apiClient.get('/payroll/payslips');
    return response.data;
  },

  async getPayslip(payrollRunId: string): Promise<Payslip> {
    const response = await apiClient.get(`/payroll/payslips/${payrollRunId}`);
    return response.data;
  },
};

