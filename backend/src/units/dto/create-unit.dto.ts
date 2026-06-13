import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateUnitDto {
  @ApiProperty({
    description: 'The name of the unit of measurement',
    example: 'Kilogram',
    maxLength: 80,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(80, { message: 'Name cannot exceed 80 characters' })
  name!: string;

  @ApiProperty({
    description: 'The symbol of the unit of measurement',
    example: 'kg',
    maxLength: 20,
  })
  @IsString({ message: 'Symbol must be a string' })
  @IsNotEmpty({ message: 'Symbol is required' })
  @MaxLength(20, { message: 'Symbol cannot exceed 20 characters' })
  symbol!: string;
}
