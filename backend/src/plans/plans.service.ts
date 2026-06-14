import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
    });
    return plans.map((plan) => ({
      ...plan,
      features: this.parseFeatures(plan.features),
    }));
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: BigInt(id) },
    });
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }
    return {
      ...plan,
      features: this.parseFeatures(plan.features),
    };
  }

  private parseFeatures(features: string | null): string[] {
    if (!features) return [];
    try {
      const parsed = JSON.parse(features);
      return Array.isArray(parsed) ? parsed : Object.values(parsed).map(String);
    } catch {
      return [];
    }
  }
}
