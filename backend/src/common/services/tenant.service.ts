import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureCompanyBelongsToTenant(
    companyId: bigint,
    tenantId: bigint,
  ): Promise<void> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: { id: true },
    });
    if (!company) {
      throw new NotFoundException('Company not found under this tenant');
    }
  }

  async getTenantIdForCompany(companyId: bigint): Promise<bigint | null> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { tenantId: true },
    });
    return company?.tenantId ?? null;
  }
}
