BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [users_role_df] DEFAULT 'EMPLOYEE',
    [isActive] BIT NOT NULL CONSTRAINT [users_isActive_df] DEFAULT 1,
    [lastLoginAt] DATETIME2,
    [resetToken] NVARCHAR(1000),
    [resetTokenExpires] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[refresh_tokens] (
    [id] NVARCHAR(1000) NOT NULL,
    [token] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [refresh_tokens_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [refresh_tokens_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [refresh_tokens_token_key] UNIQUE NONCLUSTERED ([token])
);

-- CreateTable
CREATE TABLE [dbo].[companies] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [address] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [email] NVARCHAR(1000),
    [npwp] NVARCHAR(1000),
    [logoUrl] NVARCHAR(1000),
    [geofencingEnabled] BIT NOT NULL CONSTRAINT [companies_geofencingEnabled_df] DEFAULT 0,
    [geofencingLatitude] DECIMAL(10,8),
    [geofencingLongitude] DECIMAL(11,8),
    [geofencingRadius] DECIMAL(8,2),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [companies_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [companies_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[public_holidays] (
    [id] NVARCHAR(1000) NOT NULL,
    [companyId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [date] DATE NOT NULL,
    [isNational] BIT NOT NULL CONSTRAINT [public_holidays_isNational_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [public_holidays_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [public_holidays_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [public_holidays_companyId_date_key] UNIQUE NONCLUSTERED ([companyId],[date])
);

-- CreateTable
CREATE TABLE [dbo].[policies] (
    [id] NVARCHAR(1000) NOT NULL,
    [companyId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [config] NVARCHAR(max) NOT NULL,
    [version] INT NOT NULL CONSTRAINT [policies_version_df] DEFAULT 1,
    [isActive] BIT NOT NULL CONSTRAINT [policies_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [policies_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [policies_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [policies_companyId_type_version_key] UNIQUE NONCLUSTERED ([companyId],[type],[version])
);

-- CreateTable
CREATE TABLE [dbo].[employees] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000),
    [companyId] NVARCHAR(1000) NOT NULL,
    [employeeCode] NVARCHAR(1000) NOT NULL,
    [firstName] NVARCHAR(1000) NOT NULL,
    [lastName] NVARCHAR(1000) NOT NULL,
    [nik] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [address] NVARCHAR(1000),
    [joinDate] DATE NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [employees_status_df] DEFAULT 'ACTIVE',
    [managerId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [employees_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [employees_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [employees_userId_key] UNIQUE NONCLUSTERED ([userId]),
    CONSTRAINT [employees_companyId_employeeCode_key] UNIQUE NONCLUSTERED ([companyId],[employeeCode])
);

-- CreateTable
CREATE TABLE [dbo].[employments] (
    [id] NVARCHAR(1000) NOT NULL,
    [employeeId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NULL,
    [baseSalary] DECIMAL(12,2),
    [hourlyRate] DECIMAL(10,2),
    [dailyRate] DECIMAL(10,2),
    [bankName] NVARCHAR(1000),
    [bankAccount] NVARCHAR(1000),
    [bankAccountName] NVARCHAR(1000),
    [npwp] NVARCHAR(1000),
    [bpjsKesehatan] NVARCHAR(1000),
    [bpjsKetenagakerjaan] NVARCHAR(1000),
    [hasBPJS] BIT NOT NULL CONSTRAINT [employments_hasBPJS_df] DEFAULT 0,
    [transportBonus] DECIMAL(12,2),
    [lunchBonus] DECIMAL(12,2),
    [thr] DECIMAL(12,2) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [employments_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [employments_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [employments_employeeId_key] UNIQUE NONCLUSTERED ([employeeId])
);

-- CreateTable
CREATE TABLE [dbo].[documents] (
    [id] NVARCHAR(1000) NOT NULL,
    [employeeId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [fileUrl] NVARCHAR(1000) NOT NULL,
    [fileSize] INT NOT NULL,
    [mimeType] NVARCHAR(1000) NOT NULL,
    [version] INT NOT NULL CONSTRAINT [documents_version_df] DEFAULT 1,
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [documents_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [documents_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[attendances] (
    [id] NVARCHAR(1000) NOT NULL,
    [employeeId] NVARCHAR(1000) NOT NULL,
    [date] DATE NOT NULL,
    [clockIn] DATETIME2,
    [clockOut] DATETIME2,
    [clockInLatitude] DECIMAL(10,8),
    [clockInLongitude] DECIMAL(11,8),
    [clockOutLatitude] DECIMAL(10,8),
    [clockOutLongitude] DECIMAL(11,8),
    [workDuration] INT,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [attendances_status_df] DEFAULT 'PRESENT',
    [adjustmentRequestId] NVARCHAR(1000),
    [notes] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [attendances_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [attendances_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [attendances_employeeId_date_key] UNIQUE NONCLUSTERED ([employeeId],[date])
);

-- CreateTable
CREATE TABLE [dbo].[attendance_adjustments] (
    [id] NVARCHAR(1000) NOT NULL,
    [employeeId] NVARCHAR(1000) NOT NULL,
    [attendanceId] NVARCHAR(1000) NOT NULL,
    [requestedBy] NVARCHAR(1000) NOT NULL,
    [requestedAt] DATETIME2 NOT NULL CONSTRAINT [attendance_adjustments_requestedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [clockIn] DATETIME2,
    [clockOut] DATETIME2,
    [reason] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [attendance_adjustments_status_df] DEFAULT 'PENDING',
    [approvedBy] NVARCHAR(1000),
    [approvedAt] DATETIME2,
    [rejectedReason] NVARCHAR(1000),
    [requiresOwnerApproval] BIT NOT NULL CONSTRAINT [attendance_adjustments_requiresOwnerApproval_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [attendance_adjustments_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [attendance_adjustments_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [attendance_adjustments_attendanceId_key] UNIQUE NONCLUSTERED ([attendanceId])
);

-- CreateTable
CREATE TABLE [dbo].[leave_types] (
    [id] NVARCHAR(1000) NOT NULL,
    [companyId] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [nameId] NVARCHAR(1000) NOT NULL,
    [isPaid] BIT NOT NULL CONSTRAINT [leave_types_isPaid_df] DEFAULT 1,
    [maxBalance] INT,
    [accrualRate] DECIMAL(5,2),
    [carryoverAllowed] BIT NOT NULL CONSTRAINT [leave_types_carryoverAllowed_df] DEFAULT 0,
    [carryoverMax] INT,
    [expiresAfterMonths] INT,
    [requiresAttachment] BIT NOT NULL CONSTRAINT [leave_types_requiresAttachment_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [leave_types_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [leave_types_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [leave_types_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [leave_types_companyId_code_key] UNIQUE NONCLUSTERED ([companyId],[code])
);

-- CreateTable
CREATE TABLE [dbo].[leave_requests] (
    [id] NVARCHAR(1000) NOT NULL,
    [employeeId] NVARCHAR(1000) NOT NULL,
    [leaveTypeId] NVARCHAR(1000) NOT NULL,
    [startDate] DATE NOT NULL,
    [endDate] DATE NOT NULL,
    [days] DECIMAL(5,2) NOT NULL,
    [reason] NVARCHAR(1000),
    [attachmentUrl] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [leave_requests_status_df] DEFAULT 'PENDING',
    [requestedAt] DATETIME2 NOT NULL CONSTRAINT [leave_requests_requestedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [approvedBy] NVARCHAR(1000),
    [approvedAt] DATETIME2,
    [rejectedReason] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [leave_requests_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [leave_requests_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[leave_balances] (
    [id] NVARCHAR(1000) NOT NULL,
    [employeeId] NVARCHAR(1000) NOT NULL,
    [leaveTypeId] NVARCHAR(1000) NOT NULL,
    [balance] DECIMAL(5,2) NOT NULL,
    [accrued] DECIMAL(5,2) NOT NULL,
    [used] DECIMAL(5,2) NOT NULL,
    [carriedOver] DECIMAL(5,2) NOT NULL,
    [expired] DECIMAL(5,2) NOT NULL,
    [periodYear] INT NOT NULL,
    [periodMonth] INT NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [leave_balances_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [leave_balances_employeeId_leaveTypeId_periodYear_periodMonth_key] UNIQUE NONCLUSTERED ([employeeId],[leaveTypeId],[periodYear],[periodMonth])
);

-- CreateTable
CREATE TABLE [dbo].[overtime_requests] (
    [id] NVARCHAR(1000) NOT NULL,
    [employeeId] NVARCHAR(1000) NOT NULL,
    [date] DATE NOT NULL,
    [startTime] DATETIME2 NOT NULL,
    [endTime] DATETIME2 NOT NULL,
    [duration] INT NOT NULL,
    [reason] NVARCHAR(1000) NOT NULL,
    [compensationType] NVARCHAR(1000) NOT NULL CONSTRAINT [overtime_requests_compensationType_df] DEFAULT 'PAYOUT',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [overtime_requests_status_df] DEFAULT 'PENDING',
    [requestedAt] DATETIME2 NOT NULL CONSTRAINT [overtime_requests_requestedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [approvedBy] NVARCHAR(1000),
    [approvedAt] DATETIME2,
    [rejectedReason] NVARCHAR(1000),
    [calculatedAmount] DECIMAL(12,2),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [overtime_requests_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [overtime_requests_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[payroll_runs] (
    [id] NVARCHAR(1000) NOT NULL,
    [companyId] NVARCHAR(1000) NOT NULL,
    [periodYear] INT NOT NULL,
    [periodMonth] INT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [payroll_runs_status_df] DEFAULT 'DRAFT',
    [runDate] DATETIME2,
    [lockedAt] DATETIME2,
    [lockedBy] NVARCHAR(1000),
    [totalAmount] DECIMAL(15,2),
    [notes] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [payroll_runs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [payroll_runs_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [payroll_runs_companyId_periodYear_periodMonth_key] UNIQUE NONCLUSTERED ([companyId],[periodYear],[periodMonth])
);

-- CreateTable
CREATE TABLE [dbo].[payroll_items] (
    [id] NVARCHAR(1000) NOT NULL,
    [payrollRunId] NVARCHAR(1000) NOT NULL,
    [employeeId] NVARCHAR(1000) NOT NULL,
    [employmentType] NVARCHAR(1000) NOT NULL,
    [baseSalary] DECIMAL(12,2),
    [hourlyRate] DECIMAL(10,2),
    [dailyRate] DECIMAL(10,2),
    [basePay] DECIMAL(12,2) NOT NULL,
    [overtimePay] DECIMAL(12,2) NOT NULL CONSTRAINT [payroll_items_overtimePay_df] DEFAULT 0,
    [allowances] DECIMAL(12,2) NOT NULL CONSTRAINT [payroll_items_allowances_df] DEFAULT 0,
    [bonuses] DECIMAL(12,2) NOT NULL CONSTRAINT [payroll_items_bonuses_df] DEFAULT 0,
    [transportBonus] DECIMAL(12,2) NOT NULL CONSTRAINT [payroll_items_transportBonus_df] DEFAULT 0,
    [lunchBonus] DECIMAL(12,2) NOT NULL CONSTRAINT [payroll_items_lunchBonus_df] DEFAULT 0,
    [thr] DECIMAL(12,2) NOT NULL CONSTRAINT [payroll_items_thr_df] DEFAULT 0,
    [deductions] DECIMAL(12,2) NOT NULL CONSTRAINT [payroll_items_deductions_df] DEFAULT 0,
    [bpjsKesehatanEmployee] DECIMAL(12,2) NOT NULL CONSTRAINT [payroll_items_bpjsKesehatanEmployee_df] DEFAULT 0,
    [bpjsKesehatanEmployer] DECIMAL(12,2) NOT NULL CONSTRAINT [payroll_items_bpjsKesehatanEmployer_df] DEFAULT 0,
    [bpjsKetenagakerjaanEmployee] DECIMAL(12,2) NOT NULL CONSTRAINT [payroll_items_bpjsKetenagakerjaanEmployee_df] DEFAULT 0,
    [bpjsKetenagakerjaanEmployer] DECIMAL(12,2) NOT NULL CONSTRAINT [payroll_items_bpjsKetenagakerjaanEmployer_df] DEFAULT 0,
    [pph21] DECIMAL(12,2) NOT NULL CONSTRAINT [payroll_items_pph21_df] DEFAULT 0,
    [grossPay] DECIMAL(12,2) NOT NULL,
    [netPay] DECIMAL(12,2) NOT NULL,
    [breakdown] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [payroll_items_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [payroll_items_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[shift_schedules] (
    [id] NVARCHAR(1000) NOT NULL,
    [employeeId] NVARCHAR(1000) NOT NULL,
    [companyId] NVARCHAR(1000) NOT NULL,
    [dayOfWeek] INT NULL,
    [date] DATE NULL,
    [startTime] NVARCHAR(1000) NOT NULL,
    [endTime] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [shift_schedules_isActive_df] DEFAULT 1,
    [notes] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [shift_schedules_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [createdBy] NVARCHAR(1000) NOT NULL,
    [updatedBy] NVARCHAR(1000),
    CONSTRAINT [shift_schedules_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[audit_logs] (
    [id] NVARCHAR(1000) NOT NULL,
    [actorId] NVARCHAR(1000) NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [entityType] NVARCHAR(1000) NOT NULL,
    [entityId] NVARCHAR(1000) NOT NULL,
    [before] NVARCHAR(max),
    [after] NVARCHAR(max),
    [reason] NVARCHAR(1000),
    [ipAddress] NVARCHAR(1000),
    [userAgent] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [audit_logs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [audit_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [users_email_idx] ON [dbo].[users]([email]);
CREATE NONCLUSTERED INDEX [users_role_idx] ON [dbo].[users]([role]);
CREATE NONCLUSTERED INDEX [users_resetToken_idx] ON [dbo].[users]([resetToken]);
CREATE NONCLUSTERED INDEX [refresh_tokens_userId_idx] ON [dbo].[refresh_tokens]([userId]);
CREATE NONCLUSTERED INDEX [refresh_tokens_token_idx] ON [dbo].[refresh_tokens]([token]);
CREATE NONCLUSTERED INDEX [public_holidays_companyId_date_idx] ON [dbo].[public_holidays]([companyId], [date]);
CREATE NONCLUSTERED INDEX [policies_companyId_type_isActive_idx] ON [dbo].[policies]([companyId], [type], [isActive]);
CREATE NONCLUSTERED INDEX [employees_companyId_status_idx] ON [dbo].[employees]([companyId], [status]);
CREATE NONCLUSTERED INDEX [employees_managerId_idx] ON [dbo].[employees]([managerId]);
CREATE NONCLUSTERED INDEX [employees_userId_idx] ON [dbo].[employees]([userId]);
CREATE NONCLUSTERED INDEX [documents_employeeId_type_idx] ON [dbo].[documents]([employeeId], [type]);
CREATE NONCLUSTERED INDEX [attendances_employeeId_date_idx] ON [dbo].[attendances]([employeeId], [date]);
CREATE NONCLUSTERED INDEX [attendances_date_idx] ON [dbo].[attendances]([date]);
CREATE NONCLUSTERED INDEX [attendance_adjustments_employeeId_status_idx] ON [dbo].[attendance_adjustments]([employeeId], [status]);
CREATE NONCLUSTERED INDEX [attendance_adjustments_status_idx] ON [dbo].[attendance_adjustments]([status]);
CREATE NONCLUSTERED INDEX [leave_types_companyId_isActive_idx] ON [dbo].[leave_types]([companyId], [isActive]);
CREATE NONCLUSTERED INDEX [leave_requests_employeeId_status_idx] ON [dbo].[leave_requests]([employeeId], [status]);
CREATE NONCLUSTERED INDEX [leave_requests_status_startDate_idx] ON [dbo].[leave_requests]([status], [startDate]);
CREATE NONCLUSTERED INDEX [leave_balances_employeeId_periodYear_periodMonth_idx] ON [dbo].[leave_balances]([employeeId], [periodYear], [periodMonth]);
CREATE NONCLUSTERED INDEX [overtime_requests_employeeId_status_idx] ON [dbo].[overtime_requests]([employeeId], [status]);
CREATE NONCLUSTERED INDEX [overtime_requests_date_status_idx] ON [dbo].[overtime_requests]([date], [status]);
CREATE NONCLUSTERED INDEX [payroll_runs_companyId_periodYear_periodMonth_idx] ON [dbo].[payroll_runs]([companyId], [periodYear], [periodMonth]);
CREATE NONCLUSTERED INDEX [payroll_items_payrollRunId_idx] ON [dbo].[payroll_items]([payrollRunId]);
CREATE NONCLUSTERED INDEX [payroll_items_employeeId_idx] ON [dbo].[payroll_items]([employeeId]);
CREATE NONCLUSTERED INDEX [shift_schedules_employeeId_idx] ON [dbo].[shift_schedules]([employeeId]);
CREATE NONCLUSTERED INDEX [shift_schedules_companyId_idx] ON [dbo].[shift_schedules]([companyId]);
CREATE NONCLUSTERED INDEX [shift_schedules_dayOfWeek_idx] ON [dbo].[shift_schedules]([dayOfWeek]);
CREATE NONCLUSTERED INDEX [shift_schedules_date_idx] ON [dbo].[shift_schedules]([date]);
CREATE NONCLUSTERED INDEX [shift_schedules_isActive_idx] ON [dbo].[shift_schedules]([isActive]);
CREATE NONCLUSTERED INDEX [shift_schedules_employeeId_date_idx] ON [dbo].[shift_schedules]([employeeId], [date]);
CREATE NONCLUSTERED INDEX [audit_logs_actorId_idx] ON [dbo].[audit_logs]([actorId]);
CREATE NONCLUSTERED INDEX [audit_logs_entityType_entityId_idx] ON [dbo].[audit_logs]([entityType], [entityId]);
CREATE NONCLUSTERED INDEX [audit_logs_createdAt_idx] ON [dbo].[audit_logs]([createdAt]);
CREATE NONCLUSTERED INDEX [audit_logs_action_idx] ON [dbo].[audit_logs]([action]);

-- CreateIndex: Unique constraint for recurring schedules (dayOfWeek) - filtered index
-- Drop existing index if it exists (for safety, in case of re-running migration)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'shift_schedules_employeeId_dayOfWeek_companyId_key' AND object_id = OBJECT_ID('dbo.shift_schedules'))
BEGIN
    DROP INDEX [shift_schedules_employeeId_dayOfWeek_companyId_key] ON [dbo].[shift_schedules];
END

-- Create filtered unique index for recurring schedules (allows multiple NULL values)
CREATE UNIQUE NONCLUSTERED INDEX [shift_schedules_employeeId_dayOfWeek_companyId_key] ON [dbo].[shift_schedules]
(
    [employeeId] ASC,
    [dayOfWeek] ASC,
    [companyId] ASC
)
WHERE [dayOfWeek] IS NOT NULL;

-- CreateIndex: Unique constraint for date-specific schedules (date) - filtered index
-- Drop existing index if it exists (for safety, in case of re-running migration)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'shift_schedules_employeeId_date_companyId_key' AND object_id = OBJECT_ID('dbo.shift_schedules'))
BEGIN
    DROP INDEX [shift_schedules_employeeId_date_companyId_key] ON [dbo].[shift_schedules];
END

-- Create filtered unique index for date-specific schedules (allows multiple NULL values)
CREATE UNIQUE NONCLUSTERED INDEX [shift_schedules_employeeId_date_companyId_key] ON [dbo].[shift_schedules]
(
    [employeeId] ASC,
    [date] ASC,
    [companyId] ASC
)
WHERE [date] IS NOT NULL;

-- AddForeignKey
ALTER TABLE [dbo].[refresh_tokens] ADD CONSTRAINT [refresh_tokens_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[public_holidays] ADD CONSTRAINT [public_holidays_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[companies]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[policies] ADD CONSTRAINT [policies_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[companies]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[employees] ADD CONSTRAINT [employees_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE [dbo].[employees] ADD CONSTRAINT [employees_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[companies]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[employees] ADD CONSTRAINT [employees_managerId_fkey] FOREIGN KEY ([managerId]) REFERENCES [dbo].[employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[employments] ADD CONSTRAINT [employments_employeeId_fkey] FOREIGN KEY ([employeeId]) REFERENCES [dbo].[employees]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[documents] ADD CONSTRAINT [documents_employeeId_fkey] FOREIGN KEY ([employeeId]) REFERENCES [dbo].[employees]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[attendances] ADD CONSTRAINT [attendances_employeeId_fkey] FOREIGN KEY ([employeeId]) REFERENCES [dbo].[employees]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[attendance_adjustments] ADD CONSTRAINT [attendance_adjustments_attendanceId_fkey] FOREIGN KEY ([attendanceId]) REFERENCES [dbo].[attendances]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[leave_types] ADD CONSTRAINT [leave_types_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[companies]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[leave_requests] ADD CONSTRAINT [leave_requests_employeeId_fkey] FOREIGN KEY ([employeeId]) REFERENCES [dbo].[employees]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[leave_requests] ADD CONSTRAINT [leave_requests_leaveTypeId_fkey] FOREIGN KEY ([leaveTypeId]) REFERENCES [dbo].[leave_types]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[leave_balances] ADD CONSTRAINT [leave_balances_leaveTypeId_fkey] FOREIGN KEY ([leaveTypeId]) REFERENCES [dbo].[leave_types]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[overtime_requests] ADD CONSTRAINT [overtime_requests_employeeId_fkey] FOREIGN KEY ([employeeId]) REFERENCES [dbo].[employees]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[payroll_runs] ADD CONSTRAINT [payroll_runs_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[companies]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[payroll_items] ADD CONSTRAINT [payroll_items_payrollRunId_fkey] FOREIGN KEY ([payrollRunId]) REFERENCES [dbo].[payroll_runs]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[payroll_items] ADD CONSTRAINT [payroll_items_employeeId_fkey] FOREIGN KEY ([employeeId]) REFERENCES [dbo].[employees]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[shift_schedules] ADD CONSTRAINT [shift_schedules_employeeId_fkey] FOREIGN KEY ([employeeId]) REFERENCES [dbo].[employees]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE [dbo].[shift_schedules] ADD CONSTRAINT [shift_schedules_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[audit_logs] ADD CONSTRAINT [audit_logs_actorId_fkey] FOREIGN KEY ([actorId]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
