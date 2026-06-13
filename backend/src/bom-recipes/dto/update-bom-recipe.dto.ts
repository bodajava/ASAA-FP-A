import { PartialType } from '@nestjs/swagger';
import { CreateBomRecipeDto } from './create-bom-recipe.dto';

export class UpdateBomRecipeDto extends PartialType(CreateBomRecipeDto) {}
