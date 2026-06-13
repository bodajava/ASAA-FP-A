import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import * as ms from 'ms';
import { Prisma } from '@prisma/client';

export interface AuthRole {
  id: bigint;
  name: string;
  permissions: Prisma.JsonValue | null;
}

export interface AuthUser {
  id: bigint;
  tenantId: bigint;
  roleId: bigint | null;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  role?: AuthRole | null;
}

interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
    tenantId: bigint,
  ): Promise<AuthUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        tenantId,
      },
      include: {
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
      throw new UnauthorizedException('Invalid credentials or tenant ID');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('User account is inactive');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials or tenant ID');
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      roleId: user.roleId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      role: user.role
        ? {
            id: user.role.id,
            name: user.role.name,
            permissions: user.role.permissions,
          }
        : null,
    };
  }

  async login(user: AuthUser, ipAddress?: string, userAgent?: string) {
    const payload: JwtPayload = {
      sub: user.id.toString(),
      email: user.email,
      tenantId: user.tenantId.toString(),
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET ?? 'super-secret-key-change-in-production',
      expiresIn: (process.env.JWT_ACCESS_EXPIRATION ?? '15m') as ms.StringValue,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret:
        process.env.JWT_REFRESH_SECRET ??
        'super-secret-refresh-key-change-in-production',
      expiresIn: (process.env.JWT_REFRESH_EXPIRATION ?? '7d') as ms.StringValue,
    });

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Write audit log for login event
    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        entityType: 'User',
        entityId: user.id,
        action: 'login',
        newValues: JSON.stringify({ loginTime: new Date().toISOString() }),
        ipAddress,
        userAgent,
      },
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret:
          process.env.JWT_REFRESH_SECRET ??
          'super-secret-refresh-key-change-in-production',
      });

      const userId = BigInt(payload.sub);
      const tenantId = BigInt(payload.tenantId);

      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          tenantId,
          status: 'active',
        },
        include: {
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
        throw new UnauthorizedException('User not found or inactive');
      }

      const authUser: AuthUser = {
        id: user.id,
        tenantId: user.tenantId,
        roleId: user.roleId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        role: user.role
          ? {
              id: user.role.id,
              name: user.role.name,
              permissions: user.role.permissions,
            }
          : null,
      };

      const newPayload: JwtPayload = {
        sub: authUser.id.toString(),
        email: authUser.email,
        tenantId: authUser.tenantId.toString(),
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        secret:
          process.env.JWT_SECRET ?? 'super-secret-key-change-in-production',
        expiresIn: (process.env.JWT_ACCESS_EXPIRATION ??
          '15m') as ms.StringValue,
      });

      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret:
          process.env.JWT_REFRESH_SECRET ??
          'super-secret-refresh-key-change-in-production',
        expiresIn: (process.env.JWT_REFRESH_EXPIRATION ??
          '7d') as ms.StringValue,
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(user: AuthUser, ipAddress?: string, userAgent?: string) {
    // Write audit log for logout event
    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        entityType: 'User',
        entityId: user.id,
        action: 'logout',
        newValues: JSON.stringify({ logoutTime: new Date().toISOString() }),
        ipAddress,
        userAgent,
      },
    });

    return { message: 'Logged out successfully' };
  }

  async hashPassword(password: string): Promise<string> {
    if (!password || password.length < 6) {
      throw new BadRequestException(
        'Password must be at least 6 characters long',
      );
    }
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }
}
