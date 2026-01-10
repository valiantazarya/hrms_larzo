# HRMS API Documentation

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Endpoints

#### POST `/auth/login`
Login and receive access/refresh tokens.

**Request Body:**
```json
{
  "email": "owner@contoh.com",
  "password": "owner123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "owner@contoh.com",
    "role": "OWNER"
  }
}
```

#### POST `/auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST `/auth/logout`
Logout and invalidate refresh token.

#### POST `/auth/forgot-password`
Request password reset link.

**Request Body:**
```json
{
  "email": "owner@contoh.com"
}
```

**Response:**
```json
{
  "message": "Password reset link sent to email"
}
```

#### POST `/auth/reset-password`
Reset password using reset token.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successful"
}
```

---

## Employee Management

### GET `/employees`
Get list of employees (role-based access).

**Roles:** OWNER, MANAGER

**Query Parameters:**
- `companyId` (optional): Filter by company

**Response:**
```json
[
  {
    "id": "uuid",
    "employeeCode": "EMP001",
    "firstName": "John",
    "lastName": "Doe",
    "status": "ACTIVE",
    "employment": {
      "type": "MONTHLY",
      "baseSalary": "5000000",
      "transportBonus": "500000",
      "lunchBonus": "300000",
      "thr": "1000000",
      "hasBPJS": true
    }
  }
]
```

### POST `/employees`
Create new employee.

**Roles:** OWNER

**Request Body:**
```json
{
  "employeeCode": "EMP001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "EMPLOYEE",
  "nik": "1234567890123456",
  "joinDate": "2024-01-01",
  "employment": {
    "type": "MONTHLY",
    "baseSalary": 5000000,
    "managerId": "uuid"
  }
}
```

### PUT `/employees/:id`
Update employee.

**Roles:** OWNER

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "nik": "1234567890123456",
  "phone": "+62123456789",
  "address": "Employee Address",
  "role": "EMPLOYEE",
  "managerId": "uuid"
}
```

### PUT `/employees/:id/employment`
Create or update employee employment details.

**Roles:** OWNER

**Request Body:**
```json
{
  "type": "MONTHLY",
  "baseSalary": 5000000,
  "hourlyRate": 50000,
  "dailyRate": 200000,
  "bankName": "Bank Name",
  "bankAccount": "1234567890",
  "bankAccountName": "John Doe",
  "npwp": "123456789012345",
  "bpjsKesehatan": "1234567890123456",
  "bpjsKetenagakerjaan": "1234567890123456",
  "hasBPJS": true,
  "transportBonus": 500000,
  "lunchBonus": 300000,
  "thr": 1000000
}
```

**Note:** All fields are optional. The `type` field can be `MONTHLY`, `HOURLY`, or `DAILY`. Employment setup is optional and can be configured later.

### DELETE `/employees/:id`
Deactivate employee.

**Roles:** OWNER

---

## Company Management

### GET `/company`
Get company profile.

**Roles:** OWNER, MANAGER, EMPLOYEE

**Response:**
```json
{
  "id": "uuid",
  "name": "Company Name",
  "address": "Company Address",
  "phone": "+62123456789",
  "email": "company@example.com",
  "npwp": "123456789012345",
  "logoUrl": "https://...",
  "geofencingEnabled": true,
  "geofencingLatitude": -6.2088,
  "geofencingLongitude": 106.8456,
  "geofencingRadius": 100.0
}
```

### PUT `/company`
Update company profile.

**Roles:** OWNER

**Request Body:**
```json
{
  "name": "Updated Company Name",
  "address": "Updated Address",
  "phone": "+62123456789",
  "email": "company@example.com",
  "npwp": "123456789012345",
  "geofencingEnabled": true,
  "geofencingLatitude": -6.2088,
  "geofencingLongitude": 106.8456,
  "geofencingRadius": 100.0
}
```

**Geofencing Fields:**
- `geofencingEnabled` (boolean): Enable/disable geofencing for attendance
- `geofencingLatitude` (number, optional): Latitude of work location center
- `geofencingLongitude` (number, optional): Longitude of work location center
- `geofencingRadius` (number, optional): Radius in meters from center point

**Note:** When `geofencingEnabled` is `true`, employees must be within the specified radius to clock in/out. The system uses the Haversine formula to calculate distance.

---

## Attendance

### GET `/attendance/today`
Get today's attendance record.

**Roles:** EMPLOYEE, MANAGER, OWNER

**Response:**
```json
{
  "id": "uuid",
  "date": "2024-01-15",
  "clockIn": "2024-01-15T08:00:00Z",
  "clockOut": null,
  "status": "PRESENT",
  "workDuration": 480
}
```

### POST `/attendance/clock-in`
Clock in for today.

**Roles:** EMPLOYEE, MANAGER

**Request Body:**
```json
{
  "notes": "Optional notes",
  "latitude": -6.2088,
  "longitude": 106.8456
}
```

**Note:** If geofencing is enabled for the company, `latitude` and `longitude` are required. The system will validate that the user is within the configured geofence radius.

**Response:**
```json
{
  "id": "uuid",
  "date": "2024-01-15",
  "clockIn": "2024-01-15T08:00:00Z",
  "clockInLatitude": -6.2088,
  "clockInLongitude": 106.8456,
  "status": "PRESENT"
}
```

### POST `/attendance/clock-out`
Clock out for today.

**Roles:** EMPLOYEE, MANAGER

**Request Body:**
```json
{
  "notes": "Optional notes",
  "latitude": -6.2088,
  "longitude": 106.8456
}
```

**Note:** If geofencing is enabled for the company, `latitude` and `longitude` are required. The system will validate that the user is within the configured geofence radius.

**Response:**
```json
{
  "id": "uuid",
  "date": "2024-01-15",
  "clockIn": "2024-01-15T08:00:00Z",
  "clockOut": "2024-01-15T17:00:00Z",
  "clockOutLatitude": -6.2088,
  "clockOutLongitude": 106.8456,
  "workDuration": 540,
  "status": "PRESENT"
}
```

### GET `/attendance/list`
Get attendance list for date range.

**Query Parameters:**
- `startDate`: YYYY-MM-DD
- `endDate`: YYYY-MM-DD

### POST `/attendance/adjustments`
Request attendance adjustment.

**Roles:** EMPLOYEE, MANAGER

**Request Body:**
```json
{
  "attendanceId": "uuid",
  "clockIn": "2024-01-15T08:00:00Z",
  "clockOut": "2024-01-15T17:00:00Z",
  "reason": "Forgot to clock in"
}
```

**Note:** `breakStart` and `breakEnd` fields have been removed. Only `clockIn` and `clockOut` are supported.

### PUT `/attendance/adjustments/:id/approve`
Approve attendance adjustment.

**Roles:** MANAGER, OWNER

### PUT `/attendance/adjustments/:id/reject`
Reject attendance adjustment.

**Roles:** MANAGER, OWNER

**Request Body:**
```json
{
  "reason": "Reason for rejection"
}
```

---

## Leave Management

### GET `/leave/requests`
Get leave requests.

**Query Parameters:**
- `employeeId` (optional): Filter by employee

### POST `/leave/requests`
Create leave request.

**Roles:** EMPLOYEE

**Request Body:**
```json
{
  "leaveTypeId": "uuid",
  "startDate": "2024-02-01",
  "endDate": "2024-02-05",
  "reason": "Family vacation"
}
```

### PUT `/leave/requests/:id/approve`
Approve leave request.

**Roles:** MANAGER, OWNER

### PUT `/leave/requests/:id/reject`
Reject leave request.

**Roles:** MANAGER, OWNER

**Request Body:**
```json
{
  "reason": "Reason for rejection"
}
```

### GET `/leave/balance`
Get leave balance.

**Response:**
```json
{
  "leaveTypeId": "uuid",
  "leaveTypeName": "Cuti Tahunan",
  "accrued": 12,
  "used": 5,
  "balance": 7
}
```

---

## Overtime Management

### GET `/overtime/requests`
Get overtime requests.

**Query Parameters:**
- `employeeId` (optional): Filter by employee

### POST `/overtime/requests`
Create overtime request.

**Roles:** EMPLOYEE

**Request Body:**
```json
{
  "date": "2024-01-15",
  "startTime": "2024-01-15T18:00:00Z",
  "endTime": "2024-01-15T20:00:00Z",
  "compensationType": "PAY",
  "reason": "Urgent project deadline"
}
```

### PUT `/overtime/requests/:id/approve`
Approve overtime request.

**Roles:** MANAGER, OWNER

### PUT `/overtime/requests/:id/reject`
Reject overtime request.

**Roles:** MANAGER, OWNER

**Request Body:**
```json
{
  "reason": "Reason for rejection"
}
```

---

## Payroll

### GET `/payroll/runs`
Get payroll runs.

**Roles:** OWNER

**Query Parameters:**
- `month` (optional): YYYY-MM
- `status` (optional): DRAFT, PROCESSING, LOCKED

### POST `/payroll/runs`
Create payroll run.

**Roles:** OWNER

**Request Body:**
```json
{
  "month": "2024-01",
  "year": 2024
}
```

### POST `/payroll/runs/:id/calculate`
Calculate payroll for all employees.

**Roles:** OWNER

### PUT `/payroll/runs/:id/items/:itemId`
Update payroll item.

**Roles:** OWNER

**Request Body:**
```json
{
  "allowances": 500000,
  "bonuses": 1000000,
  "transportBonus": 500000,
  "lunchBonus": 300000,
  "thr": 1000000,
  "deductions": 200000,
  "pph21": 500000
}
```

### POST `/payroll/runs/:id/lock`
Lock payroll run (make immutable).

**Roles:** OWNER

### GET `/payroll/runs/:id/payslip/:employeeId`
Get payslip for employee.

**Roles:** EMPLOYEE, MANAGER, OWNER

---

## Reporting

### GET `/reports/attendance`
Get attendance summary report.

**Roles:** MANAGER, OWNER

**Query Parameters:**
- `startDate`: YYYY-MM-DD
- `endDate`: YYYY-MM-DD
- `employeeId` (optional)

### GET `/reports/leave`
Get leave usage report.

**Roles:** MANAGER, OWNER

**Query Parameters:**
- `startDate`: YYYY-MM-DD
- `endDate`: YYYY-MM-DD
- `employeeId` (optional)

### GET `/reports/overtime`
Get overtime cost report.

**Roles:** MANAGER, OWNER

**Query Parameters:**
- `startDate`: YYYY-MM-DD
- `endDate`: YYYY-MM-DD
- `employeeId` (optional)

### GET `/reports/payroll`
Get payroll totals report.

**Roles:** OWNER

**Query Parameters:**
- `month`: YYYY-MM

---

## Audit Logs

### GET `/audit/logs`
Get audit logs.

**Roles:** OWNER, MANAGER

**Query Parameters:**
- `entityType` (optional)
- `entityId` (optional)
- `action` (optional)
- `startDate` (optional): YYYY-MM-DD
- `endDate` (optional): YYYY-MM-DD

### GET `/audit/history`
Get entity change history.

**Roles:** OWNER, MANAGER

**Query Parameters:**
- `entityType`: Required
- `entityId`: Required

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/employees",
  "method": "POST",
  "message": "Validation failed",
  "errors": {
    "email": ["email must be an email"],
    "password": ["password must be longer than or equal to 8 characters"]
  }
}
```

### Common Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- Login endpoint: 5 requests per minute per IP
- Other endpoints: 100 requests per minute per user

---

## Security Notes

1. All passwords are hashed using bcrypt (10 salt rounds)
2. JWT tokens expire after 15 minutes (access) and 7 days (refresh)
3. Refresh tokens are rotated on each use
4. All user inputs are validated and sanitized
5. SQL injection is prevented via Prisma parameterized queries
6. CORS is configured to allow only the frontend origin


