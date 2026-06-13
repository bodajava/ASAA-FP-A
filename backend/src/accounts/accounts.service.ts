import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class AccountsService {
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
    createAccountDto: CreateAccountDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    // Validate parent account if provided
    if (createAccountDto.parentId) {
      if (!/^\d+$/.test(createAccountDto.parentId)) {
        throw new BadRequestException('parentId must be a valid numeric ID');
      }
      const parentId = BigInt(createAccountDto.parentId);
      const parentAccount = await this.prisma.account.findFirst({
        where: { id: parentId, companyId },
      });
      if (!parentAccount) {
        throw new BadRequestException(
          'Parent account must belong to the same company',
        );
      }
    }

    // Check unique account code in this company
    const codeExists = await this.prisma.account.findFirst({
      where: { companyId, code: createAccountDto.code },
    });
    if (codeExists) {
      throw new BadRequestException(
        `Account code "${createAccountDto.code}" already exists in this company`,
      );
    }

    const account = await this.prisma.account.create({
      data: {
        companyId,
        parentId: createAccountDto.parentId
          ? BigInt(createAccountDto.parentId)
          : null,
        code: createAccountDto.code,
        name: createAccountDto.name,
        type: createAccountDto.type,
        isActive: createAccountDto.isActive ?? true,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Account',
        entityId: account.id,
        action: 'create',
        newValues: JSON.stringify(account),
      },
    });

    return account;
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

    const where: Prisma.AccountWhereInput = {
      companyId,
    };

    if (paginationDto.search) {
      where.OR = [
        { name: { contains: paginationDto.search } },
        { code: { contains: paginationDto.search } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.account.count({ where }),
      this.prisma.account.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
        include: {
          parent: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
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

    const account = await this.prisma.account.findFirst({
      where: { id, companyId },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException(
        `Account with ID ${id} not found under this company`,
      );
    }

    return account;
  }

  async update(
    id: bigint,
    updateAccountDto: UpdateAccountDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    const oldAccount = await this.findOne(id, companyId, tenantId);

    // Validate parent account if provided
    if (updateAccountDto.parentId) {
      if (!/^\d+$/.test(updateAccountDto.parentId)) {
        throw new BadRequestException('parentId must be a valid numeric ID');
      }
      const parentId = BigInt(updateAccountDto.parentId);
      if (parentId === id) {
        throw new BadRequestException('An account cannot be its own parent');
      }
      const parentAccount = await this.prisma.account.findFirst({
        where: { id: parentId, companyId },
      });
      if (!parentAccount) {
        throw new BadRequestException(
          'Parent account must belong to the same company',
        );
      }
    }

    // Check unique account code if updated
    if (updateAccountDto.code && updateAccountDto.code !== oldAccount.code) {
      const codeExists = await this.prisma.account.findFirst({
        where: { companyId, code: updateAccountDto.code },
      });
      if (codeExists) {
        throw new BadRequestException(
          `Account code "${updateAccountDto.code}" already exists in this company`,
        );
      }
    }

    const updatedAccount = await this.prisma.account.update({
      where: { id },
      data: {
        parentId: updateAccountDto.parentId
          ? BigInt(updateAccountDto.parentId)
          : undefined,
        code: updateAccountDto.code,
        name: updateAccountDto.name,
        type: updateAccountDto.type,
        isActive: updateAccountDto.isActive,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Account',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify(oldAccount),
        newValues: JSON.stringify(updatedAccount),
      },
    });

    return updatedAccount;
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    const oldAccount = await this.findOne(id, companyId, tenantId);

    // Prevent deletion if the account has sub-accounts
    if (oldAccount.children.length > 0) {
      throw new BadRequestException('Cannot delete account with sub-accounts');
    }

    const deletedAccount = await this.prisma.account.delete({
      where: { id },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Account',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(deletedAccount),
      },
    });

    return deletedAccount;
  }
}
