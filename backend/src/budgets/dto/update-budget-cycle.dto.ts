import { PartialType } from '@nestjs/swagger';
import { CreateBudgetCycleDto } from './create-budget-cycle.dto';

export class UpdateBudgetCycleDto extends PartialType(CreateBudgetCycleDto) {}
