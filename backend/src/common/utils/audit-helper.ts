import { AuditService } from '../../audit/audit.service';

export interface AuditLogOptions {
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  before?: any;
  after?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Helper function to log audit events
 * This can be used in services to log audit events
 */
export async function logAuditEvent(
  auditService: AuditService,
  options: AuditLogOptions,
): Promise<void> {
  try {
    await auditService.log(
      options.action,
      options.entityType,
      options.entityId,
      options.actorId,
      options.before,
      options.after,
      options.reason,
      options.ipAddress,
      options.userAgent,
    );
  } catch (error) {
    // Don't throw - audit logging should not break the main operation
    console.error('Failed to log audit event:', error);
  }
}
