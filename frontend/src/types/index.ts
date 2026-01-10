export enum Role {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STOCK_MANAGER = 'STOCK_MANAGER',
  SUPERVISOR = 'SUPERVISOR',
  EMPLOYEE = 'EMPLOYEE',
}

export interface User {
  id: string;
  email: string;
  role: Role;
  employee?: Employee;
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  status: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}


