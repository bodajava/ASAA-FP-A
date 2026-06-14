import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { PlanResponseDto } from './dto/plan-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'Get all subscription plans' })
  @ApiResponse({ status: 200, type: [PlanResponseDto] })
  findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a plan by ID' })
  @ApiResponse({ status: 200, type: PlanResponseDto })
  @ApiResponse({ status: 404, description: 'Plan not found.' })
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }
}
