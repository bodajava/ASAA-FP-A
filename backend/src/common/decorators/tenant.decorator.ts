import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { TenantContext } from '../interfaces/tenant-context.interface';

interface RequestWithTenant extends Request {
  tenantContext?: TenantContext;
}

export const Tenant = createParamDecorator(
  (data: undefined, ctx: ExecutionContext): TenantContext | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant>();
    return request.tenantContext;
  },
);
