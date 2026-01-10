import { Controller, Get, Put, UseGuards, Body } from '@nestjs/common';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../types/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Controller('company')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  async getCompany(@CurrentUser() user: any) {
    if (user.employee?.companyId) {
      return this.companyService.findOne(user.employee.companyId);
    }
    // Fallback to default company for now
    return this.companyService.findOne('00000000-0000-0000-0000-000000000001');
  }

  @Put()
  @Roles('OWNER' as Role)
  @UseGuards(RolesGuard)
  async updateCompany(
    @CurrentUser() user: any,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    const companyId = user.employee?.companyId || '00000000-0000-0000-0000-000000000001';
    return this.companyService.update(companyId, updateCompanyDto);
  }
}

