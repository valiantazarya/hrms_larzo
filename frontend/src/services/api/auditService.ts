import { apiClient } from './apiClient';

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: any;
  after: any;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor?: {
    id: string;
    email: string;
    role: string;
    employee?: {
      id: string;
      employeeCode: string;
      firstName: string;
      lastName: string;
    };
  };
}

export const auditService = {
  async getLogs(filters?: {
    entityType?: string;
    entityId?: string;
    action?: string;
    actorId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AuditLog[]> {
    const response = await apiClient.get('/audit/logs', {
      params: filters,
    });
    return response.data;
  },

  async getEntityHistory(entityType: string, entityId: string): Promise<AuditLog[]> {
    const response = await apiClient.get('/audit/history', {
      params: { entityType, entityId },
    });
    return response.data;
  },
};


