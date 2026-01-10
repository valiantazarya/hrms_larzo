import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../types/enums';
import { CreateShiftScheduleDto } from './dto/create-shift-schedule.dto';
import { UpdateShiftScheduleDto } from './dto/update-shift-schedule.dto';
import { DateTime } from 'luxon';
import { normalizeDateForDatabase, getDayOfWeek, dateStringToDatabaseDate } from '../common/utils/date-helper';

@Injectable()
export class ShiftScheduleService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, userId: string, createDto: CreateShiftScheduleDto) {
    // Verify employee belongs to company
    const employee = await this.prisma.employee.findUnique({
      where: { id: createDto.employeeId },
      include: { company: true },
    });

    if (!employee || employee.companyId !== companyId) {
      throw new NotFoundException('Employee not found');
    }

    // Validate that either dayOfWeek or date is provided, but not both
    if (!createDto.dayOfWeek && !createDto.date) {
      throw new BadRequestException('Either dayOfWeek (for recurring) or date (for specific date) must be provided');
    }

    if (createDto.dayOfWeek !== undefined && createDto.dayOfWeek !== null && createDto.date) {
      throw new BadRequestException('Cannot specify both dayOfWeek and date. Use dayOfWeek for recurring schedules or date for specific dates.');
    }

    // Check if schedule already exists using raw query to properly handle NULL values
    if (createDto.date) {
      // Date-specific schedule - check for existing date-specific schedule
      const normalizedDate = normalizeDateForDatabase(createDto.date);
      const dateStr = DateTime.fromJSDate(normalizedDate).toISODate() || normalizedDate.toISOString().split('T')[0];
      const existing = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT TOP 1 * FROM [dbo].[shift_schedules] 
         WHERE [employeeId] = N'${createDto.employeeId}' 
         AND [companyId] = N'${companyId}' 
         AND [date] = '${dateStr}' 
         AND [dayOfWeek] IS NULL`
      );

      if (existing && existing.length > 0) {
        throw new BadRequestException(
          'Shift schedule already exists for this employee on this date',
        );
      }
    } else if (createDto.dayOfWeek !== undefined && createDto.dayOfWeek !== null) {
      // Recurring schedule - check for existing recurring schedule
      const existing = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT TOP 1 * FROM [dbo].[shift_schedules] 
         WHERE [employeeId] = N'${createDto.employeeId}' 
         AND [companyId] = N'${companyId}' 
         AND [dayOfWeek] = ${createDto.dayOfWeek} 
         AND [date] IS NULL`
      );

      if (existing && existing.length > 0) {
        throw new BadRequestException(
          'Shift schedule already exists for this employee on this day of week',
        );
      }
    }

    // Validate time format and logic
    this.validateTimeRange(createDto.startTime, createDto.endTime);

    // Prepare data - conditionally include fields to avoid Prisma unique constraint validation
    // The Prisma client still has the unique constraint cached, so we need to work around it
    const baseData: any = {
      employeeId: createDto.employeeId,
      companyId,
      startTime: createDto.startTime,
      endTime: createDto.endTime,
      isActive: createDto.isActive ?? true,
      notes: createDto.notes,
      createdBy: userId,
    };

    // Conditionally add dayOfWeek and date based on schedule type
    // For date-specific: only set date (dayOfWeek will be NULL in DB)
    // For recurring: only set dayOfWeek (date will be NULL in DB)
    if (createDto.date) {
      baseData.date = normalizeDateForDatabase(createDto.date);
      // Explicitly set dayOfWeek to null using Prisma's connect syntax workaround
      // We'll use $executeRawUnsafe as a workaround until Prisma client is regenerated
    } else if (createDto.dayOfWeek !== undefined && createDto.dayOfWeek !== null) {
      baseData.dayOfWeek = createDto.dayOfWeek;
      // date will be NULL in DB
    }

    // Use Prisma's create with explicit null handling
    // Since Prisma client still has unique constraint cached, we'll use raw SQL to bypass it
    // This is a temporary workaround until Prisma client is regenerated
    const { randomUUID } = require('crypto');
    const id = randomUUID();
    const dateValue = createDto.date ? normalizeDateForDatabase(createDto.date) : null;
    const dayOfWeekValue = createDto.dayOfWeek ?? null;
    
    // Use Prisma's $executeRawUnsafe to insert with proper NULL handling
    // The filtered unique indexes should allow multiple NULL values, but we need to ensure
    // we're not creating duplicates by checking before insert (done above)
    const dateSql = dateValue ? `'${DateTime.fromJSDate(dateValue).toISODate() || dateValue.toISOString().split('T')[0]}'` : 'NULL';
    const dayOfWeekSql = dayOfWeekValue !== null ? dayOfWeekValue.toString() : 'NULL';
    const notesSql = baseData.notes ? `N'${baseData.notes.replace(/'/g, "''")}'` : 'NULL';
    
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO [dbo].[shift_schedules] 
       ([id], [employeeId], [companyId], [dayOfWeek], [date], [startTime], [endTime], [isActive], [notes], [createdAt], [updatedAt], [createdBy])
       VALUES 
       (N'${id}', N'${baseData.employeeId}', N'${baseData.companyId}', ${dayOfWeekSql}, ${dateSql}, N'${baseData.startTime}', N'${baseData.endTime}', ${baseData.isActive ? 1 : 0}, ${notesSql}, GETDATE(), GETDATE(), N'${baseData.createdBy}')`
    );
    
    return this.prisma.shiftSchedule.findUnique({
      where: { id },
    });
  }

  async findAll(companyId: string, employeeId?: string, weekStartDate?: string, startDate?: string, endDate?: string) {
    const where: any = {
      companyId,
      isActive: true,
    };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    // If date range is provided, include both recurring (dayOfWeek) and date-specific schedules
    if (startDate && endDate) {
      const start = normalizeDateForDatabase(startDate);
      const end = normalizeDateForDatabase(endDate);
      end.setHours(23, 59, 59, 999); // Include entire end date

      where.OR = [
        // Recurring schedules (dayOfWeek is not null, date is null)
        { dayOfWeek: { not: null }, date: null },
        // Date-specific schedules within range
        { date: { gte: start, lte: end } },
      ];
    }

    const schedules = await this.prisma.shiftSchedule.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { employee: { firstName: 'asc' } },
        { date: 'asc' },
        { dayOfWeek: 'asc' },
      ] as any, // Temporary type assertion until Prisma client is regenerated
    });

    // If weekStartDate is provided, filter and organize by week
    if (weekStartDate) {
      return this.organizeByWeek(schedules, weekStartDate);
    }

    return schedules;
  }

  async findOne(id: string, companyId: string) {
    const schedule = await this.prisma.shiftSchedule.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!schedule || schedule.companyId !== companyId) {
      throw new NotFoundException('Shift schedule not found');
    }

    return schedule;
  }

  async update(
    id: string,
    companyId: string,
    userId: string,
    updateDto: UpdateShiftScheduleDto,
  ) {
    const schedule = await this.prisma.shiftSchedule.findUnique({
      where: { id },
    });

    if (!schedule || schedule.companyId !== companyId) {
      throw new NotFoundException('Shift schedule not found');
    }

    // Validate update: either dayOfWeek or date, but not both
    if (updateDto.dayOfWeek !== undefined && updateDto.date !== undefined) {
      throw new BadRequestException('Cannot specify both dayOfWeek and date');
    }

    // If updating dayOfWeek, check for conflicts
    if (updateDto.dayOfWeek !== undefined && updateDto.dayOfWeek !== schedule.dayOfWeek) {
      const existing = await this.prisma.shiftSchedule.findFirst({
        where: {
          employeeId: schedule.employeeId,
          companyId,
          dayOfWeek: updateDto.dayOfWeek,
          date: null, // Recurring schedule
          id: { not: id },
        } as any, // Temporary type assertion until Prisma client is regenerated
      });

      if (existing) {
        throw new BadRequestException(
          'Shift schedule already exists for this employee on this day of week',
        );
      }
    }

    // If updating date, check for conflicts
    if (updateDto.date !== undefined) {
      const newDate = updateDto.date ? normalizeDateForDatabase(updateDto.date) : null;
      if (newDate) {
        // Check if schedule date is actually changing
        const currentDate = (schedule as any).date ? normalizeDateForDatabase((schedule as any).date).getTime() : null;
        const newDateTime = newDate.getTime();
        
        if (currentDate !== newDateTime) {
          const existing = await this.prisma.shiftSchedule.findFirst({
            where: {
              employeeId: schedule.employeeId,
              companyId,
              date: newDate,
              id: { not: id },
            } as any, // Temporary type assertion until Prisma client is regenerated
          });

          if (existing) {
            throw new BadRequestException(
              'Shift schedule already exists for this employee on this date',
            );
          }
        }
      }
    }

    // Validate time range if times are being updated
    const startTime = updateDto.startTime ?? schedule.startTime;
    const endTime = updateDto.endTime ?? schedule.endTime;
    this.validateTimeRange(startTime, endTime);

    // Prepare update data
    const updateData: any = {
      ...updateDto,
      updatedBy: userId,
    };

    // Convert date string to Date object if provided
    if (updateDto.date !== undefined) {
      updateData.date = updateDto.date ? normalizeDateForDatabase(updateDto.date) : null;
    }

    return this.prisma.shiftSchedule.update({
      where: { id },
      data: updateData as any, // Temporary type assertion until Prisma client is regenerated
    });
  }

  async remove(id: string, companyId: string) {
    const schedule = await this.prisma.shiftSchedule.findUnique({
      where: { id },
    });

    if (!schedule || schedule.companyId !== companyId) {
      throw new NotFoundException('Shift schedule not found');
    }

    return this.prisma.shiftSchedule.delete({
      where: { id },
    });
  }

  async getEmployeeScheduleForDate(employeeId: string, date: Date) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true },
    });

    if (!employee) {
      return null;
    }

    const dateStr = DateTime.fromJSDate(date).setZone('Asia/Jakarta').toISODate();
    const dayOfWeek = new Date(date).getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // First check for date-specific schedule
    const dateSpecific = await this.prisma.shiftSchedule.findFirst({
      where: {
        employeeId,
        companyId: employee.companyId,
        date: date,
        isActive: true,
      } as any, // Temporary type assertion until Prisma client is regenerated
    });

    if (dateSpecific) {
      return dateSpecific;
    }

    // If no date-specific schedule, check for recurring schedule
    const recurring = await this.prisma.shiftSchedule.findFirst({
      where: {
        employeeId,
        companyId: employee.companyId,
        dayOfWeek,
        date: null, // Recurring schedules have null date
        isActive: true,
      } as any, // Temporary type assertion until Prisma client is regenerated
    });

    return recurring;
  }

  /**
   * Check if employee has a shift scheduled for a specific date (regardless of time)
   */
  async hasShiftForDate(employeeId: string, date: Date): Promise<boolean> {
    // Normalize date for database comparison
    const dateOnly = normalizeDateForDatabase(date);
    const dayOfWeek = getDayOfWeek(date);

    // Get employee's companyId
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true },
    });

    if (!employee) {
      return false;
    }

    // Check for date-specific schedule first (takes precedence)
    const dateSpecificSchedule = await this.prisma.shiftSchedule.findFirst({
      where: {
        employeeId,
        companyId: employee.companyId,
        date: dateOnly,
        isActive: true,
      } as any,
    });

    if (dateSpecificSchedule) {
      return true;
    }

    // Check for recurring schedule by day of week
    const recurringSchedule = await this.prisma.shiftSchedule.findFirst({
      where: {
        employeeId,
        companyId: employee.companyId,
        dayOfWeek,
        date: null,
        isActive: true,
      } as any,
    });

    return !!recurringSchedule;
  }

  async isWithinSchedule(employeeId: string, dateTime: Date): Promise<boolean> {
    const schedule = await this.getEmployeeScheduleForDate(employeeId, dateTime);
    
    if (!schedule || !schedule.isActive) {
      return false; // No schedule means not within schedule (can be overtime)
    }

    const dt = DateTime.fromJSDate(dateTime).setZone('Asia/Jakarta');
    const timeStr = dt.toFormat('HH:mm');
    
    // Parse schedule times
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);
    
    const scheduleStart = dt.set({ hour: startHour, minute: startMin, second: 0, millisecond: 0 });
    const scheduleEnd = dt.set({ hour: endHour, minute: endMin, second: 0, millisecond: 0 });
    
    // Handle overnight shifts (end time < start time)
    if (scheduleEnd <= scheduleStart) {
      // Shift spans midnight
      return dt >= scheduleStart || dt <= scheduleEnd;
    }
    
    return dt >= scheduleStart && dt <= scheduleEnd;
  }

  private validateTimeRange(startTime: string, endTime: string) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    if (startHour < 0 || startHour > 23 || startMin < 0 || startMin > 59) {
      throw new BadRequestException('Invalid startTime format');
    }

    if (endHour < 0 || endHour > 23 || endMin < 0 || endMin > 59) {
      throw new BadRequestException('Invalid endTime format');
    }

    // Allow overnight shifts (end time can be less than start time)
    // But validate that times are valid
  }

  private organizeByWeek(schedules: any[], weekStartDate: string) {
    const weekStart = DateTime.fromISO(weekStartDate).startOf('week');
    const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i }));

    const result: any = {
      weekStart: weekStart.toISODate(),
      weekEnd: weekStart.plus({ days: 6 }).toISODate(),
      schedules: [],
    };

    // Group schedules by employee
    const byEmployee = schedules.reduce((acc, schedule) => {
      if (!acc[schedule.employeeId]) {
        acc[schedule.employeeId] = {
          employee: schedule.employee,
          days: {},
        };
      }
      acc[schedule.employeeId].days[schedule.dayOfWeek] = schedule;
      return acc;
    }, {} as any);

    // Convert to array format
    result.schedules = Object.values(byEmployee).map((emp: any) => ({
      employee: emp.employee,
      weekSchedule: weekDays.map((day, index) => ({
        date: day.toISODate(),
        dayOfWeek: day.weekday === 7 ? 0 : day.weekday, // Convert to 0-6 format
        schedule: emp.days[day.weekday === 7 ? 0 : day.weekday] || null,
      })),
    }));

    return result;
  }
}
