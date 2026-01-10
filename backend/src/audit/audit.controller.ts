import {
  Controller,
  Get,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../types/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @Roles(Role.OWNER, Role.MANAGER)
  @UseGuards(RolesGuard)
  async getLogs(
    @CurrentUser() user: any,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    
    return this.auditService.getLogs(
      companyId,
      {
        entityType,
        entityId,
        action,
        actorId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      user,
    );
  }

  @Get('history')
  @Roles(Role.OWNER, Role.MANAGER)
  @UseGuards(RolesGuard)
  async getEntityHistory(
    @CurrentUser() user: any,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    
    return this.auditService.getEntityHistory(entityType, entityId, companyId);
  }
}

