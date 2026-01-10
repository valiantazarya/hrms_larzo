import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { PolicyModule } from './policy/policy.module';
import { EmployeeModule } from './employee/employee.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeaveModule } from './leave/leave.module';
import { OvertimeModule } from './overtime/overtime.module';
import { PayrollModule } from './payroll/payroll.module';
import { ReportingModule } from './reporting/reporting.module';
import { AuditModule } from './audit/audit.module';
import { FileStorageModule } from './file-storage/file-storage.module';
import { HealthModule } from './health/health.module';
import { ShiftScheduleModule } from './shift-schedule/shift-schedule.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    CompanyModule,
    PolicyModule,
    EmployeeModule,
    AttendanceModule,
    LeaveModule,
    OvertimeModule,
    PayrollModule,
    ReportingModule,
    AuditModule,
    FileStorageModule,
    HealthModule,
    ShiftScheduleModule,
  ],
})
export class AppModule {}


