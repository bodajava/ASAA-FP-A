import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { CycleStatus } from '@prisma/client';

export class UpdateBudgetStatusDto {
  @ApiProperty({
    description: 'The new status of the budget cycle',
    enum: CycleStatus,
    example: 'submitted',
  })
  @IsEnum(CycleStatus, { message: 'Invalid cycle status' })
  @IsNotEmpty({ message: 'status is required' })
  status!: CycleStatus;
}
