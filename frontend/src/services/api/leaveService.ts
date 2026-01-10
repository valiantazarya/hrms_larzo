import { apiClient } from './apiClient';

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  nameId?: string;
  isPaid: boolean;
  accrualRate: number | string | null;
  maxBalance: number | null;
  carryoverAllowed: boolean;
  carryoverMax: number | null;
  expiresAfterMonths: number | null;
  requiresAttachment: boolean;
  isActive: boolean;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  balance: number | string; // Can be number or string (Decimal from Prisma)
  accrued: number | string;
  used: number | string;
  carriedOver: number | string;
  expired: number | string;
  periodYear: number;
  periodMonth: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  attachmentUrl: string | null;
  status: string;
  requestedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  leaveType?: LeaveType;
  approver?: {
    id: string;
    email: string;
    role: string;
    name: string;
  } | null;
}

export const leaveService = {
  async getLeaveTypes(includeInactive = false): Promise<LeaveType[]> {
    const response = await apiClient.get('/leave/types', {
      params: includeInactive ? { includeInactive: 'true' } : {},
    });
    return response.data;
  },

  async updateLeaveType(
    id: string,
    data: {
      name?: string;
      nameId?: string;
      isPaid?: boolean;
      maxBalance?: number;
      accrualRate?: number;
      carryoverAllowed?: boolean;
      carryoverMax?: number;
      expiresAfterMonths?: number;
      requiresAttachment?: boolean;
      isActive?: boolean;
    },
  ): Promise<LeaveType> {
    const response = await apiClient.put(`/leave/types/${id}`, data);
    return response.data;
  },

  async getBalance(leaveTypeId: string): Promise<LeaveBalance> {
    const response = await apiClient.get('/leave/balance', {
      params: { leaveTypeId },
    });
    return response.data;
  },

  async getRequests(employeeId?: string): Promise<LeaveRequest[]> {
    const response = await apiClient.get('/leave/requests', {
      params: employeeId ? { employeeId } : {},
    });
    return response.data;
  },

  async createRequest(data: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
    attachmentUrl?: string;
  }): Promise<LeaveRequest> {
    const response = await apiClient.post('/leave/requests', data);
    return response.data;
  },

  async approveRequest(id: string): Promise<void> {
    await apiClient.put(`/leave/requests/${id}/approve`);
  },

  async rejectRequest(id: string, reason: string): Promise<void> {
    await apiClient.put(`/leave/requests/${id}/reject`, { reason });
  },

  async updateRequest(
    id: string,
    data: {
      leaveTypeId?: string;
      startDate?: string;
      endDate?: string;
      reason?: string;
      attachmentUrl?: string;
    },
  ): Promise<LeaveRequest> {
    const response = await apiClient.put(`/leave/requests/${id}`, data);
    return response.data;
  },

  async deleteRequest(id: string): Promise<void> {
    await apiClient.delete(`/leave/requests/${id}`);
  },
};

