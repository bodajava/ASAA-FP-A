import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAiSettingsDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  provider!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  apiKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  isEnabled?: boolean;
}
