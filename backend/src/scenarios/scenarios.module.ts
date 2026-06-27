import { Module } from '@nestjs/common';
import { ScenariosService } from './scenarios.service';
import { ScenariosController } from './scenarios.controller';
import { AiScenarioService } from './ai-scenario.service';
import { AiScenarioController } from './ai-scenario.controller';
import { CostingModule } from '../costing/costing.module';
@Module({
  imports: [CostingModule],
  controllers: [ScenariosController, AiScenarioController],
  providers: [ScenariosService, AiScenarioService],
  exports: [ScenariosService, AiScenarioService],
})
export class ScenariosModule {}
