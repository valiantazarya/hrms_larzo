import { apiClient } from './apiClient';

export interface ShiftSchedule {
  id: string;
  employeeId: string;
  companyId: string;
  dayOfWeek: number | null; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (null for date-specific)
  date: string | null; // Specific date (YYYY-MM-DD) for date-specific schedules (null for recurring)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string | null;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
  };
}

export interface WeeklySchedule {
  weekStart: string;
  weekEnd: string;
  schedules: Array<{
    employee: {
      id: string;
      employeeCode: string;
      firstName: string;
      lastName: string;
    };
    weekSchedule: Array<{
      date: string;
      dayOfWeek: number;
      schedule: ShiftSchedule | null;
    }>;
  }>;
}

export interface CreateShiftScheduleDto {
  employeeId: string;
  dayOfWeek?: number; // For recurring schedules (0-6)
  date?: string; // For date-specific schedules (YYYY-MM-DD)
  startTime: string;
  endTime: string;
  isActive?: boolean;
  notes?: string;
}

export interface UpdateShiftScheduleDto {
  dayOfWeek?: number | null;
  date?: string | null;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
  notes?: string;
}

export const shiftScheduleService = {
  async getAll(employeeId?: string, weekStartDate?: string, startDate?: string, endDate?: string): Promise<ShiftSchedule[] | WeeklySchedule> {
    const params = new URLSearchParams();
    if (employeeId) params.append('employeeId', employeeId);
    if (weekStartDate) params.append('weekStartDate', weekStartDate);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await apiClient.get(`/shift-schedules?${params.toString()}`);
    return response.data;
  },

  async getOne(id: string): Promise<ShiftSchedule> {
    const response = await apiClient.get(`/shift-schedules/${id}`);
    return response.data;
  },

  async create(data: CreateShiftScheduleDto): Promise<ShiftSchedule> {
    const response = await apiClient.post('/shift-schedules', data);
    return response.data;
  },

  async update(id: string, data: UpdateShiftScheduleDto): Promise<ShiftSchedule> {
    const response = await apiClient.put(`/shift-schedules/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/shift-schedules/${id}`);
  },
};
