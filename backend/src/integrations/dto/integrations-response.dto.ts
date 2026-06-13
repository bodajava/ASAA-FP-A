import { ApiProperty } from '@nestjs/swagger';
import {
  ConnectionType,
  SyncSchedule,
  SyncStatus,
  ImportSourceSystem,
  ImportType,
} from '@prisma/client';

export class ConnectionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ConnectionType })
  connectionType!: ConnectionType;

  @ApiProperty({ required: false, nullable: true })
  host!: string | null;

  @ApiProperty({ required: false, nullable: true })
  port!: number | null;

  @ApiProperty({ required: false, nullable: true })
  databaseName!: string | null;

  @ApiProperty({ required: false, nullable: true })
  username!: string | null;

  @ApiProperty({ required: false, nullable: true, example: null })
  passwordEnc!: string | null;

  @ApiProperty({ required: false, nullable: true })
  apiBaseUrl!: string | null;

  @ApiProperty({ required: false, nullable: true, example: null })
  apiKeyEnc!: string | null;

  @ApiProperty({ required: false, nullable: true })
  extraConfig!: Record<string, string | number | boolean | null> | null;

  @ApiProperty({ enum: SyncSchedule, required: false, nullable: true })
  syncSchedule!: SyncSchedule | null;

  @ApiProperty({ required: false, nullable: true })
  lastSyncAt!: Date | null;

  @ApiProperty({ enum: SyncStatus, required: false, nullable: true })
  lastSyncStatus!: SyncStatus | null;

  @ApiProperty({ required: false, nullable: true })
  lastSyncLog!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ required: false, nullable: true })
  createdBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  createdAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  updatedAt!: Date | null;
}

export class MappingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty({ required: false, nullable: true })
  connectionId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ImportSourceSystem })
  sourceSystem!: ImportSourceSystem;

  @ApiProperty({ enum: ImportType })
  importType!: ImportType;

  @ApiProperty({
    example: {
      accountCode: 'GL Account',
      amount: 'Amount',
      transactionDate: 'Post Date',
    },
  })
  mappingConfig!: Record<string, string | null>;

  @ApiProperty({ required: false, nullable: true })
  skipErrors!: boolean | null;

  @ApiProperty({ required: false, nullable: true })
  isDefault!: boolean | null;

  @ApiProperty({ required: false, nullable: true })
  isActive!: boolean | null;

  @ApiProperty({ required: false, nullable: true })
  lastUsedAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  createdBy!: string | null;

  @ApiProperty({ required: false, nullable: true })
  createdAt!: Date | null;

  @ApiProperty({ required: false, nullable: true })
  updatedAt!: Date | null;
}
