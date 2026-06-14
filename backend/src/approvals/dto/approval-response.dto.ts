import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApprovalResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() entityType!: string;
  @ApiProperty() entityId!: string;
  @ApiPropertyOptional() stepOrder!: number | null;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() requestedBy!: string | null;
  @ApiPropertyOptional() approvedBy!: string | null;
  @ApiPropertyOptional() approvedAt!: string | null;
  @ApiPropertyOptional() comments!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional() updatedAt!: Date | null;
}
