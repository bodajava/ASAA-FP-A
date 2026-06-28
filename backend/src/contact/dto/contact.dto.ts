import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ContactDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  fullName!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  inquiryType!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  subject!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  priority?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sourcePage?: string;
}
