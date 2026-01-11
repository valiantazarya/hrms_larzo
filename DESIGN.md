# HRMS System Design Document
## Production-Ready HRMS for Single Company in Indonesia

---

## 1. MVP vs V1 SCOPE

### MVP (Minimum Viable Product) - Core Functionality

**Organization & Policies**
- ✅ Company profile (name, address, NPWP)
- ✅ Public holiday calendar (Indonesia - manual entry, no API integration)
- ✅ Basic attendance rules (grace period, rounding)
- ✅ Overtime policies (weekday, weekend, holiday multipliers)
- ✅ Leave policies (accrual rate, max balance, carryover rules)
- ✅ Payroll component configuration (BPJS rates, allowances, deductions)

**Users & Employees**
- ✅ Employee CRUD with basic profile
- ✅ Employment info (type, salary/rate, bank account, NPWP)
- ✅ Manager assignment (hierarchy)
- ✅ Document upload (contract, ID) - basic versioning
- ⚠️ Document versioning UI (basic, no diff view)

**Attendance**
- ✅ Clock in/out with timestamp
- ✅ Geofencing (location-based clock in/out validation)
- ✅ Work duration calculation (flexible schedule)
- ✅ Missing punch detection
- ✅ Manual adjustment request (with approval workflow)
- ⚠️ Anomaly detection (basic rules only, no ML)

**Leave Management**
- ✅ Leave types: Cuti Tahunan, Sakit, Izin, Unpaid, Maternity/Paternity
- ✅ Leave accrual calculation (monthly)
- ✅ Leave balance tracking
- ✅ Carryover & expiry handling
- ✅ Leave request with attachment (sick leave)
- ✅ Manager approval workflow
- ⚠️ Leave calendar view (simple list, no calendar UI)

**Overtime**
- ✅ Overtime request
- ✅ Manager approval
- ✅ Calculation engine (policy-driven)
- ✅ Compensation type (payout OR time-in-lieu)
- ⚠️ Time-in-lieu tracking (basic, no auto-deduction)

**Payroll (Monthly)**
- ✅ Payroll period management
- ✅ Payroll run (monthly salary, hourly, daily)
- ✅ Payroll components:
  - Base pay
  - Overtime
  - Allowances
  - Bonuses
  - Transport Bonus
  - Lunch Bonus
  - THR (Tunjangan Hari Raya)
  - Deductions
  - BPJS Kesehatan (employee + employer)
  - BPJS Ketenagakerjaan (employee + employer)
- ✅ Payslip generation (structured data)
- ✅ Payroll snapshot & locking
- ✅ THR (Tunjangan Hari Raya) - Integrated into payroll calculations
- ⚠️ PPh21 (placeholder, manual override only)

**Reporting (MVP Simple)**
- ✅ Attendance summary (monthly)
- ✅ Leave usage report
- ✅ Overtime cost report
- ✅ Payroll totals (monthly)
- ⚠️ Export to Excel (CSV only in MVP)

**Audit Log**
- ✅ Full audit trail (actor, action, target, before/after, timestamp, reason)
- ✅ Override reason required
- ⚠️ Audit log UI (basic table, no advanced filtering)

**Authentication & Authorization**
- ✅ JWT (access + refresh tokens)
- ✅ RBAC enforcement (backend guards + frontend routes)
- ✅ Role-based UI separation
- ✅ Password reset (forgot/reset password flow)

---

### V1 (Post-MVP Enhancements)

**Enhanced Features**
- 📅 Leave calendar view (interactive calendar)
- 📊 Advanced reporting (charts, trends, comparisons)
- 📄 Document diff view and version comparison
- 🤖 Advanced anomaly detection (ML-based)
- ⏰ Time-in-lieu auto-deduction
- 📧 Email notifications (leave approvals, payroll ready)
- 📱 Mobile-responsive optimizations
- 🔍 Advanced audit log filtering and search
- 📤 Excel export (proper formatting)
- 🔄 Bulk operations (bulk leave approval, bulk payroll)
- 📈 Dashboard analytics (charts, KPIs)
- 🔐 Two-factor authentication
- 📋 Payroll templates and presets
- 🏦 Bank file generation (BCA, Mandiri format)
- 📊 PPh21 calculation engine (full implementation)
- 🎯 Performance reviews (basic module)
- 📝 Employee self-service enhancements

---

## 2. HIGH-LEVEL SYSTEM ARCHITECTURE

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Employee UI  │  │ Manager UI   │  │ Owner UI     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     React + TypeScript + React Router + i18n         │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS/REST API
┌───────────────────────────┴─────────────────────────────────┐
│                      Backend Layer                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              NestJS Application                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│  │  │   Auth   │  │   RBAC   │  │  Audit   │          │  │
│  │  │  Module  │  │  Guards  │  │  Module  │          │  │
│  │  └──────────┘  └──────────┘  └──────────┘          │  │
│  │                                                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│  │  │Employee  │  │Attendance│  │  Leave   │          │  │
│  │  │  Module  │  │  Module  │  │  Module  │          │  │
│  │  └──────────┘  └──────────┘  └──────────┘          │  │
│  │                                                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│  │  │Overtime  │  │ Payroll  │  │ Reporting│          │  │
│  │  │  Module  │  │  Module  │  │  Module  │          │  │
│  │  └──────────┘  └──────────┘  └──────────┘          │  │
│  │                                                      │  │
│  │  ┌──────────┐  ┌──────────┐                        │  │
│  │  │  Policy  │  │  File    │                        │  │
│  │  │  Module  │  │  Storage │                        │  │
│  │  └──────────┘  └──────────┘                        │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────┴────────┐                    ┌─────────┴────────┐
│  PostgreSQL    │                    │   MinIO (S3)      │
│  (Primary DB)  │                    │  (File Storage)   │
└────────────────┘                    └──────────────────┘
```

### Technology Stack

**Frontend**
- React 18+ with TypeScript
- Vite (build tool)
- React Router v6 (routing)
- React Query (data fetching & caching)
- React Hook Form + Zod (form validation)
- react-i18next (internationalization) - **Bahasa Indonesia default**
- Tailwind CSS (styling - mobile-first responsive)
- Axios (HTTP client)
- Mobile-first responsive design (360px+ support)
- PWA-ready structure

**Backend**
- Node.js 20+
- NestJS 10+ (framework)
- TypeScript 5+
- Prisma (ORM)
- PostgreSQL 15+
- JWT (jsonwebtoken)
- bcrypt (password hashing)
- class-validator + class-transformer (DTO validation)

**Infrastructure**
- Docker & Docker Compose
- MinIO (S3-compatible object storage)
- Prisma Migrations
- Prisma Seeds

### Key Design Principles

1. **Separation of Concerns**
   - Clear module boundaries
   - Service layer for business logic
   - Repository pattern via Prisma

2. **Security First**
   - RBAC enforced at guard level
   - Input validation on all endpoints
   - Audit trail for sensitive operations
   - JWT with refresh token rotation

3. **Data Integrity**
   - Payroll data is immutable (snapshot-based)
   - Soft deletes for audit trail
   - Transaction safety for critical operations

4. **Timezone Safety**
   - All timestamps stored in UTC
   - Display conversion to Asia/Jakarta
   - Business logic uses UTC for calculations

5. **Policy-Driven**
   - No hardcoded business rules
   - All calculations reference policies
   - Policies versioned and auditable

6. **Mobile-First UI/UX**
   - Responsive design (360px+ width support)
   - Touch-friendly (44px minimum tap targets)
   - Bottom navigation for Employee role
   - Offline detection and handling
   - Toast notifications for feedback
   - Bahasa Indonesia as default language
   - No hover-only interactions
   - Clock in/out accessible in max 2 taps from login

---

## 3. DATABASE SCHEMA (PostgreSQL + Prisma Models)

### Core Models

```prisma
// ============================================
// AUTHENTICATION & AUTHORIZATION
// ============================================

model User {
  id                String    @id @default(uuid())
  email             String    @unique
  passwordHash      String
  role              Role      @default(EMPLOYEE)
  isActive          Boolean   @default(true)
  lastLoginAt       DateTime?
  resetToken        String?
  resetTokenExpires DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  employee      Employee?
  refreshTokens RefreshToken[]

  @@index([email])
  @@index([role])
  @@index([resetToken])
}

enum Role {
  OWNER
  MANAGER
  EMPLOYEE
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}

// ============================================
// ORGANIZATION
// ============================================

model Company {
  id          String   @id @default(uuid())
  name        String
  address     String?
  phone       String?
  email       String?
  npwp        String?
  logoUrl     String?
  // Geofencing settings
  geofencingEnabled Boolean  @default(false)
  geofencingLatitude Decimal? @db.Decimal(10, 8)
  geofencingLongitude Decimal? @db.Decimal(11, 8)
  geofencingRadius   Decimal? @db.Decimal(8, 2) // Radius in meters
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  employees   Employee[]
  policies    Policy[]
  holidays    PublicHoliday[]
  payrollRuns PayrollRun[]

  @@map("companies")
}

model PublicHoliday {
  id          String   @id @default(uuid())
  companyId   String
  name        String
  date        DateTime @db.Date
  isNational  Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, date])
  @@index([companyId, date])
  @@map("public_holidays")
}

// ============================================
// POLICIES
// ============================================

model Policy {
  id        String   @id @default(uuid())
  companyId String
  type      PolicyType
  config    Json     // Policy-specific configuration
  version   Int      @default(1)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, type, version])
  @@index([companyId, type, isActive])
  @@map("policies")
}

enum PolicyType {
  ATTENDANCE_RULES
  OVERTIME_POLICY
  LEAVE_POLICY
  PAYROLL_CONFIG
}

// ============================================
// EMPLOYEES
// ============================================

model Employee {
  id            String   @id @default(uuid())
  userId        String?  @unique
  companyId     String
  employeeCode  String   // Unique employee ID
  firstName     String
  lastName      String
  nik           String?  // Nomor Induk Kependudukan
  phone         String?
  address       String?
  joinDate      DateTime @db.Date
  status        EmployeeStatus @default(ACTIVE)
  managerId     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User?            @relation(fields: [userId], references: [id])
  company       Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  manager       Employee?        @relation("EmployeeManager", fields: [managerId], references: [id])
  directReports Employee[]       @relation("EmployeeManager")
  employment    Employment?
  documents     Document[]
  attendances   Attendance[]
  leaveRequests LeaveRequest[]
  overtimeRequests OvertimeRequest[]
  payrollItems  PayrollItem[]

  @@unique([companyId, employeeCode])
  @@index([companyId, status])
  @@index([managerId])
  @@index([userId])
  @@map("employees")
}

enum EmployeeStatus {
  ACTIVE
  INACTIVE
  TERMINATED
  ON_LEAVE
}

model Employment {
  id            String   @id @default(uuid())
  employeeId    String   @unique
  type          EmploymentType?
  baseSalary    Decimal? @db.Decimal(12, 2) // For monthly
  hourlyRate    Decimal? @db.Decimal(10, 2) // For hourly
  dailyRate     Decimal? @db.Decimal(10, 2) // For daily
  bankName      String?
  bankAccount   String?
  bankAccountName String?
  npwp          String?
  bpjsKesehatan String?
  bpjsKetenagakerjaan String?
  hasBPJS       Boolean  @default(false)
  transportBonus Decimal? @db.Decimal(12, 2) // Transport bonus per month
  lunchBonus    Decimal? @db.Decimal(12, 2) // Lunch bonus per month
  thr           Decimal? @db.Decimal(12, 2) // THR (Tunjangan Hari Raya) - Holiday bonus
  bpjsKesehatan String?
  bpjsKetenagakerjaan String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  employee Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@map("employments")
}

enum EmploymentType {
  MONTHLY
  HOURLY
  DAILY
}

model Document {
  id          String   @id @default(uuid())
  employeeId  String
  type        DocumentType
  fileName    String
  fileUrl     String
  fileSize    Int
  mimeType    String
  version     Int      @default(1)
  uploadedBy  String   // User ID
  createdAt   DateTime @default(now())

  employee Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@index([employeeId, type])
  @@map("documents")
}

enum DocumentType {
  CONTRACT
  ID_CARD
  CERTIFICATE
  OTHER
}

// ============================================
// ATTENDANCE
// ============================================

model Attendance {
  id                  String   @id @default(uuid())
  employeeId          String
  date                DateTime @db.Date
  clockIn             DateTime?
  clockOut            DateTime?
  clockInLatitude     Decimal? @db.Decimal(10, 8)
  clockInLongitude    Decimal? @db.Decimal(11, 8)
  clockOutLatitude    Decimal? @db.Decimal(10, 8)
  clockOutLongitude   Decimal? @db.Decimal(11, 8)
  workDuration        Int?     // Minutes
  status              AttendanceStatus @default(PRESENT)
  adjustmentRequestId String?
  notes               String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  employee            Employee            @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  adjustmentRequest   AttendanceAdjustment? @relation(fields: [adjustmentRequestId], references: [id])

  @@unique([employeeId, date])
  @@index([employeeId, date])
  @@index([date])
  @@map("attendances")
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  HALF_DAY
  ON_LEAVE
}

model AttendanceAdjustment {
  id             String   @id @default(uuid())
  employeeId     String
  attendanceId   String
  requestedBy    String   // User ID
  clockIn        DateTime?
  clockOut       DateTime?
  reason         String
  status         ApprovalStatus @default(PENDING)
  approvedBy     String?  // User ID
  approvedAt     DateTime?
  rejectedReason String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  attendance Attendance @relation(fields: [attendanceId], references: [id], onDelete: Cascade)

  @@index([employeeId, status])
  @@index([status])
  @@map("attendance_adjustments")
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}

// ============================================
// LEAVE MANAGEMENT
// ============================================

model LeaveType {
  id          String   @id @default(uuid())
  companyId   String
  code        String
  name        String
  nameId      String   // Bahasa Indonesia name
  isPaid      Boolean  @default(true)
  maxBalance  Int?     // Days
  accrualRate Decimal? @db.Decimal(5, 2) // Days per month
  carryoverAllowed Boolean @default(false)
  carryoverMax Int?    // Days
  expiresAfterMonths Int? // 0 = no expiry
  requiresAttachment Boolean @default(false)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  leaveRequests LeaveRequest[]

  @@unique([companyId, code])
  @@index([companyId, isActive])
  @@map("leave_types")
}

model LeaveRequest {
  id          String   @id @default(uuid())
  employeeId  String
  leaveTypeId String
  startDate   DateTime @db.Date
  endDate     DateTime @db.Date
  days        Decimal  @db.Decimal(5, 2)
  reason      String?
  attachmentUrl String?
  status      ApprovalStatus @default(PENDING)
  requestedAt DateTime @default(now())
  approvedBy  String?  // User ID
  approvedAt  DateTime?
  rejectedReason String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  employee  Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  leaveType LeaveType @relation(fields: [leaveTypeId], references: [id])

  @@index([employeeId, status])
  @@index([status, startDate])
  @@map("leave_requests")
}

model LeaveBalance {
  id          String   @id @default(uuid())
  employeeId  String
  leaveTypeId String
  balance     Decimal  @db.Decimal(5, 2)
  accrued     Decimal  @db.Decimal(5, 2) // This period
  used        Decimal  @db.Decimal(5, 2) // This period
  carriedOver Decimal  @db.Decimal(5, 2) // From previous period
  expired     Decimal  @db.Decimal(5, 2) // Expired this period
  periodYear  Int
  periodMonth Int
  updatedAt   DateTime @updatedAt

  @@unique([employeeId, leaveTypeId, periodYear, periodMonth])
  @@index([employeeId, periodYear, periodMonth])
  @@map("leave_balances")
}

// ============================================
// OVERTIME
// ============================================

model OvertimeRequest {
  id            String   @id @default(uuid())
  employeeId    String
  date          DateTime @db.Date
  startTime     DateTime
  endTime       DateTime
  duration      Int      // Minutes
  reason        String
  compensationType CompensationType @default(PAYOUT)
  status        ApprovalStatus @default(PENDING)
  requestedAt   DateTime @default(now())
  approvedBy    String?  // User ID
  approvedAt    DateTime?
  rejectedReason String?
  calculatedAmount Decimal? @db.Decimal(12, 2)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  employee Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@index([employeeId, status])
  @@index([date, status])
  @@map("overtime_requests")
}

enum CompensationType {
  PAYOUT
  TIME_IN_LIEU
}

// ============================================
// PAYROLL
// ============================================

model PayrollRun {
  id          String   @id @default(uuid())
  companyId   String
  periodYear  Int
  periodMonth Int
  status      PayrollStatus @default(DRAFT)
  runDate     DateTime?
  lockedAt    DateTime?
  lockedBy    String?  // User ID
  totalAmount Decimal? @db.Decimal(15, 2)
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  items       PayrollItem[]

  @@unique([companyId, periodYear, periodMonth])
  @@index([companyId, periodYear, periodMonth])
  @@map("payroll_runs")
}

enum PayrollStatus {
  DRAFT
  PROCESSING
  LOCKED
  PAID
}

model PayrollItem {
  id          String   @id @default(uuid())
  payrollRunId String
  employeeId  String
  // Snapshot data (immutable after lock)
  employmentType EmploymentType
  baseSalary     Decimal? @db.Decimal(12, 2)
  hourlyRate     Decimal? @db.Decimal(10, 2)
  dailyRate      Decimal? @db.Decimal(10, 2)
  // Calculated components
  basePay        Decimal  @db.Decimal(12, 2)
  overtimePay    Decimal  @db.Decimal(12, 2) @default(0)
  allowances     Decimal  @db.Decimal(12, 2) @default(0)
  bonuses        Decimal  @db.Decimal(12, 2) @default(0)
  transportBonus Decimal  @db.Decimal(12, 2) @default(0)
  lunchBonus     Decimal  @db.Decimal(12, 2) @default(0)
  thr             Decimal  @db.Decimal(12, 2) @default(0) // THR (Tunjangan Hari Raya)
  deductions     Decimal  @db.Decimal(12, 2) @default(0)
  bpjsKesehatanEmployee  Decimal @db.Decimal(12, 2) @default(0)
  bpjsKesehatanEmployer  Decimal @db.Decimal(12, 2) @default(0)
  bpjsKetenagakerjaanEmployee Decimal @db.Decimal(12, 2) @default(0)
  bpjsKetenagakerjaanEmployer Decimal @db.Decimal(12, 2) @default(0)
  pph21         Decimal  @db.Decimal(12, 2) @default(0)
  grossPay      Decimal  @db.Decimal(12, 2)
  netPay        Decimal  @db.Decimal(12, 2)
  // Breakdown (JSON for flexibility)
  breakdown     Json     // Detailed breakdown of all components
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  payrollRun PayrollRun @relation(fields: [payrollRunId], references: [id], onDelete: Cascade)
  employee   Employee   @relation(fields: [employeeId], references: [id])

  @@index([payrollRunId])
  @@index([employeeId])
  @@map("payroll_items")
}

// ============================================
// AUDIT LOG
// ============================================

model AuditLog {
  id          String   @id @default(uuid())
  actorId     String   // User ID
  action      String   // CREATE, UPDATE, DELETE, APPROVE, REJECT, OVERRIDE
  entityType  String   // Employee, Attendance, LeaveRequest, etc.
  entityId    String
  before      Json?    // State before change
  after       Json?    // State after change
  reason      String?  // Required for overrides
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([actorId])
  @@index([entityType, entityId])
  @@index([createdAt])
  @@index([action])
  @@map("audit_logs")
}
```

### Key Schema Decisions

1. **User-Employee Separation**: User handles auth, Employee handles HR data. One-to-one relationship.
2. **Policy Versioning**: Policies are versioned to track changes over time.
3. **Payroll Immutability**: PayrollItem stores snapshot data, never recalculated after lock.
4. **Soft Deletes**: Use `status` fields instead of hard deletes for audit trail.
5. **Timezone**: All DateTime fields stored in UTC, converted on display.
6. **JSON Fields**: Used for flexible policy configs and breakdowns.
7. **Indexes**: Strategic indexes on foreign keys, date ranges, and status fields.

---

## 4. API DESIGN (Routes + DTOs + RBAC Matrix)

### API Structure

Base URL: `/api/v1`

### Authentication Endpoints

```
POST   /auth/login              - Login (all roles)
POST   /auth/refresh             - Refresh token (all roles)
POST   /auth/logout              - Logout (all roles)
POST   /auth/change-password     - Change password (all roles)
POST   /auth/forgot-password     - Request password reset (all roles)
POST   /auth/reset-password      - Reset password with token (all roles)
```

### Company & Policy Endpoints

```
GET    /company                  - Get company profile (OWNER, MANAGER, EMPLOYEE)
PUT    /company                  - Update company (OWNER only)

GET    /policies                 - List policies (OWNER, MANAGER)
GET    /policies/:type           - Get active policy by type (OWNER, MANAGER)
POST   /policies                 - Create policy (OWNER only)
PUT    /policies/:id             - Update policy (OWNER only)

GET    /holidays                 - List holidays (all roles)
POST   /holidays                 - Create holiday (OWNER only)
PUT    /holidays/:id             - Update holiday (OWNER only)
DELETE /holidays/:id             - Delete holiday (OWNER only)
```

### Employee Endpoints

```
GET    /employees                - List employees (OWNER: all, MANAGER: direct reports, EMPLOYEE: self)
GET    /employees/:id            - Get employee (OWNER: all, MANAGER: direct reports, EMPLOYEE: self)
POST   /employees                - Create employee (OWNER only)
PUT    /employees/:id            - Update employee (OWNER: all, MANAGER: direct reports, EMPLOYEE: self basic)
DELETE /employees/:id            - Soft delete (OWNER only)

GET    /employees/:id/documents  - List documents (OWNER: all, MANAGER: direct reports, EMPLOYEE: self)
POST   /employees/:id/documents  - Upload document (OWNER: all, MANAGER: direct reports, EMPLOYEE: self)
DELETE /employees/:id/documents/:docId - Delete document (OWNER only)
```

### Attendance Endpoints

```
GET    /attendance               - List own attendance (EMPLOYEE, MANAGER)
GET    /attendance/team          - List team attendance (MANAGER: direct reports, OWNER: all)
POST   /attendance/clock-in      - Clock in (EMPLOYEE, MANAGER) - requires location if geofencing enabled
POST   /attendance/clock-out     - Clock out (EMPLOYEE, MANAGER) - requires location if geofencing enabled

GET    /attendance/adjustments   - List adjustments (OWNER: all, MANAGER: direct reports, EMPLOYEE: own)
POST   /attendance/adjustments   - Request adjustment (EMPLOYEE, MANAGER)
PUT    /attendance/adjustments/:id/approve - Approve (MANAGER: direct reports, OWNER: all)
PUT    /attendance/adjustments/:id/reject  - Reject (MANAGER: direct reports, OWNER: all)
```

### Leave Endpoints

```
GET    /leave/types              - List leave types (all roles)
GET    /leave/balance            - Get own balance (EMPLOYEE)
GET    /leave/balance/:employeeId - Get balance (MANAGER: direct reports, OWNER: all)

GET    /leave/requests           - List requests (OWNER: all, MANAGER: direct reports, EMPLOYEE: own)
POST   /leave/requests           - Create request (EMPLOYEE)
GET    /leave/requests/:id       - Get request (OWNER: all, MANAGER: direct reports, EMPLOYEE: own)
PUT    /leave/requests/:id/approve - Approve (MANAGER: direct reports, OWNER: all)
PUT    /leave/requests/:id/reject  - Reject (MANAGER: direct reports, OWNER: all)
DELETE /leave/requests/:id       - Cancel (EMPLOYEE: own, pending only)
```

### Overtime Endpoints

```
GET    /overtime/requests        - List requests (OWNER: all, MANAGER: direct reports, EMPLOYEE: own)
POST   /overtime/requests        - Create request (EMPLOYEE)
GET    /overtime/requests/:id    - Get request (OWNER: all, MANAGER: direct reports, EMPLOYEE: own)
PUT    /overtime/requests/:id/approve - Approve (MANAGER: direct reports, OWNER: all)
PUT    /overtime/requests/:id/reject  - Reject (MANAGER: direct reports, OWNER: all)
DELETE /overtime/requests/:id   - Cancel (EMPLOYEE: own, pending only)
```

### Payroll Endpoints

```
GET    /payroll/runs             - List payroll runs (OWNER, MANAGER)
POST   /payroll/runs             - Create payroll run (OWNER only)
GET    /payroll/runs/:id         - Get payroll run (OWNER, MANAGER)
PUT    /payroll/runs/:id/process - Process payroll (OWNER only)
PUT    /payroll/runs/:id/lock    - Lock payroll (OWNER only)
GET    /payroll/runs/:id/items   - List payroll items (OWNER, MANAGER)
GET    /payroll/runs/:id/items/:itemId/payslip - Get payslip (OWNER: all, MANAGER: direct reports, EMPLOYEE: own)

GET    /payroll/payslips         - List own payslips (EMPLOYEE)
GET    /payroll/payslips/:id     - Get payslip (OWNER: all, MANAGER: direct reports, EMPLOYEE: own)
```

### Reporting Endpoints

```
GET    /reports/attendance       - Attendance summary (OWNER, MANAGER)
GET    /reports/leave            - Leave usage (OWNER, MANAGER)
GET    /reports/overtime         - Overtime cost (OWNER, MANAGER)
GET    /reports/payroll          - Payroll totals (OWNER, MANAGER)
```

### Audit Endpoints

```
GET    /audit                    - List audit logs (OWNER only)
GET    /audit/:entityType/:entityId - Get audit trail for entity (OWNER only)
```

### DTO Examples

```typescript
// Auth DTOs
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

// Employee DTOs
export class CreateEmployeeDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsString()
  employeeCode: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  nik?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsDateString()
  joinDate: string;

  @IsOptional()
  @IsUUID()
  managerId?: string;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsUUID()
  managerId?: string;
}

// Attendance DTOs
export class ClockInDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class ClockOutDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class CreateAttendanceAdjustmentDto {
  @IsUUID()
  attendanceId: string;

  @IsOptional()
  @IsDateString()
  clockIn?: string;

  @IsOptional()
  @IsDateString()
  clockOut?: string;

  @IsString()
  @MinLength(10)
  reason: string;
}

// Leave DTOs
export class CreateLeaveRequestDto {
  @IsUUID()
  leaveTypeId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}

// Overtime DTOs
export class CreateOvertimeRequestDto {
  @IsDateString()
  date: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsString()
  @MinLength(10)
  reason: string;

  @IsEnum(CompensationType)
  compensationType: CompensationType;
}

// Payroll DTOs
export class CreatePayrollRunDto {
  @IsInt()
  @Min(2020)
  @Max(2100)
  periodYear: number;

  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

### RBAC Matrix

| Endpoint | OWNER | MANAGER | EMPLOYEE |
|----------|-------|---------|----------|
| Company CRUD | ✅ | 👁️ | 👁️ |
| Policy CRUD | ✅ | 👁️ | ❌ |
| Employee CRUD | ✅ (all) | 👁️ (direct reports) | 👁️ (self) |
| Attendance - Clock | ❌ | ✅ (self) | ✅ (self) |
| Attendance - View | ✅ (all) | ✅ (direct reports + self) | ✅ (self) |
| Attendance - Adjust | ✅ (all) | ✅ (direct reports + self request) | ✅ (request) |
| Leave - Request | ❌ | ❌ | ✅ |
| Leave - Approve | ✅ (all) | ✅ (direct reports) | ❌ |
| Leave - View | ✅ (all) | ✅ (direct reports) | ✅ (self) |
| Overtime - Request | ❌ | ❌ | ✅ |
| Overtime - Approve | ✅ (all) | ✅ (direct reports) | ❌ |
| Payroll - Run | ✅ | ❌ | ❌ |
| Payroll - View | ✅ (all) | ✅ (direct reports) | ✅ (self) |
| Reports | ✅ | ✅ (team) | ❌ |
| Audit Log | ✅ | ❌ | ❌ |
| Password Reset | ✅ | ✅ | ✅ |

Legend: ✅ = Full access, 👁️ = Read only, ❌ = No access

---

## 5. BUSINESS RULES & CALCULATION ENGINES

### Attendance Rules

**Work Duration Calculation**
```typescript
function calculateWorkDuration(
  clockIn: DateTime,
  clockOut: DateTime,
  policy: AttendancePolicy
): number {
  let duration = clockOut.diff(clockIn, 'minutes');
  
  // Apply rounding
  if (policy.roundingEnabled) {
    duration = roundToNearest(duration, policy.roundingInterval);
  }
  
  return Math.max(0, duration);
}
```

**Geofencing Validation**
```typescript
function isWithinGeofence(
  userLatitude: number,
  userLongitude: number,
  geofenceLatitude: number,
  geofenceLongitude: number,
  geofenceRadius: number // in meters
): boolean {
  const distance = calculateDistance(
    userLatitude,
    userLongitude,
    geofenceLatitude,
    geofenceLongitude
  );
  return distance <= geofenceRadius;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Haversine formula
  const R = 6371000; // Earth radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

**Grace Period**
- If clock-in is within grace period, treat as on-time
- If clock-in is after grace period, mark as LATE
- Grace period configurable per policy

### Leave Accrual Engine

```typescript
function calculateLeaveAccrual(
  employee: Employee,
  leaveType: LeaveType,
  currentBalance: LeaveBalance,
  periodYear: number,
  periodMonth: number
): LeaveBalance {
  if (!leaveType.accrualRate) {
    return currentBalance; // No accrual
  }
  
  const newAccrued = leaveType.accrualRate;
  const newBalance = currentBalance.balance + newAccrued;
  
  // Apply max balance cap
  const cappedBalance = leaveType.maxBalance 
    ? Math.min(newBalance, leaveType.maxBalance)
    : newBalance;
  
  // Handle carryover
  let carriedOver = 0;
  if (leaveType.carryoverAllowed && periodMonth === 7) {
    // July: carryover from previous year (June balance)
    const previousYearBalance = getPreviousYearBalance(employee.id, leaveType.id);
    const maxCarryover = leaveType.carryoverMax || 0;
    carriedOver = Math.min(previousYearBalance, maxCarryover);
  }
  
  // Handle expiry
  let expired = 0;
  if (leaveType.expiresAfterMonths && leaveType.expiresAfterMonths > 0) {
    expired = calculateExpiredBalance(currentBalance, leaveType.expiresAfterMonths);
  }
  
  return {
    balance: cappedBalance + carriedOver - expired,
    accrued: newAccrued,
    used: 0, // Reset for new period
    carriedOver,
    expired,
    periodYear,
    periodMonth
  };
}
```

### Overtime Calculation Engine

```typescript
function calculateOvertimePay(
  request: OvertimeRequest,
  employment: Employment,
  policy: OvertimePolicy,
  isHoliday: boolean
): Decimal {
  const dayType = determineDayType(request.date, isHoliday);
  const dayPolicy = policy.rules[dayType];
  
  if (!dayPolicy || !dayPolicy.enabled) {
    return new Decimal(0);
  }
  
  let baseRate: Decimal;
  if (employment.type === EmploymentType.MONTHLY) {
    // Convert monthly to hourly
    baseRate = employment.baseSalary.div(173); // 173 = standard working hours per month
  } else if (employment.type === EmploymentType.HOURLY) {
    baseRate = employment.hourlyRate;
  } else {
    // Daily rate - convert to hourly
    baseRate = employment.dailyRate.div(8); // 8 hours per day
  }
  
  const hours = request.duration / 60;
  let multiplier = dayPolicy.multiplier;
  
  // Apply caps
  if (dayPolicy.maxHours && hours > dayPolicy.maxHours) {
    // Only pay for max hours
    const cappedHours = dayPolicy.maxHours;
    const overtimePay = baseRate.mul(cappedHours).mul(multiplier);
    return overtimePay;
  }
  
  const overtimePay = baseRate.mul(hours).mul(multiplier);
  
  // Apply minimum payment (if any)
  if (dayPolicy.minimumPayment) {
    return Decimal.max(overtimePay, dayPolicy.minimumPayment);
  }
  
  return overtimePay;
}

function determineDayType(date: DateTime, isHoliday: boolean): DayType {
  if (isHoliday) return DayType.HOLIDAY;
  const dayOfWeek = date.weekday;
  if (dayOfWeek === 6 || dayOfWeek === 7) return DayType.WEEKEND;
  return DayType.WEEKDAY;
}
```

### Payroll Calculation Engine

```typescript
async function calculatePayrollItem(
  employee: Employee,
  employment: Employment,
  periodYear: number,
  periodMonth: number,
  payrollConfig: PayrollConfig
): Promise<PayrollItem> {
  // Get attendance data
  const attendances = await getAttendancesForPeriod(
    employee.id,
    periodYear,
    periodMonth
  );
  
  // Get approved overtime
  const overtimeRequests = await getApprovedOvertimeForPeriod(
    employee.id,
    periodYear,
    periodMonth
  );
  
  // Calculate base pay
  let basePay: Decimal;
  if (employment.type === EmploymentType.MONTHLY) {
    basePay = employment.baseSalary || new Decimal(0);
  } else if (employment.type === EmploymentType.HOURLY) {
    const totalHours = calculateTotalHours(attendances);
    basePay = employment.hourlyRate.mul(totalHours);
  } else {
    // Daily
    const totalDays = attendances.filter(a => a.status === AttendanceStatus.PRESENT).length;
    basePay = employment.dailyRate.mul(totalDays);
  }
  
  // Calculate overtime pay
  let overtimePay = new Decimal(0);
  for (const ot of overtimeRequests) {
    if (ot.compensationType === CompensationType.PAYOUT) {
      overtimePay = overtimePay.add(ot.calculatedAmount || new Decimal(0));
    }
  }
  
  // Get allowances and bonuses (from policy or employee-specific)
  const allowances = await getAllowances(employee.id, periodYear, periodMonth);
  const bonuses = await getBonuses(employee.id, periodYear, periodMonth);
  
  // Get deductions
  const deductions = await getDeductions(employee.id, periodYear, periodMonth);
  
  // Calculate BPJS
  const bpjsKesehatan = calculateBPJSKesehatan(
    basePay,
    payrollConfig.bpjsKesehatanRate
  );
  const bpjsKetenagakerjaan = calculateBPJSKetenagakerjaan(
    basePay,
    payrollConfig.bpjsKetenagakerjaanRate
  );
  
  // Get transport, lunch bonuses, and THR from employment
  const transportBonus = employment.transportBonus || new Decimal(0);
  const lunchBonus = employment.lunchBonus || new Decimal(0);
  const thr = employment.thr || new Decimal(0);
  
  // Calculate gross pay
  const grossPay = basePay
    .add(overtimePay)
    .add(allowances)
    .add(bonuses)
    .add(transportBonus)
    .add(lunchBonus)
    .add(thr)
    .sub(deductions);
  
  // Calculate PPh21 (placeholder - manual override)
  const pph21 = new Decimal(0); // TODO: Implement full calculation
  
  // Calculate net pay
  const netPay = grossPay
    .sub(bpjsKesehatan.employee)
    .sub(bpjsKetenagakerjaan.employee)
    .sub(pph21);
  
  return {
    basePay,
    overtimePay,
    allowances,
    bonuses,
    transportBonus,
    lunchBonus,
    thr,
    deductions,
    bpjsKesehatanEmployee: bpjsKesehatan.employee,
    bpjsKesehatanEmployer: bpjsKesehatan.employer,
    bpjsKetenagakerjaanEmployee: bpjsKetenagakerjaan.employee,
    bpjsKetenagakerjaanEmployer: bpjsKetenagakerjaan.employer,
    pph21,
    grossPay,
    netPay,
    breakdown: {
      attendances: attendances.length,
      totalHours: calculateTotalHours(attendances),
      overtimeHours: calculateTotalOvertimeHours(overtimeRequests),
      // ... detailed breakdown
    }
  };
}

function calculateBPJSKesehatan(
  basePay: Decimal,
  rate: Decimal
): { employee: Decimal; employer: Decimal } {
  const employeeContribution = basePay.mul(rate).div(100);
  const employerContribution = basePay.mul(rate).div(100);
  return {
    employee: employeeContribution,
    employer: employerContribution
  };
}

function calculateBPJSKetenagakerjaan(
  basePay: Decimal,
  rate: Decimal
): { employee: Decimal; employer: Decimal } {
  const employeeContribution = basePay.mul(rate).div(100);
  const employerContribution = basePay.mul(rate).div(100);
  return {
    employee: employeeContribution,
    employer: employerContribution
  };
}
```

### Policy Configuration Examples

**Attendance Policy**
```json
{
  "gracePeriodMinutes": 15,
  "roundingEnabled": true,
  "roundingInterval": 15,
  "minimumWorkHours": 4
}
```

**Overtime Policy**
```json
{
  "rules": {
    "WEEKDAY": {
      "enabled": true,
      "multiplier": 1.5,
      "maxHours": null,
      "minimumPayment": 0
    },
    "WEEKEND": {
      "enabled": true,
      "multiplier": 2.0,
      "maxHours": 8,
      "minimumPayment": 0
    },
    "HOLIDAY": {
      "enabled": true,
      "multiplier": 3.0,
      "maxHours": null,
      "minimumPayment": 0
    }
  }
}
```

**Leave Policy**
```json
{
  "accrualMethod": "MONTHLY",
  "maxBalance": 12,
  "carryoverAllowed": true,
  "carryoverMax": 5,
  "expiresAfterMonths": 12,
  "requiresApproval": true
}
```

**Payroll Config**
```json
{
  "payday": 25,
  "bpjsKesehatan": {
    "type": "percentage",
    "value": 5
  },
  "bpjsKetenagakerjaan": {
    "type": "percentage",
    "value": 2
  },
  "pph21Rate": 0.05,
  "defaultAllowances": [],
  "defaultDeductions": [],
  "currency": "IDR"
}
```

### How to Set Up Payroll Configuration in Owner Dashboard

The Payroll Configuration policy controls how payroll calculations are performed for all employees. This must be configured before running payroll.

#### Step-by-Step Setup Instructions

1. **Navigate to Policy Management**
   - Log in as OWNER
   - Go to Owner Dashboard
   - Click on "More" menu (or navigate directly if visible)
   - Select "Policy Management"

2. **Select Payroll Configuration**
   - In the Policy Management page, you'll see four policy cards:
     - Attendance Rules
     - Overtime Policy
     - Leave Policy
     - **Payroll Configuration** ← Click this one

3. **Create or Edit Payroll Config**
   - If no policy exists: Click "Create Policy" button
   - If policy exists: Click "Edit" button to modify
   - You can also click "Create New Version" to create a new version while keeping the old one

4. **Configure the JSON Settings**
   - The configuration is entered as JSON in a text editor
   - Click "Load Default Config" to start with default values
   - Edit the JSON to match your company's requirements

#### Payroll Configuration Structure

The system supports two formats for BPJS rates. Both are valid and the system automatically converts between them:

**Format 1: Simple Rate (Recommended - matches seed data)**
```json
{
  "bpjsKesehatanRate": 5.0,
  "bpjsKetenagakerjaanRate": 2.0,
  "defaultAllowances": [],
  "defaultDeductions": [],
  "currency": "IDR"
}
```

**Format 2: Structured Format (UI default)**
```json
{
  "payday": 25,
  "bpjsKesehatan": {
    "type": "percentage",
    "value": 5
  },
  "bpjsKetenagakerjaan": {
    "type": "percentage",
    "value": 2
  },
  "pph21Rate": 0.05,
  "defaultAllowances": [],
  "defaultDeductions": [],
  "currency": "IDR"
}
```

**Field Descriptions:**

- **`bpjsKesehatanRate`** (number, Format 1) or **`bpjsKesehatan`** (object, Format 2)
  - BPJS Kesehatan contribution rate
  - Format 1: Simple number (e.g., `5.0` = 5%)
  - Format 2: Object with `type: "percentage"` and `value: 5`
  - Default: `5.0` (5%)
  - Applied to base salary for both employee and employer contributions
  - Example: For 5%, employee pays 5% and employer pays 5% of base salary
  - **Note**: System automatically converts between formats for backward compatibility

- **`bpjsKetenagakerjaanRate`** (number, Format 1) or **`bpjsKetenagakerjaan`** (object, Format 2)
  - BPJS Ketenagakerjaan (Employment Insurance) contribution rate
  - Format 1: Simple number (e.g., `2.0` = 2%)
  - Format 2: Object with `type: "percentage"` and `value: 2`
  - Default: `2.0` (2%)
  - Applied to base salary for both employee and employer contributions
  - Example: For 2%, employee pays 2% and employer pays 2% of base salary
  - **Note**: System automatically converts between formats for backward compatibility

- **`payday`** (number, optional, Format 2 only)
  - Day of month when payroll is paid
  - Default: `25`
  - Range: 1-31

- **`pph21Rate`** (number, optional, Format 2 only)
  - PPh21 (Income Tax) rate as decimal
  - Default: `0.05` (5%)
  - Currently placeholder for future implementation

- **`defaultAllowances`** (array, optional)
  - Default allowances applied to all employees
  - Each allowance object: `{ "name": "Transport", "amount": 500000 }`
  - Can be overridden per employee in employment details
  - Default: `[]` (empty array)

- **`defaultDeductions`** (array, optional)
  - Default deductions applied to all employees
  - Each deduction object: `{ "name": "Loan", "amount": 200000 }`
  - Can be overridden per employee in employment details
  - Default: `[]` (empty array)

- **`currency`** (string, required)
  - Currency code for payroll calculations
  - Default: `"IDR"` (Indonesian Rupiah)
  - Used for display and formatting

#### Example Configurations

**Basic Configuration - Simple Format (Recommended):**
```json
{
  "bpjsKesehatanRate": 5.0,
  "bpjsKetenagakerjaanRate": 2.0,
  "defaultAllowances": [],
  "defaultDeductions": [],
  "currency": "IDR"
}
```

**Basic Configuration - Structured Format:**
```json
{
  "payday": 25,
  "bpjsKesehatan": {
    "type": "percentage",
    "value": 5
  },
  "bpjsKetenagakerjaan": {
    "type": "percentage",
    "value": 2
  },
  "pph21Rate": 0.05,
  "defaultAllowances": [],
  "defaultDeductions": [],
  "currency": "IDR"
}
```

**With Default Allowances (Simple Format):**
```json
{
  "bpjsKesehatanRate": 5.0,
  "bpjsKetenagakerjaanRate": 2.0,
  "defaultAllowances": [
    { "name": "Transport Allowance", "amount": 500000 },
    { "name": "Meal Allowance", "amount": 300000 }
  ],
  "defaultDeductions": [],
  "currency": "IDR"
}
```

**With Custom BPJS Rates:**
```json
{
  "bpjsKesehatanRate": 4.0,
  "bpjsKetenagakerjaanRate": 2.5,
  "defaultAllowances": [],
  "defaultDeductions": [],
  "currency": "IDR"
}
```

**Note on Format Compatibility:**
- The system automatically handles both formats
- If you use `bpjsKesehatanRate`, the system converts it internally
- If you use `bpjsKesehatan` object, the system uses it directly
- Both formats work correctly - choose the one that's easier for you

#### Important Notes

1. **Policy Versioning**: When you update a policy, you can either:
   - **Update existing version**: Modifies the current active policy
   - **Create new version**: Creates a new version while keeping the old one (recommended for audit trail)

2. **Validation**: The system validates JSON syntax before saving. Make sure:
   - All brackets and braces are properly closed
   - All strings are in double quotes
   - Numbers are not quoted
   - No trailing commas

3. **Impact on Payroll**: Changes to payroll config affect:
   - New payroll runs (future payroll calculations)
   - Existing locked payroll runs are NOT affected (they use snapshot data)

4. **BPJS Rates**: 
   - Rates are percentages (5.0 = 5%)
   - Both employee and employer pay the same rate
   - Total BPJS cost = (employee rate + employer rate) × base salary

5. **Default Allowances/Deductions**:
   - Applied automatically to all employees during payroll calculation
   - Can be customized per employee in their Employment details
   - Employee-specific values override default values

#### Troubleshooting

- **"Invalid JSON" error**: Check for syntax errors, missing commas, or unclosed brackets
- **Policy not saving**: Ensure all required fields are present and valid
- **Payroll calculations incorrect**: Verify BPJS rates match your company's actual rates
- **Allowances not showing**: Check that the `defaultAllowances` array contains valid objects with `name` and `amount` fields

#### After Configuration

Once payroll config is saved:
1. The policy becomes active immediately
2. All future payroll runs will use this configuration
3. You can view the active policy version in the Policy Management page
4. To make changes, edit the policy or create a new version

---

## 6. IMPLEMENTATION PLAN + REPO STRUCTURE

### Repository Structure

```
human_resources/
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   └── strategies/
│   │   │       └── jwt.strategy.ts
│   │   ├── company/
│   │   ├── policy/
│   │   ├── employee/
│   │   ├── attendance/
│   │   ├── leave/
│   │   ├── overtime/
│   │   ├── payroll/
│   │   ├── reporting/
│   │   ├── audit/
│   │   ├── file-storage/
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   ├── filters/
│   │   │   ├── interceptors/
│   │   │   └── pipes/
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seeds/
│   │       ├── roles.seed.ts
│   │       ├── leave-types.seed.ts
│   │       └── holidays.seed.ts
│   ├── test/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── nest-cli.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── employee/
│   │   │   ├── attendance/
│   │   │   ├── leave/
│   │   │   ├── payroll/
│   │   │   └── layout/
│   │   ├── pages/
│   │   │   ├── employee/
│   │   │   ├── manager/
│   │   │   ├── owner/
│   │   │   └── shared/
│   │   ├── hooks/
│   │   ├── services/
│   │   │   ├── api/
│   │   │   └── auth/
│   │   ├── store/
│   │   ├── utils/
│   │   ├── i18n/
│   │   │   ├── en/
│   │   │   └── id/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── routes.tsx
│   ├── public/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docker-compose.yml
├── .gitignore
└── README.md
```

### Implementation Phases

**Phase 1: Foundation (Week 1)**
1. Set up project structure
2. Initialize NestJS backend
3. Initialize React frontend
4. Set up Docker Compose (PostgreSQL + MinIO)
5. Create Prisma schema
6. Run initial migration
7. Set up authentication (JWT)

**Phase 2: Core Modules (Week 2-3)**
1. Company & Policy modules
2. Employee module
3. File storage integration (MinIO)
4. Attendance module
5. Leave module
6. Overtime module

**Phase 3: Payroll & Reporting (Week 4)**
1. Payroll calculation engine
2. Payroll run & locking
3. Payslip generation
4. Basic reporting

**Phase 4: UI Implementation (Week 5-6)**
1. Authentication UI
2. Employee portal
3. Manager portal
4. Owner dashboard
5. i18n integration (Bahasa Indonesia)

**Phase 5: Polish & Testing (Week 7)**
1. Audit logging
2. Error handling
3. Validation
4. Security hardening
5. Documentation

---

## 7. EDGE CASES, FRAUD PREVENTION, AUDIT & SECURITY

### Edge Cases

**Attendance**
- Multiple clock-ins in same day (prevent duplicate)
- Clock-out before clock-in (validation error)
- Break longer than work duration (validation)
- Missing punches (detect and flag)
- Timezone edge cases (midnight crossing)

**Leave**
- Overlapping leave requests (prevent)
- Leave balance insufficient (validation)
- Leave request spanning month/year boundary
- Leave expiry calculation (precise date handling)

**Overtime**
- Overtime on leave day (prevent or special handling)
- Overtime exceeding daily limits (policy enforcement)
- Overtime calculation for part-time employees

**Payroll**
- Employee terminated mid-month (pro-rata calculation)
- Employee on leave entire month (handle gracefully)
- Missing attendance data (flag for review)
- Payroll run for zero employees (handle edge case)

### Fraud Prevention

**Attendance**
- Prevent backdating clock-in/out (only allow current day)
- Require approval for manual adjustments
- Audit trail for all attendance changes
- Rate limiting on clock-in/out endpoints

**Leave**
- Prevent duplicate leave requests for same period
- Validate leave balance before approval
- Require attachment for sick leave
- Manager cannot approve own leave

**Overtime**
- Validate overtime hours against attendance
- Prevent overtime on non-working days (unless policy allows)
- Require manager approval
- Audit trail for all overtime approvals

**Payroll**
- Lock payroll after processing (immutable)
- Require owner approval for payroll runs
- Snapshot all data at payroll time
- Prevent modification of locked payroll

### Audit Requirements

**Mandatory Audit Events**
- User login/logout
- Employee creation/update/deletion
- Policy changes
- Attendance adjustments
- Leave approvals/rejections
- Overtime approvals/rejections
- Payroll runs (create, process, lock)
- Owner overrides (with reason)

**Audit Log Structure**
```typescript
{
  actorId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'OVERRIDE';
  entityType: string;
  entityId: string;
  before: object | null;
  after: object | null;
  reason: string | null; // Required for OVERRIDE
  ipAddress: string;
  userAgent: string;
  timestamp: DateTime;
}
```

### Security Measures

**Authentication**
- JWT with short expiration (15 minutes)
- Refresh token rotation
- Password hashing with bcrypt (salt rounds: 10)
- Rate limiting on login endpoints

**Authorization**
- RBAC enforced at guard level
- Resource-level permissions (manager can only see direct reports)
- Owner override requires reason and audit log

**Data Protection**
- Input validation on all endpoints
- SQL injection prevention (Prisma parameterized queries)
- XSS prevention (sanitize user inputs)
- CSRF protection (same-site cookies)

**File Storage**
- Signed URLs for file access (time-limited)
- File type validation
- File size limits
- Virus scanning (future enhancement)

**API Security**
- CORS configuration
- Rate limiting per user/IP
- Request size limits
- HTTPS only in production

**Data Privacy**
- Soft deletes for audit trail
- PII encryption at rest (future enhancement)
- Access logging for sensitive data
- GDPR compliance considerations (future)

---

## 8. UI/UX REQUIREMENTS

### Mobile-First Design (NON-NEGOTIABLE)

**General Requirements**
- UI MUST be mobile-phone friendly and usable on:
  - Android & iOS mobile browsers
  - Small screens (360px width and up)
- Design approach: Mobile-first responsive layout, desktop enhancements layered on top
- No native mobile app for now
- PWA-ready structure (service worker optional later)

**Technical Implementation**
- Responsive layout using CSS Grid / Flexbox
- Tailwind CSS (committed)
- Avoid hover-only interactions (must work on touch)
- Buttons and inputs must be thumb-friendly (44px minimum tap targets)

### Role-Based UI Behavior

**EMPLOYEE UI**
- Optimized for mobile use
- Primary actions (one-tap):
  - Clock In / Clock Out (with location if geofencing enabled)
  - Request Leave
  - Request Overtime
- Quick status view:
  - Today's attendance
  - Current leave balance
- Bottom navigation (4 main sections)
- Clock in/out accessible in max 2 taps from login
- Geofencing validation with clear error messages if outside work area

**MANAGER UI**
- Mobile usable but desktop optimized
- Attendance clock in/out (same as employees, with geofencing)
- Approval inbox (leave, overtime, attendance edits)
- Team summary cards
- Top navigation with tab persistence (URL-based state)

**OWNER UI**
- Desktop-first but still responsive
- Payroll, reports, policy management
- Geofencing settings (enable/disable, set location and radius)
- Employee management (CRUD with edit, delete, reactivate)
- Top navigation with tab persistence (URL-based state)

### Key Mobile Screens (Employee)

- `/employee/attendance` - Big Clock In/Out button, current status indicator, last punch time
- `/employee/leave/request` - Leave request form
- `/employee/overtime/request` - Overtime request form
- `/employee/me` - Profile and settings
- `/employee/payslips` - Payslip list and viewer

### UX Rules

- Clock in/out must be reachable in max 2 taps from login
- Use bottom navigation for Employee mobile view
- Use toast/snackbar feedback for actions
- Offline-safe UX:
  - If offline, prevent clock in/out and show clear message
- Loading states and error states required
- Cards instead of dense tables on mobile

### Accessibility & Language

- Bahasa Indonesia default language
- Clear, simple wording for non-technical users
- Focus visible indicators
- ARIA labels for screen readers
- Semantic HTML

### Implementation Status

✅ Mobile-first layout components
✅ Bottom navigation for Employee
✅ Toast notification system
✅ Offline detection and handling
✅ Mobile-optimized attendance page
✅ Touch-friendly buttons (56px for primary actions)
✅ Bahasa Indonesia as default language
✅ Responsive forms and inputs

---

## NEXT STEPS

1. Review and approve this design document
2. Set up project structure
3. Initialize Prisma schema
4. Begin implementation following the phases

---

*End of Design Document*

