import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompanyId } from '../common/decorators/company.decorator';
import { AuthUser } from '../auth/auth.service';
import { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Units')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-company-id',
  description: 'Company ID header is required',
  required: true,
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new unit' })
  @ApiResponse({ status: 201, description: 'Unit created successfully.' })
  create(
    @Body() createUnitDto: CreateUnitDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.unitsService.create(
      createUnitDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all units under the company' })
  @ApiResponse({ status: 200, description: 'List of units.' })
  findAll(
    @CompanyId() companyId: bigint,
    @Query() paginationDto: PaginationDto,
    @Request() req: RequestWithUser,
  ) {
    return this.unitsService.findAll(
      companyId,
      req.user.tenantId,
      paginationDto,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a unit by ID' })
  @ApiResponse({ status: 200, description: 'Unit details.' })
  @ApiResponse({ status: 404, description: 'Unit not found.' })
  findOne(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.unitsService.findOne(BigInt(id), companyId, req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a unit' })
  @ApiResponse({ status: 200, description: 'Unit updated successfully.' })
  @ApiResponse({ status: 404, description: 'Unit not found.' })
  update(
    @Param('id') id: string,
    @Body() updateUnitDto: UpdateUnitDto,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.unitsService.update(
      BigInt(id),
      updateUnitDto,
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a unit' })
  @ApiResponse({ status: 200, description: 'Unit deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Unit not found.' })
  remove(
    @Param('id') id: string,
    @CompanyId() companyId: bigint,
    @Request() req: RequestWithUser,
  ) {
    return this.unitsService.remove(
      BigInt(id),
      companyId,
      req.user.tenantId,
      req.user.id,
    );
  }
}
