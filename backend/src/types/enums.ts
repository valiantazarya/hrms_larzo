export enum Role {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STOCK_MANAGER = 'STOCK_MANAGER',
  SUPERVISOR = 'SUPERVISOR',
  EMPLOYEE = 'EMPLOYEE',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
  ON_LEAVE = 'ON_LEAVE',
}

export enum EmploymentType {
  MONTHLY = 'MONTHLY',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  HALF_DAY = 'HALF_DAY',
  ON_LEAVE = 'ON_LEAVE',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum CompensationType {
  PAYOUT = 'PAYOUT',
  TIME_IN_LIEU = 'TIME_IN_LIEU',
}

export enum PolicyType {
  ATTENDANCE_RULES = 'ATTENDANCE_RULES',
  OVERTIME_POLICY = 'OVERTIME_POLICY',
  LEAVE_POLICY = 'LEAVE_POLICY',
  PAYROLL_CONFIG = 'PAYROLL_CONFIG',
}

export enum PayrollStatus {
  DRAFT = 'DRAFT',
  PROCESSING = 'PROCESSING',
  LOCKED = 'LOCKED',
  PAID = 'PAID',
}

export enum DocumentType {
  CONTRACT = 'CONTRACT',
  ID_CARD = 'ID_CARD',
  CERTIFICATE = 'CERTIFICATE',
  OTHER = 'OTHER',
}
