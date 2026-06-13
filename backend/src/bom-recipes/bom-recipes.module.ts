import { Module } from '@nestjs/common';
import { BomRecipesService } from './bom-recipes.service';
import { BomRecipesController } from './bom-recipes.controller';
@Module({
  controllers: [BomRecipesController],
  providers: [BomRecipesService],
  exports: [BomRecipesService],
})
export class BomRecipesModule {}
