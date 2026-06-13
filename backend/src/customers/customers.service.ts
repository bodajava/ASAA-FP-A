import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureCompanyBelongsToTenant(
    companyId: bigint,
    tenantId: bigint,
  ) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
    });
    if (!company) {
      throw new NotFoundException(`Company not found under this tenant`);
    }
  }

  async create(
    createCustomerDto: CreateCustomerDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    // Check unique customer code in this company
    const codeExists = await this.prisma.customer.findFirst({
      where: { companyId, code: createCustomerDto.code },
    });
    if (codeExists) {
      throw new BadRequestException(
        `Customer code "${createCustomerDto.code}" already exists in this company`,
      );
    }

    const customer = await this.prisma.customer.create({
      data: {
        companyId,
        code: createCustomerDto.code,
        name: createCustomerDto.name,
        customerType: createCustomerDto.customerType ?? 'retail',
        region: createCustomerDto.region ?? null,
        phone: createCustomerDto.phone ?? null,
        email: createCustomerDto.email ?? null,
        creditLimit: createCustomerDto.creditLimit ?? 0,
        paymentTerms: createCustomerDto.paymentTerms ?? 30,
        isActive: createCustomerDto.isActive ?? true,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Customer',
        entityId: customer.id,
        action: 'create',
        newValues: JSON.stringify(customer),
      },
    });

    return customer;
  }

  async findAll(
    companyId: bigint,
    tenantId: bigint,
    paginationDto: PaginationDto,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      companyId,
    };

    if (paginationDto.search) {
      where.OR = [
        { name: { contains: paginationDto.search } },
        { code: { contains: paginationDto.search } },
        { email: { contains: paginationDto.search } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async findOne(id: bigint, companyId: bigint, tenantId: bigint) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${id} not found under this company`,
      );
    }

    return customer;
  }

  async update(
    id: bigint,
    updateCustomerDto: UpdateCustomerDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    const oldCustomer = await this.findOne(id, companyId, tenantId);

    // Check unique customer code if updated
    if (updateCustomerDto.code && updateCustomerDto.code !== oldCustomer.code) {
      const codeExists = await this.prisma.customer.findFirst({
        where: { companyId, code: updateCustomerDto.code },
      });
      if (codeExists) {
        throw new BadRequestException(
          `Customer code "${updateCustomerDto.code}" already exists in this company`,
        );
      }
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: { id },
      data: {
        code: updateCustomerDto.code,
        name: updateCustomerDto.name,
        customerType: updateCustomerDto.customerType,
        region: updateCustomerDto.region,
        phone: updateCustomerDto.phone,
        email: updateCustomerDto.email,
        creditLimit: updateCustomerDto.creditLimit,
        paymentTerms: updateCustomerDto.paymentTerms,
        isActive: updateCustomerDto.isActive,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Customer',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify(oldCustomer),
        newValues: JSON.stringify(updatedCustomer),
      },
    });

    return updatedCustomer;
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.findOne(id, companyId, tenantId);

    const deletedCustomer = await this.prisma.customer.delete({
      where: { id },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Customer',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(deletedCustomer),
      },
    });

    return deletedCustomer;
  }
}
