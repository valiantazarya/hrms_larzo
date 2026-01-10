import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ShiftScheduleModule } from '../shift-schedule/shift-schedule.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, ShiftScheduleModule, AuditModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}

