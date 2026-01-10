-- Seed data for HRMS

-- Company
INSERT INTO companies (id, name, address, phone, email, npwp, "createdAt", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', 'PT Contoh Perusahaan', 'Jl. Contoh No. 123, Jakarta', '+62-21-12345678', 'info@contoh.com', '12.345.678.9-000.000', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner user (password: owner123)
INSERT INTO users (id, email, "passwordHash", role, "isActive", "createdAt", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', 'owner@contoh.com', '$2b$10$Vb/X11zAEY8IlRyxlABW6OvpT4ilahZ9iCTh2HBK6Knx142AdgwFS', 'OWNER', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash";

-- Owner employee
INSERT INTO employees (id, "userId", "companyId", "employeeCode", "firstName", "lastName", "joinDate", status, "createdAt", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'OWN001', 'Owner', 'System', '2020-01-01', 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Policies
INSERT INTO policies (id, "companyId", type, config, version, "isActive", "createdAt", "updatedAt")
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ATTENDANCE_RULES', '{"gracePeriodMinutes":15,"roundingEnabled":true,"roundingInterval":15,"minimumWorkHours":4,"breakRequired":true,"breakDurationMinutes":60}'::jsonb, 1, true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'OVERTIME_POLICY', '{"rules":{"WEEKDAY":{"enabled":true,"multiplier":1.5,"maxHours":null,"minimumPayment":0},"WEEKEND":{"enabled":true,"multiplier":2.0,"maxHours":8,"minimumPayment":0},"HOLIDAY":{"enabled":true,"multiplier":3.0,"maxHours":null,"minimumPayment":0}}}'::jsonb, 1, true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'LEAVE_POLICY', '{"accrualMethod":"YEARLY","maxBalance":12,"carryoverAllowed":true,"carryoverMax":5,"expiresAfterMonths":12,"requiresApproval":true}'::jsonb, 1, true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'PAYROLL_CONFIG', '{"bpjsKesehatan":{"type":"percentage","value":5},"bpjsKetenagakerjaan":{"type":"percentage","value":2},"defaultAllowances":[],"defaultDeductions":[],"currency":"IDR"}'::jsonb, 1, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Leave Types
INSERT INTO leave_types (id, "companyId", code, name, "nameId", "isPaid", "maxBalance", "accrualRate", "carryoverAllowed", "carryoverMax", "expiresAfterMonths", "requiresAttachment", "isActive", "createdAt", "updatedAt")
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'CUTI_TAHUNAN', 'Annual Leave', 'Cuti Tahunan', true, 12, 1.0, true, 5, 12, false, true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'SAKIT', 'Sick Leave', 'Cuti Sakit', true, NULL, NULL, false, NULL, NULL, true, true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'IZIN', 'Permission Leave', 'Izin', false, NULL, NULL, false, NULL, NULL, false, true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'UNPAID', 'Unpaid Leave', 'Cuti Tanpa Gaji', false, NULL, NULL, false, NULL, NULL, false, true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'MATERNITY', 'Maternity Leave', 'Cuti Melahirkan', true, 3, NULL, false, NULL, NULL, true, true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'PATERNITY', 'Paternity Leave', 'Cuti Ayah', true, 2, NULL, false, NULL, NULL, false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Public Holidays 2024
INSERT INTO public_holidays (id, "companyId", name, date, "isNational", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Tahun Baru', '2024-01-01', true, NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Hari Raya Idul Fitri', '2024-04-10', true, NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Hari Raya Idul Fitri', '2024-04-11', true, NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Hari Buruh Internasional', '2024-05-01', true, NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Hari Raya Waisak', '2024-05-23', true, NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Hari Kenaikan Isa Almasih', '2024-05-09', true, NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Hari Lahir Pancasila', '2024-06-01', true, NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Hari Raya Idul Adha', '2024-06-17', true, NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Tahun Baru Islam', '2024-07-07', true, NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Hari Kemerdekaan RI', '2024-08-17', true, NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Maulid Nabi Muhammad SAW', '2024-09-15', true, NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Hari Natal', '2024-12-25', true, NOW(), NOW())
ON CONFLICT ("companyId", date) DO NOTHING;

SELECT '✅ Seed data completed!' as status;


