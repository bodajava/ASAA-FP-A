import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import * as bcrypt from 'bcrypt';

function mapUserToResponse(user: {
  id: bigint;
  tenantId: bigint;
  roleId: bigint | null;
  name: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  role?: { name: string } | null;
}): UserResponseDto {
  return {
    id: user.id.toString(),
    tenantId: user.tenantId.toString(),
    roleId: user.roleId ? user.roleId.toString() : null,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roleName: user.role?.name ?? null,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createUserDto: CreateUserDto,
    tenantId: bigint,
    userId: bigint,
  ): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: createUserDto.email } },
    });
    if (existing) {
      throw new ConflictException(
        'A user with this email already exists under this tenant',
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(createUserDto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        roleId: createUserDto.roleId ?? null,
        name: createUserDto.name,
        email: createUserDto.email,
        phone: createUserDto.phone ?? null,
        passwordHash,
        status: createUserDto.status ?? UserStatus.active,
      },
      include: { role: { select: { name: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'User',
        entityId: user.id,
        action: 'create',
        newValues: JSON.stringify({
          name: user.name,
          email: user.email,
          status: user.status,
          roleId: user.roleId?.toString() ?? null,
        }),
      },
    });

    return mapUserToResponse(user);
  }

  async findAll(
    tenantId: bigint,
    paginationDto: PaginationDto & { status?: UserStatus; roleId?: bigint },
  ): Promise<{ total: number; data: UserResponseDto[] }> {
    const where: Prisma.UserWhereInput = { tenantId };

    const orConditions: Prisma.UserWhereInput[] = [];
    if (paginationDto.search) {
      orConditions.push(
        { name: { contains: paginationDto.search } },
        { email: { contains: paginationDto.search } },
      );
    }
    if (orConditions.length > 0) {
      where.OR = orConditions;
    }

    if (paginationDto.status) {
      where.status = paginationDto.status;
    }
    if (paginationDto.roleId) {
      where.roleId = paginationDto.roleId;
    }

    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { role: { select: { name: true } } },
      }),
    ]);

    return {
      total,
      data: users.map(mapUserToResponse),
    };
  }

  async findOne(id: bigint, tenantId: bigint): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: { role: { select: { name: true } } },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return mapUserToResponse(user);
  }

  async update(
    id: bigint,
    updateUserDto: UpdateUserDto,
    tenantId: bigint,
    userId: bigint,
  ): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const duplicate = await this.prisma.user.findUnique({
        where: {
          tenantId_email: { tenantId, email: updateUserDto.email },
        },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          'A user with this email already exists under this tenant',
        );
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (updateUserDto.name !== undefined) data.name = updateUserDto.name;
    if (updateUserDto.email !== undefined) data.email = updateUserDto.email;
    if (updateUserDto.phone !== undefined) data.phone = updateUserDto.phone;
    if (updateUserDto.roleId !== undefined) {
      data.role = { connect: { id: updateUserDto.roleId } };
    }
    if (updateUserDto.status !== undefined) data.status = updateUserDto.status;
    if (updateUserDto.password !== undefined) {
      const salt = await bcrypt.genSalt(10);
      data.passwordHash = await bcrypt.hash(updateUserDto.password, salt);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      include: { role: { select: { name: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'User',
        entityId: id,
        action: 'update',
        oldValues: JSON.stringify({
          name: existingUser.name,
          email: existingUser.email,
          status: existingUser.status,
          roleId: existingUser.roleId?.toString() ?? null,
        }),
        newValues: JSON.stringify({
          name: updatedUser.name,
          email: updatedUser.email,
          status: updatedUser.status,
          roleId: updatedUser.roleId?.toString() ?? null,
        }),
      },
    });

    return mapUserToResponse(updatedUser);
  }

  async remove(
    id: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: { role: { select: { name: true } } },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const deletedUser = await this.prisma.user.delete({
      where: { id },
      include: { role: { select: { name: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'User',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify({
          name: existingUser.name,
          email: existingUser.email,
          status: existingUser.status,
        }),
      },
    });

    return mapUserToResponse(deletedUser);
  }

  async updateStatus(
    id: bigint,
    status: UserStatus,
    tenantId: bigint,
    userId: bigint,
  ): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status },
      include: { role: { select: { name: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'User',
        entityId: id,
        action: 'status_update',
        oldValues: JSON.stringify({ status: existingUser.status }),
        newValues: JSON.stringify({ status: updatedUser.status }),
      },
    });

    return mapUserToResponse(updatedUser);
  }
}
