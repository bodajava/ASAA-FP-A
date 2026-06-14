import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyId } from '../common/decorators/company.decorator';

@UseGuards(JwtAuthGuard)
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  @Post('sync-usd')
  syncUsdRate(@Request() req: any, @CompanyId() companyId: bigint) {
    const userId = BigInt(req.user.id);
    return this.service.syncUsdRate(companyId, userId);
  }

  @Post()
  create(
    @Request() req: any,
    @CompanyId() companyId: bigint,
    @Body() dto: CreateExchangeRateDto,
  ) {
    const userId = BigInt(req.user.id);
    return this.service.create(companyId, userId, dto);
  }

  @Get()
  findAll(
    @CompanyId() companyId: bigint,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(
      companyId,
      from,
      to,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('latest')
  getLatestRates(@CompanyId() companyId: bigint) {
    return this.service.getLatestRates(companyId);
  }

  @Get('convert')
  async convert(
    @CompanyId() companyId: bigint,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('amount') amount: string,
    @Query('date') date?: string,
  ) {
    const rate = await this.service.getRate(
      companyId,
      from,
      to,
      date ? new Date(date) : undefined,
    );
    const converted = parseFloat(amount) * rate;
    return {
      from,
      to,
      rate,
      amount: parseFloat(amount),
      converted: Math.round(converted * 100) / 100,
    };
  }

  @Delete(':id')
  remove(
    @Request() req: any,
    @CompanyId() companyId: bigint,
    @Param('id') id: string,
  ) {
    const tenantId = BigInt(req.user.tenantId);
    const userId = BigInt(req.user.id);
    return this.service.remove(companyId, BigInt(id), tenantId, userId);
  }
}
