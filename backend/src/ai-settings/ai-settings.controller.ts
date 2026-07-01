import { Controller, Get, Post, Body, Headers } from '@nestjs/common';
import { AiSettingsService } from './ai-settings.service';
import { UpdateAiSettingsDto } from './dto/ai-settings.dto';

@Controller('ai-settings')
export class AiSettingsController {
  constructor(private readonly aiSettingsService: AiSettingsService) {}

  @Get()
  async getSettings(@Headers('x-company-id') companyIdHeader: string) {
    const companyId = BigInt(companyIdHeader || '0');
    return this.aiSettingsService.getSettings(companyId);
  }

  @Post()
  async updateSettings(
    @Headers('x-company-id') companyIdHeader: string,
    @Body() dto: UpdateAiSettingsDto,
  ) {
    const companyId = BigInt(companyIdHeader || '0');
    return this.aiSettingsService.updateSettings(companyId, dto);
  }
}
