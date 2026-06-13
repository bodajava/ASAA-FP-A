import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
  Matches,
} from 'class-validator';
import { AccountType } from '@prisma/client';

export class CreateAccountDto {
  @ApiProperty({
    description: 'The unique code of the account',
    example: '101001',
    maxLength: 50,
  })
  @IsString({ message: 'Code must be a string' })
  @IsNotEmpty({ message: 'Code is required' })
  @MaxLength(50, { message: 'Code cannot exceed 50 characters' })
  code!: string;

  @ApiProperty({
    description: 'The name of the account',
    example: 'Cash on Hand',
    maxLength: 160,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(160, { message: 'Name cannot exceed 160 characters' })
  name!: string;

  @ApiProperty({
    description: 'The type of the account',
    enum: AccountType,
    example: 'asset',
  })
  @IsEnum(AccountType, { message: 'Invalid account type' })
  type!: AccountType;

  @ApiPropertyOptional({
    description: 'The parent account ID for hierarchical chart of accounts',
    example: '12',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'parentId must be a numeric string' })
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Whether the account is active',
    default: true,
  })
  @IsBoolean({ message: 'isActive must be a boolean' })
  @IsOptional()
  isActive?: boolean;
}
