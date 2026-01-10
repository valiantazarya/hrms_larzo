import { apiClient } from './apiClient';

export interface Policy {
  id: string;
  companyId: string;
  type: string;
  config: Record<string, any>;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const policyService = {
  async getAll(): Promise<Policy[]> {
    const response = await apiClient.get('/policies');
    return response.data;
  },

  async getByType(type: string): Promise<Policy> {
    const response = await apiClient.get(`/policies/${type}`);
    return response.data;
  },

  async create(data: {
    type: string;
    config: Record<string, any>;
    isActive?: boolean;
  }): Promise<Policy> {
    const response = await apiClient.post('/policies', data);
    return response.data;
  },

  async update(id: string, data: {
    config?: Record<string, any>;
    isActive?: boolean;
  }): Promise<Policy> {
    const response = await apiClient.put(`/policies/${id}`, data);
    return response.data;
  },
};


