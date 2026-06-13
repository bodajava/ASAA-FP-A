import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createRoleDto: CreateRoleDto,
    tenantId: bigint,
    userId?: bigint,
  ) {
    const role = await this.prisma.role.create({
      data: {
        tenantId,
        name: createRoleDto.name,
        permissions: createRoleDto.permissions
          ? JSON.stringify(createRoleDto.permissions)
          : null,
      },
    });

    // Write audit log for role creation
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? null,
        entityType: 'Role',
        entityId: role.id,
        action: 'create',
        newValues: JSON.stringify(role),
      },
    });

    return role;
  }

  async findAll(tenantId: bigint, isSuperAdmin: boolean) {
    if (isSuperAdmin) {
      return this.prisma.role.findMany();
    }
    return this.prisma.role.findMany({
      where: {
        OR: [{ tenantId }, { tenantId: null }],
      },
    });
  }

  async findOne(id: bigint, tenantId: bigint, isSuperAdmin: boolean) {
    const role = await this.prisma.role.findFirst({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (!isSuperAdmin && role.tenantId !== tenantId) {
      // Even if it's a global role, we allow viewing it, but check if tenant matches
      if (role.tenantId !== null) {
        throw new ForbiddenException('Access denied to this role');
      }
    }

    return role;
  }

  async update(
    id: bigint,
    updateRoleDto: UpdateRoleDto,
    tenantId: bigint,
    userId: bigint,
    isSuperAdmin: boolean,
  ) {
    const oldRole = await this.findOne(id, tenantId, isSuperAdmin);

    // Regular users cannot modify global roles (tenantId = null)
    if (!isSuperAdmin && oldRole.tenantId === null) {
      throw new ForbiddenException('Cannot modify global roles');
    }

    // Regular users cannot modify roles of other tenants
    if (!isSuperAdmin && oldRole.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied to modify this role');
    }

    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: {
        name: updateRoleDto.name,
        permissions: updateRoleDto.permissions
          ? JSON.stringify(updateRoleDto.permissions)
          : undefined,
      },
    });

    // Write audit log for role update
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Role',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify(oldRole),
        newValues: JSON.stringify(updatedRole),
      },
    });

    return updatedRole;
  }

  async remove(
    id: bigint,
    tenantId: bigint,
    userId: bigint,
    isSuperAdmin: boolean,
  ) {
    const oldRole = await this.findOne(id, tenantId, isSuperAdmin);

    // Regular users cannot modify/delete global roles (tenantId = null)
    if (!isSuperAdmin && oldRole.tenantId === null) {
      throw new ForbiddenException('Cannot delete global roles');
    }

    // Regular users cannot delete roles of other tenants
    if (!isSuperAdmin && oldRole.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied to delete this role');
    }

    const deletedRole = await this.prisma.role.delete({
      where: { id },
    });

    // Write audit log for role deletion
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Role',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(deletedRole),
      },
    });

    return deletedRole;
  }
}
