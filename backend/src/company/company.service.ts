import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async update(id: string, data: UpdateCompanyDto) {
    const company = await this.findOne(id);
    
    return this.prisma.company.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async getCompanyByUser(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      include: { company: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee.company;
  }
}

