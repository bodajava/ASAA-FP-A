import { PartialType } from '@nestjs/swagger';
import { CreateActualImportDto } from './create-actual-import.dto';

export class UpdateActualImportDto extends PartialType(CreateActualImportDto) {}
