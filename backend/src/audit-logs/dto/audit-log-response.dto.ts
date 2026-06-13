import { ApiProperty } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiProperty({ required: false, nullable: true })
  userId!: string | null;

  @ApiProperty()
  entityType!: string;

  @ApiProperty({ required: false, nullable: true })
  entityId!: string | null;

  @ApiProperty()
  action!: string;

  @ApiProperty({ required: false, nullable: true })
  oldValues!: Record<string, string | number | boolean | null | object> | null;

  @ApiProperty({ required: false, nullable: true })
  newValues!: Record<string, string | number | boolean | null | object> | null;

  @ApiProperty({ required: false, nullable: true })
  ipAddress!: string | null;

  @ApiProperty({ required: false, nullable: true })
  userAgent!: string | null;

  @ApiProperty({ required: false, nullable: true })
  createdAt!: Date | null;
}
