import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, AccountType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapCompany(company: any) {
    if (!company) return company;
    const idStr = company.id ? company.id.toString() : '';
    const tenantIdStr = company.tenantId ? company.tenantId.toString() : '';
    return {
      ...company,
      id: idStr,
      tenantId: tenantIdStr,
      currency: company.currencyCode ?? 'EGP',
      fiscalYearStart: company.fiscalYearStartMonth ?? 1,
      code: company.code ?? '',
    };
  }

  async create(
    createCompanyDto: CreateCompanyDto,
    tenantId: bigint,
    userId?: bigint,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          tenantId,
          name: createCompanyDto.name,
          legalName: createCompanyDto.legalName,
          industryType: createCompanyDto.industryType,
          currencyCode:
            createCompanyDto.currencyCode ?? createCompanyDto.currency ?? 'EGP',
          fiscalYearStartMonth:
            createCompanyDto.fiscalYearStartMonth ??
            createCompanyDto.fiscalYearStart ??
            1,
          taxNumber: createCompanyDto.taxNumber,
        },
      });

      // Write audit log for company creation
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: userId ?? null,
          entityType: 'Company',
          entityId: company.id,
          action: 'create',
          newValues: JSON.stringify(company),
        },
      });

      // Create default units
      if (createCompanyDto.createDefaultUnits) {
        const defaultUnits = [
          { name: 'Pieces', symbol: 'pc', companyId: company.id },
          { name: 'Kg', symbol: 'kg', companyId: company.id },
          { name: 'Liters', symbol: 'L', companyId: company.id },
          { name: 'Meters', symbol: 'm', companyId: company.id },
          { name: 'Box', symbol: 'box', companyId: company.id },
          { name: 'Carton', symbol: 'ctn', companyId: company.id },
        ];
        await tx.unit.createMany({
          data: defaultUnits,
        });
      }

      // Create default chart of accounts
      if (createCompanyDto.createDefaultAccounts) {
        const defaultAccounts = [
          {
            code: '1000',
            name: 'Cash',
            type: AccountType.asset,
            companyId: company.id,
          },
          {
            code: '1100',
            name: 'Accounts Receivable',
            type: AccountType.asset,
            companyId: company.id,
          },
          {
            code: '1200',
            name: 'Inventory',
            type: AccountType.asset,
            companyId: company.id,
          },
          {
            code: '2000',
            name: 'Accounts Payable',
            type: AccountType.liability,
            companyId: company.id,
          },
          {
            code: '3000',
            name: 'Owner Equity',
            type: AccountType.equity,
            companyId: company.id,
          },
          {
            code: '4000',
            name: 'Sales Revenue',
            type: AccountType.revenue,
            companyId: company.id,
          },
          {
            code: '5000',
            name: 'Cost of Goods Sold',
            type: AccountType.cogs,
            companyId: company.id,
          },
          {
            code: '5100',
            name: 'Rent Expense',
            type: AccountType.expense,
            companyId: company.id,
          },
          {
            code: '5200',
            name: 'Salary Expense',
            type: AccountType.expense,
            companyId: company.id,
          },
        ];
        await tx.account.createMany({
          data: defaultAccounts,
        });
      }

      return this.mapCompany(company);
    });
  }

  async findAll(tenantId: bigint) {
    const companies = await this.prisma.company.findMany({
      where: { tenantId },
    });
    return companies.map((c) => this.mapCompany(c));
  }

  async findOne(id: bigint, tenantId: bigint) {
    const company = await this.prisma.company.findFirst({
      where: { id, tenantId },
    });

    if (!company) {
      throw new NotFoundException(
        `Company with ID ${id} not found for this tenant`,
      );
    }

    return this.mapCompany(company);
  }

  async update(
    id: bigint,
    updateCompanyDto: UpdateCompanyDto,
    tenantId: bigint,
    userId?: bigint,
  ) {
    // Ensure company belongs to the tenant
    await this.findOne(id, tenantId);

    const updatedCompany = await this.prisma.company.update({
      where: { id },
      data: {
        name: updateCompanyDto.name,
        legalName: updateCompanyDto.legalName,
        industryType: updateCompanyDto.industryType,
        currencyCode:
          updateCompanyDto.currencyCode ?? updateCompanyDto.currency,
        fiscalYearStartMonth:
          updateCompanyDto.fiscalYearStartMonth ??
          updateCompanyDto.fiscalYearStart,
        taxNumber: updateCompanyDto.taxNumber,
      },
    });

    // Write audit log for company update
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? null,
        entityType: 'Company',
        entityId: id,
        action: 'update',
        newValues: JSON.stringify(updatedCompany),
      },
    });

    return this.mapCompany(updatedCompany);
  }

  async remove(id: bigint, tenantId: bigint, userId?: bigint) {
    // Ensure company belongs to the tenant
    await this.findOne(id, tenantId);

    const deletedCompany = await this.prisma.company.delete({
      where: { id },
    });

    // Write audit log for company deletion
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? null,
        entityType: 'Company',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(deletedCompany),
      },
    });

    return this.mapCompany(deletedCompany);
  }
}
