import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ApprovalAction {
  approve = 'approve',
  reject = 'reject',
  cancel = 'cancel',
}

export class UpdateApprovalStatusDto {
  @ApiProperty({ enum: ApprovalAction, description: 'Action to perform' })
  @IsEnum(ApprovalAction)
  action!: ApprovalAction;

  @ApiPropertyOptional({ description: 'Comments/reason for the action' })
  @IsOptional()
  @IsString()
  comments?: string;
}
