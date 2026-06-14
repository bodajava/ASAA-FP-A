import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
} from '@nestjs/swagger';
import { HeadcountPlansService } from './headcount-plans.service';
import { CreateHeadcountPlanDto } from './dto/create-headcount-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CompanyId } from '../common/decorators/company.decorator';

@ApiTags('Headcount Plans')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('headcount-plans')
export class HeadcountPlansController {
  constructor(private readonly service: HeadcountPlansService) {}

  @Post()
  @Roles('admin', 'fpna_manager', 'financial_analyst')
  @ApiOperation({ summary: 'Create a headcount plan' })
  create(@CompanyId() companyId: bigint, @Body() dto: CreateHeadcountPlanDto) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @Roles('admin', 'fpna_manager', 'financial_analyst', 'viewer')
  @ApiOperation({ summary: 'Get headcount plans by cycle' })
  findByCycle(
    @CompanyId() companyId: bigint,
    @Query('cycleId') cycleId: string,
  ) {
    if (!cycleId)
      throw new BadRequestException('cycleId query param is required');
    return this.service.findByCycle(companyId, BigInt(cycleId));
  }

  @Get('summary/:cycleId')
  @Roles('admin', 'fpna_manager', 'financial_analyst', 'viewer')
  @ApiOperation({ summary: 'Get headcount plan summary' })
  getSummary(
    @CompanyId() companyId: bigint,
    @Param('cycleId') cycleId: string,
  ) {
    if (!cycleId) throw new BadRequestException('cycleId param is required');
    return this.service.getSummary(companyId, BigInt(cycleId));
  }

  @Patch(':id')
  @Roles('admin', 'fpna_manager')
  @ApiOperation({ summary: 'Update a headcount plan' })
  update(
    @Request() req: any,
    @CompanyId() companyId: bigint,
    @Param('id') id: string,
    @Body() dto: Partial<CreateHeadcountPlanDto>,
  ) {
    if (!id) throw new BadRequestException('id param is required');
    const tenantId = BigInt(req.user.tenantId);
    const userId = BigInt(req.user.id);
    return this.service.update(companyId, BigInt(id), dto, tenantId, userId);
  }

  @Delete(':id')
  @Roles('admin', 'fpna_manager')
  @ApiOperation({ summary: 'Delete a headcount plan' })
  remove(
    @Request() req: any,
    @CompanyId() companyId: bigint,
    @Param('id') id: string,
  ) {
    if (!id) throw new BadRequestException('id param is required');
    const tenantId = BigInt(req.user.tenantId);
    const userId = BigInt(req.user.id);
    return this.service.remove(companyId, BigInt(id), tenantId, userId);
  }
}
