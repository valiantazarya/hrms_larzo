import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import * as bcrypt from 'bcrypt';

// Parse SQL Server connection string
const connectionString = process.env.DATABASE_URL || '';
let sqlConfig: any;

if (connectionString.startsWith('sqlserver://')) {
  // Parse SQL Server connection string (format: sqlserver://server:port;database=db;user=user;password=pass;trustServerCertificate=true)
  const parts = connectionString.replace('sqlserver://', '').split(';');
  const serverPart = parts[0].split(':');
  const config: Record<string, string> = {};
  
  parts.slice(1).forEach(part => {
    const [key, value] = part.split('=');
    if (key && value) config[key.trim()] = value.trim();
  });
  
  sqlConfig = {
    user: config.user || 'sa',
    password: config.password || 'HrmsPassword123!',
    database: config.database || 'larzo_hrms',
    server: serverPart[0] || 'localhost',
    port: parseInt(serverPart[1] || config.port || '1433'),
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    options: {
      encrypt: config.encrypt === 'true',
      trustServerCertificate: config.trustServerCertificate !== 'false',
    },
  };
} else {
  sqlConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'HrmsPassword123!',
    database: process.env.DB_NAME || 'larzo_hrms',
    server: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
    },
  };
}

const adapter = new PrismaMssql(sqlConfig);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Starting seed...');

  // Create company
  const company = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'PT Contoh Perusahaan',
      address: 'Jl. Contoh No. 123, Jakarta',
      phone: '+62-21-12345678',
      email: 'info@contoh.com',
      npwp: '12.345.678.9-000.000',
    },
  });

  console.log('✅ Company created');

  // Create owner user
  const ownerPasswordHash = await bcrypt.hash('owner123', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@contoh.com' },
    update: {},
    create: {
      email: 'owner@contoh.com',
      passwordHash: ownerPasswordHash,
      role: 'OWNER',
      isActive: true,
    },
  });

  // Create owner employee
  await prisma.employee.upsert({
    where: { userId: owner.id },
    update: {},
    create: {
      userId: owner.id,
      companyId: company.id,
      employeeCode: 'EMP001',
      firstName: 'Owner',
      lastName: 'System',
      joinDate: new Date('2020-01-01'),
      status: 'ACTIVE',
    },
  });

  console.log('✅ Owner user created');

  // Create default policies
  const attendancePolicy = await prisma.policy.upsert({
    where: {
      companyId_type_version: {
        companyId: company.id,
        type: 'ATTENDANCE_RULES',
        version: 1,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      type: 'ATTENDANCE_RULES',
      config: JSON.stringify({
        gracePeriodMinutes: 15,
        roundingEnabled: true,
        roundingInterval: 15,
        minimumWorkHours: 4,
        breakRequired: true,
        breakDurationMinutes: 60,
      }),
      version: 1,
      isActive: true,
    },
  });

  const overtimePolicy = await prisma.policy.upsert({
    where: {
      companyId_type_version: {
        companyId: company.id,
        type: 'OVERTIME_POLICY',
        version: 1,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      type: 'OVERTIME_POLICY',
      config: JSON.stringify({
        rules: {
          WEEKDAY: {
            enabled: true,
            multiplier: 1.5,
            maxHours: null,
            minimumPayment: 0,
          },
          WEEKEND: {
            enabled: true,
            multiplier: 2.0,
            maxHours: 8,
            minimumPayment: 0,
          },
          HOLIDAY: {
            enabled: true,
            multiplier: 3.0,
            maxHours: null,
            minimumPayment: 0,
          },
        },
      }),
      version: 1,
      isActive: true,
    },
  });

  const leavePolicy = await prisma.policy.upsert({
    where: {
      companyId_type_version: {
        companyId: company.id,
        type: 'LEAVE_POLICY',
        version: 1,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      type: 'LEAVE_POLICY',
      config: JSON.stringify({
        accrualMethod: 'YEARLY',
        maxBalance: 12,
        carryoverAllowed: true,
        carryoverMax: 5,
        expiresAfterMonths: 12,
        requiresApproval: true,
      }),
      version: 1,
      isActive: true,
    },
  });

  const payrollConfig = await prisma.policy.upsert({
    where: {
      companyId_type_version: {
        companyId: company.id,
        type: 'PAYROLL_CONFIG',
        version: 1,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      type: 'PAYROLL_CONFIG',
      config: JSON.stringify({
        bpjsKesehatan: { type: 'percentage', value: 5 },
        bpjsKetenagakerjaan: { type: 'percentage', value: 2 },
        defaultAllowances: [],
        defaultDeductions: [],
        currency: 'IDR',
      }),
      version: 1,
      isActive: true,
    },
  });

  console.log('✅ Policies created');

  // Create leave types
  const leaveTypes = [
    {
      code: 'CUTI_TAHUNAN',
      name: 'Annual Leave',
      nameId: 'Cuti Tahunan',
      isPaid: true,
      maxBalance: 12,
      accrualRate: 1.0,
      carryoverAllowed: true,
      carryoverMax: 5,
      expiresAfterMonths: 12,
      requiresAttachment: false,
    },
    {
      code: 'SAKIT',
      name: 'Sick Leave',
      nameId: 'Cuti Sakit',
      isPaid: true,
      maxBalance: null,
      accrualRate: null,
      carryoverAllowed: false,
      carryoverMax: null,
      expiresAfterMonths: null,
      requiresAttachment: true,
    },
    {
      code: 'IZIN',
      name: 'Permission Leave',
      nameId: 'Izin',
      isPaid: false,
      maxBalance: null,
      accrualRate: null,
      carryoverAllowed: false,
      carryoverMax: null,
      expiresAfterMonths: null,
      requiresAttachment: false,
    },
    {
      code: 'UNPAID',
      name: 'Unpaid Leave',
      nameId: 'Cuti Tanpa Gaji',
      isPaid: false,
      maxBalance: null,
      accrualRate: null,
      carryoverAllowed: false,
      carryoverMax: null,
      expiresAfterMonths: null,
      requiresAttachment: false,
    },
    {
      code: 'MATERNITY',
      name: 'Maternity Leave',
      nameId: 'Cuti Melahirkan',
      isPaid: true,
      maxBalance: 3,
      accrualRate: null,
      carryoverAllowed: false,
      carryoverMax: null,
      expiresAfterMonths: null,
      requiresAttachment: true,
    },
    {
      code: 'PATERNITY',
      name: 'Paternity Leave',
      nameId: 'Cuti Ayah',
      isPaid: true,
      maxBalance: 2,
      accrualRate: null,
      carryoverAllowed: false,
      carryoverMax: null,
      expiresAfterMonths: null,
      requiresAttachment: false,
    },
  ];

  for (const leaveType of leaveTypes) {
    await prisma.leaveType.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: leaveType.code,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        ...leaveType,
      },
    });
  }

  console.log('✅ Leave types created');

  // Create Indonesia public holidays for 2024
  const holidays2024 = [
    { name: 'Tahun Baru', date: '2024-01-01' },
    { name: 'Hari Raya Idul Fitri', date: '2024-04-10' },
    { name: 'Hari Raya Idul Fitri', date: '2024-04-11' },
    { name: 'Hari Buruh Internasional', date: '2024-05-01' },
    { name: 'Hari Raya Waisak', date: '2024-05-23' },
    { name: 'Hari Kenaikan Isa Almasih', date: '2024-05-09' },
    { name: 'Hari Lahir Pancasila', date: '2024-06-01' },
    { name: 'Hari Raya Idul Adha', date: '2024-06-17' },
    { name: 'Tahun Baru Islam', date: '2024-07-07' },
    { name: 'Hari Kemerdekaan RI', date: '2024-08-17' },
    { name: 'Maulid Nabi Muhammad SAW', date: '2024-09-15' },
    { name: 'Hari Natal', date: '2024-12-25' },
  ];

  for (const holiday of holidays2024) {
    await prisma.publicHoliday.upsert({
      where: {
        companyId_date: {
          companyId: company.id,
          date: new Date(holiday.date),
        },
      },
      update: {},
      create: {
        companyId: company.id,
        name: holiday.name,
        date: new Date(holiday.date),
        isNational: true,
      },
    });
  }

  console.log('✅ Public holidays created');

  console.log('🎉 Seed completed!');
  console.log('\n📝 Default credentials:');
  console.log('   Email: owner@contoh.com');
  console.log('   Password: owner123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

