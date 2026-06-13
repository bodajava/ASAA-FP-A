import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'The name of the role',
    example: 'Financial Manager',
    maxLength: 100,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name!: string;

  @ApiPropertyOptional({
    description: 'The permissions configuration object',
    example: { viewBudget: true, editBudget: false, superAdmin: false },
  })
  @IsObject({ message: 'Permissions must be an object' })
  @IsOptional()
  permissions?: Record<string, boolean | string | number | null | object>;
}
