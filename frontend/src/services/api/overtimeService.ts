import { apiClient } from './apiClient';

export interface OvertimeRequest {
  id: string;
  employeeId: string;
  date: string;
  duration: number;
  reason: string;
  notes: string | null;
  calculatedAmount: number | null;
  calculatedPay?: number | null; // Alias for calculatedAmount for backward compatibility
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
}

export const overtimeService = {
  async getRequests(employeeId?: string): Promise<OvertimeRequest[]> {
    const response = await apiClient.get('/overtime/requests', {
      params: employeeId ? { employeeId } : {},
    });
    return response.data;
  },

  async createRequest(data: {
    date: string;
    duration: number;
    reason: string;
    notes?: string;
  }): Promise<OvertimeRequest> {
    const response = await apiClient.post('/overtime/requests', data);
    return response.data;
  },

  async approveRequest(id: string): Promise<void> {
    await apiClient.put(`/overtime/requests/${id}/approve`);
  },

  async rejectRequest(id: string, reason: string): Promise<void> {
    await apiClient.put(`/overtime/requests/${id}/reject`, { reason });
  },

  async updateRequest(
    id: string,
    data: {
      date?: string;
      duration?: number;
      reason?: string;
      notes?: string;
    },
  ): Promise<OvertimeRequest> {
    const response = await apiClient.put(`/overtime/requests/${id}`, data);
    return response.data;
  },

  async deleteRequest(id: string): Promise<void> {
    await apiClient.delete(`/overtime/requests/${id}`);
  },
};

