import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PolicyService } from './policy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../types/enums';
import { PolicyType } from '../types/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IpAddress } from '../common/decorators/ip-address.decorator';
import { UserAgent } from '../common/decorators/user-agent.decorator';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';

@Controller('policies')
@UseGuards(JwtAuthGuard)
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Get()
  async getPolicies(@CurrentUser() user: any) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    return this.policyService.findAll(companyId);
  }

  @Get(':type')
  async getPolicyByType(
    @CurrentUser() user: any,
    @Param('type') type: PolicyType,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    return this.policyService.findByType(companyId, type);
  }

  @Post()
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async createPolicy(
    @CurrentUser() user: any,
    @Body() createPolicyDto: CreatePolicyDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    return this.policyService.create(companyId, createPolicyDto, user.id, ipAddress, userAgent);
  }

  @Put(':id')
  @Roles(Role.OWNER)
  @UseGuards(RolesGuard)
  async updatePolicy(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updatePolicyDto: UpdatePolicyDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    return this.policyService.update(id, companyId, updatePolicyDto, user.id, ipAddress, userAgent);
  }
}
