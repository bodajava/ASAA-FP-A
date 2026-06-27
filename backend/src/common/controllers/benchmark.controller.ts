import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { CompanyId } from '../decorators/company.decorator';
import { BenchmarkService } from '../services/benchmark.service';

@ApiTags('Benchmark')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('benchmark')
export class BenchmarkController {
  constructor(private readonly benchmarkService: BenchmarkService) {}

  @Post('generate/:module')
  @ApiOperation({ summary: 'Generate test data (admin only)' })
  async generateData(
    @CompanyId() companyId: bigint,
    @Param('module') module: string,
    @Body() body: { rowCount: number },
  ) {
    return this.benchmarkService.generateTestData(companyId, {
      rowCount: body.rowCount,
      module,
    });
  }

  @Post('import')
  @ApiOperation({ summary: 'Benchmark import speed (admin only)' })
  async benchmarkImport(
    @CompanyId() companyId: bigint,
    @Body() body: { rowCount: number },
  ) {
    return this.benchmarkService.benchmarkImport(companyId, {
      rowCount: body.rowCount,
      module: 'actuals',
    });
  }

  @Get('queries')
  @ApiOperation({ summary: 'Benchmark query performance (admin only)' })
  async benchmarkQueries(@CompanyId() companyId: bigint) {
    return this.benchmarkService.benchmarkQuery(companyId);
  }

  @Post('run-all')
  @ApiOperation({ summary: 'Run full benchmark suite (admin only)' })
  async runFullBenchmark(@CompanyId() companyId: bigint) {
    return this.benchmarkService.runFullBenchmark(companyId);
  }
}
