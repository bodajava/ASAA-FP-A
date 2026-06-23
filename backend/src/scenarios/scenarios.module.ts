import { Module } from '@nestjs/common';
import { ScenariosService } from './scenarios.service';
import { ScenariosController } from './scenarios.controller';
import { AiScenarioService } from './ai-scenario.service';
import { AiScenarioController } from './ai-scenario.controller';
@Module({
  controllers: [ScenariosController, AiScenarioController],
  providers: [ScenariosService, AiScenarioService],
  exports: [ScenariosService, AiScenarioService],
})
export class ScenariosModule {}
