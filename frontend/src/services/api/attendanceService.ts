import { apiClient } from './apiClient';

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  workDuration: number | null;
  status: string;
  notes: string | null;
}

export interface AttendanceAdjustment {
  id: string;
  employeeId: string;
  attendanceId: string;
  clockIn: string | null;
  clockOut: string | null;
  reason: string;
  status: string;
  requestedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  approver?: {
    id: string;
    email: string;
    role: string;
    name: string;
  } | null;
  requester?: {
    id: string;
    email: string;
    role: string;
    name: string;
  } | null;
}

export const attendanceService = {
  async getToday(): Promise<Attendance | null> {
    const response = await apiClient.get('/attendance');
    return response.data;
  },

  async getList(startDate: string, endDate: string, employeeId?: string): Promise<Attendance[]> {
    // If employeeId is provided, use the team endpoint (for managers)
    // Otherwise, use the regular endpoint (for employees viewing their own)
    const endpoint = employeeId ? '/attendance/team' : '/attendance';
    const params = employeeId 
      ? { employeeId, startDate, endDate }
      : { startDate, endDate };
    const response = await apiClient.get(endpoint, { params });
    return response.data;
  },

  async clockIn(notes?: string, latitude?: number, longitude?: number): Promise<Attendance> {
    const response = await apiClient.post('/attendance/clock-in', { 
      notes,
      latitude,
      longitude,
    });
    return response.data;
  },

  async clockOut(notes?: string, latitude?: number, longitude?: number): Promise<Attendance> {
    const response = await apiClient.post('/attendance/clock-out', { 
      notes,
      latitude,
      longitude,
    });
    return response.data;
  },

  async getAdjustments(employeeId?: string): Promise<AttendanceAdjustment[]> {
    const response = await apiClient.get('/attendance/adjustments', {
      params: employeeId ? { employeeId } : {},
    });
    return response.data;
  },

  async requestAdjustment(data: {
    attendanceId: string;
    clockIn?: string;
    clockOut?: string;
    reason: string;
  }): Promise<AttendanceAdjustment> {
    const response = await apiClient.post('/attendance/adjustments', data);
    return response.data;
  },

  async approveAdjustment(id: string): Promise<void> {
    await apiClient.put(`/attendance/adjustments/${id}/approve`);
  },

  async rejectAdjustment(id: string, reason: string): Promise<void> {
    await apiClient.put(`/attendance/adjustments/${id}/reject`, { reason });
  },

  async updateAdjustment(
    id: string,
    data: {
      clockIn?: string;
      clockOut?: string;
      reason?: string;
    },
  ): Promise<AttendanceAdjustment> {
    const response = await apiClient.put(`/attendance/adjustments/${id}`, data);
    return response.data;
  },

  async deleteAdjustment(id: string): Promise<void> {
    await apiClient.delete(`/attendance/adjustments/${id}`);
  },
};

