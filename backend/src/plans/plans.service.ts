import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PlanResponseDto } from './dto/plan-response.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PlanResponseDto[]> {
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    });
    return plans.map((plan) => this.toDto(plan));
  }

  async findOne(id: string): Promise<PlanResponseDto> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: BigInt(id) },
    });
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }
    return this.toDto(plan);
  }

  private toDto(plan: any): PlanResponseDto {
    return {
      id: plan.id.toString(),
      name: plan.name,
      code: plan.code,
      description: plan.description ?? '',
      monthlyPrice: Number(plan.monthlyPrice),
      yearlyPrice: Number(plan.yearlyPrice),
      maxCompanies: plan.maxCompanies,
      maxUsers: plan.maxUsers,
      maxBranches: plan.maxBranches,
      dashboardLevel: plan.dashboardLevel,
      features: this.parseJsonArray(plan.features),
      restrictions: this.parseJsonArray(plan.restrictions),
      suitableFor: this.parseJsonArray(plan.suitableFor),
      isActive: plan.isActive,
    };
  }

  private parseJsonArray(val: string | null): string[] {
    if (!val) return [];
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
