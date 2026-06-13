import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthUser } from '../../auth/auth.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles or permissions are required, allow access
    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Check if user is Super Admin
    if (this.isSuperAdmin(user)) {
      return true;
    }

    // If roles are required, check roles
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((role) => user.role?.name === role);
      if (hasRole) {
        return true;
      }
    }

    // If permissions are required, check permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      const permissions = user.role?.permissions;
      if (
        permissions &&
        typeof permissions === 'object' &&
        !Array.isArray(permissions)
      ) {
        const permissionsObj = permissions as Record<string, Prisma.JsonValue>;
        const hasAllPermissions = requiredPermissions.every(
          (permission) => permissionsObj[permission] === true,
        );
        if (hasAllPermissions) {
          return true;
        }
      }
    }

    return false;
  }

  private isSuperAdmin(user: AuthUser): boolean {
    const role = user.role;
    if (!role) {
      return false;
    }
    if (role.name === 'Super Admin') {
      return true;
    }
    const permissions = role.permissions;
    if (
      permissions &&
      typeof permissions === 'object' &&
      !Array.isArray(permissions)
    ) {
      const permissionsObj = permissions as Record<string, Prisma.JsonValue>;
      if (permissionsObj.superAdmin === true) {
        return true;
      }
    }
    return false;
  }
}
