import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error(
    'Missing required environment variable: JWT_SECRET. ' +
    'Set a strong random string (minimum 32 characters) before starting the server.',
  );
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => {
          if (req?.cookies?.access_token) {
            return req.cookies.access_token;
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret!,
    });
  }

  async validate(payload: JwtPayload) {
    const userId = BigInt(payload.sub);
    const tenantId = BigInt(payload.tenantId);

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: tenantId,
        status: 'active',
      },
      select: {
        id: true,
        tenantId: true,
        roleId: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'User not found or inactive in this tenant',
      );
    }

    return user;
  }
}
