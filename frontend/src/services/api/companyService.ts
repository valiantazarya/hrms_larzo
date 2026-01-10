import { apiClient } from './apiClient';

export interface Company {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  npwp: string | null;
  geofencingEnabled: boolean;
  geofencingLatitude: number | null;
  geofencingLongitude: number | null;
  geofencingRadius: number | null;
  createdAt: string;
  updatedAt: string;
}

export const companyService = {
  async get(): Promise<Company> {
    const response = await apiClient.get('/company');
    return response.data;
  },

  async update(data: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    npwp?: string;
    geofencingEnabled?: boolean;
    geofencingLatitude?: number;
    geofencingLongitude?: number;
    geofencingRadius?: number;
  }): Promise<Company> {
    const response = await apiClient.put('/company', data);
    return response.data;
  },
};


