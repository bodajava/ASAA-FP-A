import { ApiProperty } from '@nestjs/swagger';
export class ReportMetaResponseDto {
  @ApiProperty() value!: string;
  @ApiProperty() label!: string;
  @ApiProperty() description!: string;
  @ApiProperty() category!: string;
  @ApiProperty() paginated!: boolean;
}
