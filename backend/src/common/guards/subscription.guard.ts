import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma.service';
import { REQUIRED_PLAN_KEY } from '../decorators/required-plan.decorator';
import { AuthUser } from '../../auth/auth.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<
      'Starter' | 'Business' | 'Enterprise'
    >(REQUIRED_PLAN_KEY, [context.getHandler(), context.getClass()]);

    // If no specific plan tier is required, allow access
    if (!requiredPlan) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser;

    if (!user) {
      return false;
    }

    // Retrieve tenant and plan details
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      include: { plan: true },
    });

    if (!tenant || !tenant.plan) {
      if (requiredPlan === 'Starter') {
        return true;
      }
      throw new ForbiddenException(
        `This feature requires a ${requiredPlan} plan, but no plan is active.`,
      );
    }

    const activePlanName = tenant.plan.name.toLowerCase();

    // Map plans hierarchy: Enterprise > Business > Starter
    const tiers: Record<string, number> = {
      starter: 1,
      business: 2,
      enterprise: 3,
    };

    const activeWeight = tiers[activePlanName] ?? 1;
    const requiredWeight = tiers[requiredPlan.toLowerCase()] ?? 1;

    if (activeWeight >= requiredWeight) {
      return true;
    }

    throw new ForbiddenException(
      `Your current plan (${tenant.plan.name}) does not support this feature. Please upgrade to ${requiredPlan} to unlock it.`,
    );
  }
}
