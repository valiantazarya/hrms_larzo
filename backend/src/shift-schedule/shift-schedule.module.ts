import { Module } from '@nestjs/common';
import { ShiftScheduleService } from './shift-schedule.service';
import { ShiftScheduleController } from './shift-schedule.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShiftScheduleController],
  providers: [ShiftScheduleService],
  exports: [ShiftScheduleService],
})
export class ShiftScheduleModule {}
