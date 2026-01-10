import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../types/enums';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    action: string,
    entityType: string,
    entityId: string,
    actorId: string,
    before?: any,
    after?: any,
    reason?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        before: before ? (typeof before === 'string' ? before : JSON.stringify(before)) : null,
        after: after ? (typeof after === 'string' ? after : JSON.stringify(after)) : null,
        reason,
        ipAddress,
        userAgent,
      },
    });
  }

  async getLogs(
    companyId: string,
    filters?: {
      entityType?: string;
      entityId?: string;
      action?: string;
      actorId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    user?: any,
  ) {
    // Build where clause
    const where: any = {};

    // Get all employees in the company (for filtering actors)
    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        ...(user?.role === Role.MANAGER && {
          managerId: user.employee?.id,
        }),
        ...(user?.role === Role.EMPLOYEE && {
          id: user.employee?.id,
        }),
      },
      select: { id: true },
    });

    const employeeIds = employees.map(e => e.id);
    
    // If no employees found, return empty result
    if (employeeIds.length === 0) {
      return [];
    }
    
    const userIds = await this.prisma.user.findMany({
      where: {
        employee: {
          id: { in: employeeIds },
        },
      },
      select: { id: true },
    });

    const companyUserIds = userIds.map(u => u.id);
    
    // If no users found, return empty result
    if (companyUserIds.length === 0) {
      return [];
    }

    // Filter by company employees (all roles should see only their company's logs)
    where.actorId = { in: companyUserIds };

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters?.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.actorId) {
      // If actorId filter is provided, ensure it's still within company employees
      if (companyUserIds.includes(filters.actorId)) {
        where.actorId = filters.actorId;
      } else {
        // Actor not in company, return empty result
        return [];
      }
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit to prevent performance issues
    });

    // Manually fetch actor details
    const logsWithActors = await Promise.all(
      logs.map(async (log) => {
        const actor = await this.prisma.user.findUnique({
          where: { id: log.actorId },
          select: {
            id: true,
            email: true,
            role: true,
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

        return {
          ...log,
          before: log.before ? (typeof log.before === 'string' ? JSON.parse(log.before) : log.before) : null,
          after: log.after ? (typeof log.after === 'string' ? JSON.parse(log.after) : log.after) : null,
          actor,
        };
      }),
    );

    return logsWithActors;
  }

  async getEntityHistory(entityType: string, entityId: string, companyId: string) {
    // Get all logs for a specific entity
    const logs = await this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Manually fetch actor details and filter by company
    const filteredLogs = [];
    for (const log of logs) {
      const actor = await this.prisma.user.findUnique({
        where: { id: log.actorId },
        select: {
          id: true,
          email: true,
          role: true,
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              companyId: true,
            },
          },
        },
      });

      if (actor?.employee && actor.employee.companyId === companyId) {
        filteredLogs.push({
          ...log,
          actor,
          before: log.before ? JSON.parse(log.before) : null,
          after: log.after ? JSON.parse(log.after) : null,
        });
      }
    }

    return filteredLogs;
  }
}

