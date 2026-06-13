import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id!: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId!: string;

  @ApiPropertyOptional({ description: 'Role ID', nullable: true })
  roleId!: string | null;

  @ApiProperty({ description: 'Full name' })
  name!: string;

  @ApiProperty({ description: 'Email address' })
  email!: string;

  @ApiPropertyOptional({ description: 'Phone number', nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ description: 'Account status', enum: UserStatus })
  status!: UserStatus;

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    nullable: true,
  })
  lastLoginAt!: Date | null;

  @ApiPropertyOptional({ description: 'Created at timestamp' })
  createdAt!: Date | null;

  @ApiPropertyOptional({ description: 'Updated at timestamp' })
  updatedAt!: Date | null;

  @ApiPropertyOptional({ description: 'Role name', nullable: true })
  roleName!: string | null;
}
