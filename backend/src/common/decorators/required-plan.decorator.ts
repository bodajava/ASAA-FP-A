import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PLAN_KEY = 'required_plan';
export const RequiredPlan = (plan: 'Starter' | 'Business' | 'Enterprise') =>
  SetMetadata(REQUIRED_PLAN_KEY, plan);
