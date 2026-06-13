import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantContext?: {
        tenantId: bigint;
        companyId?: bigint;
      };
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantIdHeader = req.headers['x-tenant-id'];
    const companyIdHeader = req.headers['x-company-id'];

    if (!tenantIdHeader) {
      return next();
    }

    try {
      const tenantId = BigInt(tenantIdHeader as string);
      const companyId = companyIdHeader
        ? BigInt(companyIdHeader as string)
        : undefined;

      req.tenantContext = {
        tenantId,
        companyId,
      };
    } catch {
      throw new BadRequestException(
        'Invalid tenant or company ID header format. Must be numeric.',
      );
    }

    next();
  }
}
