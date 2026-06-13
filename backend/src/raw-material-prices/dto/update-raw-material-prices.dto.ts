import { PartialType } from '@nestjs/swagger';
import { CreateRawMaterialPriceDto } from './create-raw-material-price.dto';

export class UpdateRawMaterialPricesDto extends PartialType(
  CreateRawMaterialPriceDto,
) {}
