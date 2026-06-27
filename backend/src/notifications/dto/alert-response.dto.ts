import { ApiProperty } from '@nestjs/swagger';

export class AlertResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty({ required: false, nullable: true })
  userId!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  description!: string | null;

  @ApiProperty()
  priority!: string;

  @ApiProperty()
  severity!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty({ required: false, nullable: true })
  entityType!: string | null;

  @ApiProperty({ required: false, nullable: true })
  entityId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  actionUrl!: string | null;

  @ApiProperty()
  isRead!: boolean;

  @ApiProperty()
  isArchived!: boolean;

  @ApiProperty({ required: false, nullable: true })
  expiresAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  createdAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  updatedAt!: Date | null;
}
