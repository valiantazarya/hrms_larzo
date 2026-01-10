import { apiClient } from './apiClient';

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  nik: string | null;
  phone: string | null;
  address: string | null;
  joinDate: string;
  status: string;
  managerId: string | null;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  employment?: Employment;
}

export interface Employment {
  id: string;
  employeeId: string;
  type: string;
  baseSalary: number | null;
  hourlyRate: number | null;
  dailyRate: number | null;
  bankName: string | null;
  bankAccount: string | null;
  bankAccountName: string | null;
  npwp: string | null;
  bpjsKesehatan: string | null;
  bpjsKetenagakerjaan: string | null;
  hasBPJS: boolean;
  transportBonus: number | null;
  lunchBonus: number | null;
  thr: number | null;
}

export const employeeService = {
  async getAll(): Promise<Employee[]> {
    const response = await apiClient.get('/employees');
    return response.data;
  },

  async getOne(id: string): Promise<Employee> {
    const response = await apiClient.get(`/employees/${id}`);
    return response.data;
  },

  async create(data: {
    email: string;
    password: string;
    role: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    nik?: string;
    phone?: string;
    address?: string;
    joinDate: string;
    status?: string;
    managerId?: string;
  }): Promise<Employee> {
    const response = await apiClient.post('/employees', data);
    return response.data;
  },

  async update(id: string, data: Partial<Employee> & { role?: string; email?: string }): Promise<Employee> {
    const response = await apiClient.put(`/employees/${id}`, data);
    return response.data;
  },

  async updateEmployment(id: string, data: {
    type: string;
    baseSalary?: number;
    hourlyRate?: number;
    dailyRate?: number;
    bankName?: string;
    bankAccount?: string;
    bankAccountName?: string;
    npwp?: string;
    bpjsKesehatan?: string;
    bpjsKetenagakerjaan?: string;
    hasBPJS?: boolean;
    transportBonus?: number;
    lunchBonus?: number;
    thr?: number;
  }): Promise<Employment> {
    const response = await apiClient.put(`/employees/${id}/employment`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/employees/${id}`);
  },
};

