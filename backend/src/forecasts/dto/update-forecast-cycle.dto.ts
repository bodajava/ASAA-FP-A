import { PartialType } from '@nestjs/swagger';
import { CreateForecastCycleDto } from './create-forecast-cycle.dto';

export class UpdateForecastCycleDto extends PartialType(
  CreateForecastCycleDto,
) {}
