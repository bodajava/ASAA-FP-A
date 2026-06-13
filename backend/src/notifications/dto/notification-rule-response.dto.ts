import { ApiProperty } from '@nestjs/swagger';
import { TriggerType } from '@prisma/client';

export class NotificationRuleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  ruleName!: string;

  @ApiProperty({ enum: TriggerType })
  triggerType!: TriggerType;

  @ApiProperty({ required: false, nullable: true })
  thresholdValue!: number | null;

  @ApiProperty({ required: false, nullable: true })
  accountId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  siteId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  notifyRoles!: string[] | null;

  @ApiProperty({ required: false, nullable: true })
  notifyUsers!: string[] | null;

  @ApiProperty({ required: false, nullable: true })
  channel!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ required: false, nullable: true })
  createdBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  createdAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  updatedAt!: Date | null;
}
