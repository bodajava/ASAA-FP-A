import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  override handleRequest<TUser>(
    err: Error | null | undefined,
    user: TUser,
  ): TUser {
    if (err || !user) {
      throw (
        (err as Error | undefined) ||
        new UnauthorizedException(
          'Authentication credentials missing or invalid',
        )
      );
    }
    return user;
  }
}
