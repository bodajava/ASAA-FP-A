import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';

export const CompanyId = createParamDecorator(
  (data: undefined, ctx: ExecutionContext): bigint => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const companyId = request.tenantContext?.companyId;
    if (!companyId) {
      throw new BadRequestException('x-company-id header is required');
    }
    return companyId;
  },
);
