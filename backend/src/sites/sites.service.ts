import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class SitesService {
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
    createSiteDto: CreateSiteDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const site = await this.prisma.site.create({
      data: {
        companyId,
        name: createSiteDto.name,
        type: createSiteDto.type,
        managerUserId: createSiteDto.managerUserId
          ? BigInt(createSiteDto.managerUserId)
          : null,
        region: createSiteDto.region ?? null,
        address: createSiteDto.address ?? null,
        status: createSiteDto.status ?? 'active',
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Site',
        entityId: site.id,
        action: 'create',
        newValues: JSON.stringify(site),
      },
    });

    return site;
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

    const where: Prisma.SiteWhereInput = {
      companyId,
    };

    if (paginationDto.search) {
      where.name = {
        contains: paginationDto.search,
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.site.count({ where }),
      this.prisma.site.findMany({
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

    const site = await this.prisma.site.findFirst({
      where: { id, companyId },
    });

    if (!site) {
      throw new NotFoundException(
        `Site with ID ${id} not found under this company`,
      );
    }

    return site;
  }

  async update(
    id: bigint,
    updateSiteDto: UpdateSiteDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    const oldSite = await this.findOne(id, companyId, tenantId);

    const updatedSite = await this.prisma.site.update({
      where: { id },
      data: {
        name: updateSiteDto.name,
        type: updateSiteDto.type,
        managerUserId: updateSiteDto.managerUserId
          ? BigInt(updateSiteDto.managerUserId)
          : undefined,
        region: updateSiteDto.region,
        address: updateSiteDto.address,
        status: updateSiteDto.status,
      },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Site',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify(oldSite),
        newValues: JSON.stringify(updatedSite),
      },
    });

    return updatedSite;
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ) {
    await this.findOne(id, companyId, tenantId);

    const deletedSite = await this.prisma.site.delete({
      where: { id },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Site',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(deletedSite),
      },
    });

    return deletedSite;
  }
}
