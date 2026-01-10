import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PolicyType } from '../types/enums';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { logAuditEvent } from '../common/utils/audit-helper';

@Injectable()
export class PolicyService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(companyId: string) {
    const policies = await this.prisma.policy.findMany({
      where: { companyId },
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    });
    return policies.map(p => ({
      ...p,
      config: JSON.parse(p.config),
    }));
  }

  async findByType(companyId: string, type: PolicyType) {
    const policy = await this.prisma.policy.findFirst({
      where: {
        companyId,
        type,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (!policy) {
      throw new NotFoundException(`Active policy of type ${type} not found`);
    }

    return {
      ...policy,
      config: JSON.parse(policy.config),
    };
  }

  async create(
    companyId: string,
    createPolicyDto: CreatePolicyDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Get latest version
    const latest = await this.prisma.policy.findFirst({
      where: {
        companyId,
        type: createPolicyDto.type,
      },
      orderBy: { version: 'desc' },
    });

    const newVersion = latest ? latest.version + 1 : 1;

    // Deactivate old version if new one is active
    if (createPolicyDto.isActive !== false) {
      await this.prisma.policy.updateMany({
        where: {
          companyId,
          type: createPolicyDto.type,
          isActive: true,
        },
        data: { isActive: false },
      });
    }

    const policy = await this.prisma.policy.create({
      data: {
        companyId,
        type: createPolicyDto.type,
        config: JSON.stringify(createPolicyDto.config),
        version: newVersion,
        isActive: createPolicyDto.isActive !== false,
      },
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'CREATE',
      entityType: 'Policy',
      entityId: policy.id,
      actorId: userId,
      after: {
        type: policy.type,
        version: policy.version,
        isActive: policy.isActive,
        config: createPolicyDto.config,
      },
      ipAddress,
      userAgent,
    });

    return {
      ...policy,
      config: JSON.parse(policy.config),
    };
  }

  async update(
    id: string,
    companyId: string,
    updatePolicyDto: UpdatePolicyDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const policy = await this.prisma.policy.findUnique({
      where: { id },
    });

    if (!policy || policy.companyId !== companyId) {
      throw new NotFoundException('Policy not found');
    }

    const before = {
      config: JSON.parse(policy.config),
      isActive: policy.isActive,
    };

    const updatedPolicy = await this.prisma.policy.update({
      where: { id },
      data: {
        ...(updatePolicyDto.config && { config: JSON.stringify(updatePolicyDto.config) }),
        ...(updatePolicyDto.isActive !== undefined && { isActive: updatePolicyDto.isActive }),
        updatedAt: new Date(),
      },
    });

    // Log audit event
    await logAuditEvent(this.auditService, {
      action: 'UPDATE',
      entityType: 'Policy',
      entityId: id,
      actorId: userId,
      before,
      after: {
        config: updatePolicyDto.config || before.config,
        isActive: updatePolicyDto.isActive !== undefined ? updatePolicyDto.isActive : before.isActive,
      },
      ipAddress,
      userAgent,
    });

    return {
      ...updatedPolicy,
      config: JSON.parse(updatedPolicy.config),
    };
  }
}

