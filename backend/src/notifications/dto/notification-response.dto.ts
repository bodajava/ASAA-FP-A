import { ApiProperty } from '@nestjs/swagger';
import { NotificationChannel, NotificationStatus } from '@prisma/client';

export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false, nullable: true })
  ruleId!: string | null;

  @ApiProperty()
  companyId!: string;

  @ApiProperty({ required: false, nullable: true })
  userId!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  body!: string | null;

  @ApiProperty({ enum: NotificationChannel, required: false, nullable: true })
  channel!: NotificationChannel | null;

  @ApiProperty({ required: false, nullable: true })
  entityType!: string | null;

  @ApiProperty({ required: false, nullable: true })
  entityId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  triggerData!: Record<string, string | number | boolean | null> | null;

  @ApiProperty({ enum: NotificationStatus, required: false, nullable: true })
  status!: NotificationStatus | null;

  @ApiProperty({ required: false, nullable: true })
  sentAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  readAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  errorMessage!: string | null;

  @ApiProperty({ required: false, nullable: true })
  createdAt!: Date | null;
}
