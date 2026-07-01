import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  ActualImport,
  ActualLine,
  ImportSourceSystem,
  ImportType,
  ImportStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateActualImportDto } from './dto/create-actual-import.dto';
import { UpdateActualImportDto } from './dto/update-actual-import.dto';
import { PreviewActualImportDto } from './dto/preview-actual-import.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SimpleCache } from '../common/utils/cache.util';

export type QueryActualImport = ActualImport & {
  actualLines: ActualLine[];
};

export interface ActualLineResponseDto {
  id: string;
  actualImportId: string;
  accountId: string;
  siteId: string | null;
  costCenterId: string | null;
  productId: string | null;
  materialId: string | null;
  customerId: string | null;
  transactionDate: Date;
  quantity: number;
  unitPrice: number;
  amount: number;
  referenceNo: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ActualImportResponseDto {
  id: string;
  companyId: string;
  sourceSystem: ImportSourceSystem | null;
  mappingId: string | null;
  importType: ImportType;
  periodFrom: Date;
  periodTo: Date;
  filePath: string | null;
  status: ImportStatus | null;
  errorLog: string | null;
  importedBy: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  actualLines?: ActualLineResponseDto[];
}

export interface MappedRowResult {
  rowIdx: number;
  success: boolean;
  errors: string[];
  line?: {
    accountId: bigint;
    siteId?: bigint | null;
    costCenterId?: bigint | null;
    productId?: bigint | null;
    materialId?: bigint | null;
    customerId?: bigint | null;
    transactionDate: Date;
    quantity?: number;
    unitPrice?: number;
    amount: number;
    referenceNo?: string | null;
  };
}

export function mapActualImportToResponse(
  imp: QueryActualImport,
): ActualImportResponseDto {
  const mappedLines = imp.actualLines?.map((line) => ({
    id: line.id.toString(),
    actualImportId: line.actualImportId.toString(),
    accountId: line.accountId.toString(),
    siteId: line.siteId ? line.siteId.toString() : null,
    costCenterId: line.costCenterId ? line.costCenterId.toString() : null,
    productId: line.productId ? line.productId.toString() : null,
    materialId: line.materialId ? line.materialId.toString() : null,
    customerId: line.customerId ? line.customerId.toString() : null,
    transactionDate: line.transactionDate,
    quantity: line.quantity ? Number(line.quantity) : 0,
    unitPrice: line.unitPrice ? Number(line.unitPrice) : 0,
    amount: Number(line.amount),
    referenceNo: line.referenceNo,
    createdAt: line.createdAt,
    updatedAt: line.updatedAt,
  }));

  return {
    id: imp.id.toString(),
    companyId: imp.companyId.toString(),
    sourceSystem: imp.sourceSystem,
    mappingId: imp.mappingId ? imp.mappingId.toString() : null,
    importType: imp.importType,
    periodFrom: imp.periodFrom,
    periodTo: imp.periodTo,
    filePath: imp.filePath,
    status: imp.status,
    errorLog: imp.errorLog,
    importedBy: imp.importedBy ? imp.importedBy.toString() : null,
    createdAt: imp.createdAt,
    updatedAt: imp.updatedAt,
    actualLines: mappedLines,
  };
}

@Injectable()
export class ActualImportsService {
  private readonly logger = new Logger(ActualImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async ensureCompanyBelongsToTenant(
    companyId: bigint,
    tenantId: bigint,
  ) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId },
    });
    if (!company) {
      throw new NotFoundException(`Company not found under this tenant`);
    }
  }

  private buildEntityMaps(companyId: bigint) {
    return Promise.all([
      this.prisma.account.findMany({
        where: { companyId },
        select: { id: true, code: true },
      }),
      this.prisma.site.findMany({
        where: { companyId },
        select: { id: true, name: true },
      }),
      this.prisma.costCenter.findMany({
        where: { companyId },
        select: { id: true, code: true },
      }),
      this.prisma.product.findMany({
        where: { companyId },
        select: { id: true, sku: true },
      }),
      this.prisma.material.findMany({
        where: { companyId },
        select: { id: true, code: true },
      }),
      this.prisma.customer.findMany({
        where: { companyId },
        select: { id: true, code: true },
      }),
    ]).then(
      ([accounts, sites, costCenters, products, materials, customers]) => ({
        accounts: new Map(accounts.map((a) => [a.code, a.id])),
        sites: new Map(sites.map((s) => [s.name, s.id])),
        costCenters: new Map(costCenters.map((c) => [c.code ?? '', c.id])),
        products: new Map(products.map((p) => [p.sku, p.id])),
        materials: new Map(materials.map((m) => [m.code, m.id])),
        customers: new Map(customers.map((c) => [c.code, c.id])),
      }),
    );
  }

  private resolveFromMap(
    map: Map<string, bigint>,
    codeValue: string,
  ): bigint | null {
    if (!codeValue) return null;
    const cleanCode = codeValue.toString().trim();
    if (!cleanCode) return null;
    return map.get(cleanCode) ?? null;
  }

  private async validateLineReferences(
    lines: {
      accountId: string;
      siteId?: string;
      costCenterId?: string;
      productId?: string;
      materialId?: string;
      customerId?: string;
    }[],
    companyId: bigint,
  ): Promise<void> {
    if (!lines || lines.length === 0) return;

    const accountIds = new Set<bigint>();
    const siteIds = new Set<bigint>();
    const ccIds = new Set<bigint>();
    const productIds = new Set<bigint>();
    const materialIds = new Set<bigint>();
    const customerIds = new Set<bigint>();

    for (const line of lines) {
      if (line.accountId) accountIds.add(BigInt(line.accountId));
      if (line.siteId) siteIds.add(BigInt(line.siteId));
      if (line.costCenterId) ccIds.add(BigInt(line.costCenterId));
      if (line.productId) productIds.add(BigInt(line.productId));
      if (line.materialId) materialIds.add(BigInt(line.materialId));
      if (line.customerId) customerIds.add(BigInt(line.customerId));
    }

    if (accountIds.size > 0) {
      const dbAccounts = await this.prisma.account.findMany({
        where: { id: { in: Array.from(accountIds) }, companyId },
      });
      if (dbAccounts.length !== accountIds.size) {
        throw new BadRequestException(
          'One or more account IDs do not exist or belong to another company',
        );
      }
    }

    if (siteIds.size > 0) {
      const dbSites = await this.prisma.site.findMany({
        where: { id: { in: Array.from(siteIds) }, companyId },
      });
      if (dbSites.length !== siteIds.size) {
        throw new BadRequestException(
          'One or more site IDs do not exist or belong to another company',
        );
      }
    }

    if (ccIds.size > 0) {
      const dbCCs = await this.prisma.costCenter.findMany({
        where: { id: { in: Array.from(ccIds) }, companyId },
      });
      if (dbCCs.length !== ccIds.size) {
        throw new BadRequestException(
          'One or more cost center IDs do not exist or belong to another company',
        );
      }
    }

    if (productIds.size > 0) {
      const dbProducts = await this.prisma.product.findMany({
        where: { id: { in: Array.from(productIds) }, companyId },
      });
      if (dbProducts.length !== productIds.size) {
        throw new BadRequestException(
          'One or more product IDs do not exist or belong to another company',
        );
      }
    }

    if (materialIds.size > 0) {
      const dbMaterials = await this.prisma.material.findMany({
        where: { id: { in: Array.from(materialIds) }, companyId },
      });
      if (dbMaterials.length !== materialIds.size) {
        throw new BadRequestException(
          'One or more material IDs do not exist or belong to another company',
        );
      }
    }

    if (customerIds.size > 0) {
      const dbCustomers = await this.prisma.customer.findMany({
        where: { id: { in: Array.from(customerIds) }, companyId },
      });
      if (dbCustomers.length !== customerIds.size) {
        throw new BadRequestException(
          'One or more customer IDs do not exist or belong to another company',
        );
      }
    }
  }

  async resolveRowsWithMapping(
    mappingId: bigint,
    rawRows: Record<string, string | number | boolean | null>[],
    companyId: bigint,
  ): Promise<MappedRowResult[]> {
    const mapping = await this.prisma.importMapping.findFirst({
      where: { id: mappingId, companyId },
    });
    if (!mapping) {
      throw new BadRequestException(
        `Import Mapping template with ID ${mappingId} not found under this company`,
      );
    }

    const config = JSON.parse(mapping.mappingConfig) as Record<
      string,
      string | undefined
    >;
    const results: MappedRowResult[] = [];

    // Pre-load all entities for this company into maps (6 queries instead of N*6)
    const maps = await this.buildEntityMaps(companyId);

    let rowIdx = 0;
    for (const row of rawRows) {
      const errors: string[] = [];

      const accountCodeKey = config['accountCode'];
      const accountCodeVal = accountCodeKey ? row[accountCodeKey] : undefined;
      let accountId: bigint | null = null;
      if (accountCodeVal !== undefined && accountCodeVal !== null) {
        accountId = this.resolveFromMap(
          maps.accounts,
          accountCodeVal.toString(),
        );
        if (!accountId) {
          errors.push(
            `Account code "${accountCodeVal}" not found under this company`,
          );
        }
      } else {
        errors.push(`Account code column is missing or empty`);
      }

      const siteCodeKey = config['siteCode'];
      const siteCodeVal = siteCodeKey ? row[siteCodeKey] : undefined;
      let siteId: bigint | null = null;
      if (
        siteCodeVal !== undefined &&
        siteCodeVal !== null &&
        siteCodeVal !== ''
      ) {
        siteId = this.resolveFromMap(maps.sites, siteCodeVal.toString());
        if (!siteId) {
          errors.push(
            `Site name "${siteCodeVal}" not found under this company`,
          );
        }
      }

      const costCenterCodeKey = config['costCenterCode'];
      const costCenterCodeVal = costCenterCodeKey
        ? row[costCenterCodeKey]
        : undefined;
      let costCenterId: bigint | null = null;
      if (
        costCenterCodeVal !== undefined &&
        costCenterCodeVal !== null &&
        costCenterCodeVal !== ''
      ) {
        costCenterId = this.resolveFromMap(
          maps.costCenters,
          costCenterCodeVal.toString(),
        );
        if (!costCenterId) {
          errors.push(
            `Cost center code "${costCenterCodeVal}" not found under this company`,
          );
        }
      }

      const productSkuKey = config['productSku'];
      const productSkuVal = productSkuKey ? row[productSkuKey] : undefined;
      let productId: bigint | null = null;
      if (
        productSkuVal !== undefined &&
        productSkuVal !== null &&
        productSkuVal !== ''
      ) {
        productId = this.resolveFromMap(
          maps.products,
          productSkuVal.toString(),
        );
        if (!productId) {
          errors.push(
            `Product SKU "${productSkuVal}" not found under this company`,
          );
        }
      }

      const materialCodeKey = config['materialCode'];
      const materialCodeVal = materialCodeKey
        ? row[materialCodeKey]
        : undefined;
      let materialId: bigint | null = null;
      if (
        materialCodeVal !== undefined &&
        materialCodeVal !== null &&
        materialCodeVal !== ''
      ) {
        materialId = this.resolveFromMap(
          maps.materials,
          materialCodeVal.toString(),
        );
        if (!materialId) {
          errors.push(
            `Material code "${materialCodeVal}" not found under this company`,
          );
        }
      }

      const customerCodeKey = config['customerCode'];
      const customerCodeVal = customerCodeKey
        ? row[customerCodeKey]
        : undefined;
      let customerId: bigint | null = null;
      if (
        customerCodeVal !== undefined &&
        customerCodeVal !== null &&
        customerCodeVal !== ''
      ) {
        customerId = this.resolveFromMap(
          maps.customers,
          customerCodeVal.toString(),
        );
        if (!customerId) {
          errors.push(
            `Customer code "${customerCodeVal}" not found under this company`,
          );
        }
      }

      const quantityKey = config['quantity'];
      const quantityVal = quantityKey ? row[quantityKey] : undefined;
      let quantity: number | undefined = undefined;
      if (
        quantityVal !== undefined &&
        quantityVal !== null &&
        quantityVal !== ''
      ) {
        quantity = Number(quantityVal);
        if (isNaN(quantity)) {
          errors.push(`Quantity value "${quantityVal}" is not a valid number`);
        }
      }

      const unitPriceKey = config['unitPrice'];
      const unitPriceVal = unitPriceKey ? row[unitPriceKey] : undefined;
      let unitPrice: number | undefined = undefined;
      if (
        unitPriceVal !== undefined &&
        unitPriceVal !== null &&
        unitPriceVal !== ''
      ) {
        unitPrice = Number(unitPriceVal);
        if (isNaN(unitPrice)) {
          errors.push(
            `Unit price value "${unitPriceVal}" is not a valid number`,
          );
        }
      }

      const amountKey = config['amount'];
      const amountVal = amountKey ? row[amountKey] : undefined;
      let amount = 0;
      if (amountVal !== undefined && amountVal !== null && amountVal !== '') {
        amount = Number(amountVal);
        if (isNaN(amount)) {
          errors.push(`Amount value "${amountVal}" is not a valid number`);
        }
      } else {
        errors.push(`Amount column is missing or empty`);
      }

      const dateKey = config['transactionDate'];
      const dateVal = dateKey ? row[dateKey] : undefined;
      let transactionDate = new Date();
      if (dateVal !== undefined && dateVal !== null && dateVal !== '') {
        transactionDate = new Date(dateVal.toString());
        if (isNaN(transactionDate.getTime())) {
          errors.push(
            `Transaction date value "${dateVal}" is not a valid date`,
          );
        }
      } else {
        errors.push(`Transaction date column is missing or empty`);
      }

      const refKey = config['referenceNo'];
      const refVal = refKey ? row[refKey] : undefined;
      const referenceNo =
        refVal !== undefined && refVal !== null ? refVal.toString() : null;

      if (errors.length === 0 && accountId !== null) {
        results.push({
          rowIdx,
          success: true,
          errors: [],
          line: {
            accountId,
            siteId,
            costCenterId,
            productId,
            materialId,
            customerId,
            transactionDate,
            quantity,
            unitPrice,
            amount,
            referenceNo,
          },
        });
      } else {
        results.push({
          rowIdx,
          success: false,
          errors,
        });
      }

      rowIdx++;
    }

    return results;
  }

  async preview(
    previewDto: PreviewActualImportDto,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<MappedRowResult[]> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
    return this.resolveRowsWithMapping(
      BigInt(previewDto.mappingId),
      previewDto.rawRows,
      companyId,
    );
  }

  async create(
    createDto: CreateActualImportDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ActualImportResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    let resolvedLines: MappedRowResult[] = [];
    let initialStatus: ImportStatus = 'uploaded';
    let errorLog: string | null = null;

    if (createDto.mappingId && createDto.rawRows) {
      resolvedLines = await this.resolveRowsWithMapping(
        BigInt(createDto.mappingId),
        createDto.rawRows,
        companyId,
      );

      const hasErrors = resolvedLines.some((r) => !r.success);
      if (hasErrors) {
        initialStatus = 'failed';
        const errors = resolvedLines
          .filter((r) => !r.success)
          .map((r) => `Row ${r.rowIdx}: ${r.errors.join(', ')}`);
        errorLog = JSON.stringify(errors);
      } else {
        initialStatus = 'validated';
      }
    } else if (createDto.actualLines) {
      await this.validateLineReferences(createDto.actualLines, companyId);
      initialStatus = 'validated';
    }

    const imp = await this.prisma.$transaction(async (tx) => {
      const createdImport = await tx.actualImport.create({
        data: {
          companyId,
          sourceSystem: createDto.sourceSystem,
          mappingId: createDto.mappingId ? BigInt(createDto.mappingId) : null,
          importType: createDto.importType,
          periodFrom: new Date(createDto.periodFrom),
          periodTo: new Date(createDto.periodTo),
          filePath: createDto.filePath,
          status: initialStatus,
          errorLog,
          importedBy: userId,
        },
      });

      if (initialStatus === 'validated') {
        if (createDto.mappingId && createDto.rawRows) {
          const linesToInsert = resolvedLines
            .filter((r) => r.success && r.line)
            .map((r) => ({
              actualImportId: createdImport.id,
              accountId: r.line!.accountId,
              siteId: r.line!.siteId,
              costCenterId: r.line!.costCenterId,
              productId: r.line!.productId,
              materialId: r.line!.materialId,
              customerId: r.line!.customerId,
              transactionDate: r.line!.transactionDate,
              quantity: r.line!.quantity ?? 0,
              unitPrice: r.line!.unitPrice ?? 0,
              amount: r.line!.amount,
              referenceNo: r.line!.referenceNo,
            }));

          await tx.actualLine.createMany({
            data: linesToInsert,
          });
        } else if (createDto.actualLines && createDto.actualLines.length > 0) {
          await tx.actualLine.createMany({
            data: createDto.actualLines.map((line) => ({
              actualImportId: createdImport.id,
              accountId: BigInt(line.accountId),
              siteId: line.siteId ? BigInt(line.siteId) : null,
              costCenterId: line.costCenterId
                ? BigInt(line.costCenterId)
                : null,
              productId: line.productId ? BigInt(line.productId) : null,
              materialId: line.materialId ? BigInt(line.materialId) : null,
              customerId: line.customerId ? BigInt(line.customerId) : null,
              transactionDate: new Date(line.transactionDate),
              quantity: line.quantity ?? 0,
              unitPrice: line.unitPrice ?? 0,
              amount: line.amount,
              referenceNo: line.referenceNo,
            })),
          });
        }
      }

      return createdImport;
    });

    const fullImport = await this.prisma.actualImport.findUnique({
      where: { id: imp.id },
      include: { actualLines: true },
    });

    if (!fullImport) {
      throw new NotFoundException('Failed to retrieve created actual import');
    }

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ActualImport',
        entityId: imp.id,
        action: initialStatus === 'failed' ? 'fail' : 'create',
        newValues: JSON.stringify(fullImport),
      },
    });

    if (imp.status === 'failed') {
      await this.notificationsService
        .triggerImportFailed(
          companyId,
          tenantId,
          imp.id,
          imp.errorLog ?? 'Validation failed',
        )
        .catch((err: unknown) => {
          this.logger.error({
            operation: 'triggerImportFailed',
            entity: 'ActualImport',
            entityId: imp.id.toString(),
            companyId: companyId.toString(),
            userId: userId.toString(),
            error: err instanceof Error ? err.message : String(err),
          });
        });
    } else if (imp.status === 'validated' || imp.status === 'posted') {
      await this.notificationsService
        .checkAndTriggerVarianceBreaches(
          companyId,
          tenantId,
          new Date(createDto.periodFrom).getFullYear(),
        )
        .catch((err: unknown) => {
          this.logger.error({
            operation: 'checkAndTriggerVarianceBreaches',
            entity: 'ActualImport',
            entityId: imp.id.toString(),
            companyId: companyId.toString(),
            userId: userId.toString(),
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }

    return mapActualImportToResponse(fullImport);
  }

  async findAll(
    companyId: bigint,
    tenantId: bigint,
    paginationDto: PaginationDto,
  ) {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ActualImportWhereInput = {
      companyId,
    };

    if (paginationDto.search) {
      const searchStatus = paginationDto.search.toLowerCase();
      const statusMatch = Object.values(ImportStatus).find(
        (s) => s.toLowerCase() === searchStatus,
      );

      if (statusMatch) {
        where.status = statusMatch;
      } else {
        const searchSource = paginationDto.search.toLowerCase();
        const sourceMatch = Object.values(ImportSourceSystem).find(
          (s) => s.toLowerCase() === searchSource,
        );

        if (sourceMatch) {
          where.sourceSystem = sourceMatch;
        } else {
          where.filePath = { contains: paginationDto.search };
        }
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.actualImport.count({ where }),
      this.prisma.actualImport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { actualLines: true },
      }),
    ]);

    const mappedData = data.map((imp) => mapActualImportToResponse(imp));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: mappedData,
    };
  }

  async findOne(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<ActualImportResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const imp = await this.prisma.actualImport.findFirst({
      where: { id, companyId },
      include: { actualLines: true },
    });

    if (!imp) {
      throw new NotFoundException(
        `Actual Import with ID ${id} not found under this company`,
      );
    }

    return mapActualImportToResponse(imp);
  }

  async update(
    id: bigint,
    updateDto: UpdateActualImportDto,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ActualImportResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);
    const oldImport = await this.prisma.actualImport.findFirst({
      where: { id, companyId },
      include: { actualLines: true },
    });
    if (!oldImport) {
      throw new NotFoundException(
        `Actual Import with ID ${id} not found under this company`,
      );
    }

    if (oldImport.status === 'posted') {
      throw new BadRequestException(
        'Posted actual data imports cannot be modified',
      );
    }

    let resolvedLines: MappedRowResult[] = [];
    let targetStatus: ImportStatus = oldImport.status ?? 'uploaded';
    let errorLog: string | null = null;

    if (updateDto.mappingId && updateDto.rawRows) {
      resolvedLines = await this.resolveRowsWithMapping(
        BigInt(updateDto.mappingId),
        updateDto.rawRows,
        companyId,
      );

      const hasErrors = resolvedLines.some((r) => !r.success);
      if (hasErrors) {
        targetStatus = 'failed';
        const errors = resolvedLines
          .filter((r) => !r.success)
          .map((r) => `Row ${r.rowIdx}: ${r.errors.join(', ')}`);
        errorLog = JSON.stringify(errors);
      } else {
        targetStatus = 'validated';
      }
    } else if (updateDto.actualLines) {
      await this.validateLineReferences(updateDto.actualLines, companyId);
      targetStatus = 'validated';
    }

    const updatedImport = await this.prisma.$transaction(async (tx) => {
      const imp = await tx.actualImport.update({
        where: { id },
        data: {
          sourceSystem: updateDto.sourceSystem,
          mappingId: updateDto.mappingId
            ? BigInt(updateDto.mappingId)
            : undefined,
          importType: updateDto.importType,
          periodFrom: updateDto.periodFrom
            ? new Date(updateDto.periodFrom)
            : undefined,
          periodTo: updateDto.periodTo
            ? new Date(updateDto.periodTo)
            : undefined,
          filePath: updateDto.filePath,
          status: targetStatus,
          errorLog,
        },
      });

      if (updateDto.actualLines || (updateDto.mappingId && updateDto.rawRows)) {
        await tx.actualLine.deleteMany({
          where: { actualImportId: id },
        });

        if (targetStatus === 'validated') {
          if (updateDto.mappingId && updateDto.rawRows) {
            const linesToInsert = resolvedLines
              .filter((r) => r.success && r.line)
              .map((r) => ({
                actualImportId: id,
                accountId: r.line!.accountId,
                siteId: r.line!.siteId,
                costCenterId: r.line!.costCenterId,
                productId: r.line!.productId,
                materialId: r.line!.materialId,
                customerId: r.line!.customerId,
                transactionDate: r.line!.transactionDate,
                quantity: r.line!.quantity ?? 0,
                unitPrice: r.line!.unitPrice ?? 0,
                amount: r.line!.amount,
                referenceNo: r.line!.referenceNo,
              }));

            await tx.actualLine.createMany({
              data: linesToInsert,
            });
          } else if (
            updateDto.actualLines &&
            updateDto.actualLines.length > 0
          ) {
            await tx.actualLine.createMany({
              data: updateDto.actualLines.map((line) => ({
                actualImportId: id,
                accountId: BigInt(line.accountId),
                siteId: line.siteId ? BigInt(line.siteId) : null,
                costCenterId: line.costCenterId
                  ? BigInt(line.costCenterId)
                  : null,
                productId: line.productId ? BigInt(line.productId) : null,
                materialId: line.materialId ? BigInt(line.materialId) : null,
                customerId: line.customerId ? BigInt(line.customerId) : null,
                transactionDate: new Date(line.transactionDate),
                quantity: line.quantity ?? 0,
                unitPrice: line.unitPrice ?? 0,
                amount: line.amount,
                referenceNo: line.referenceNo,
              })),
            });
          }
        }
      }

      return imp;
    });

    const fullImport = await this.prisma.actualImport.findUnique({
      where: { id: updatedImport.id },
      include: { actualLines: true },
    });

    if (!fullImport) {
      throw new NotFoundException('Failed to retrieve updated actual import');
    }

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ActualImport',
        entityId: id,
        action: targetStatus === 'failed' ? 'fail' : 'update',
        oldValues: JSON.stringify(oldImport),
        newValues: JSON.stringify(fullImport),
      },
    });

    return mapActualImportToResponse(fullImport);
  }

  async remove(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ActualImportResponseDto> {
    const imp = await this.findOne(id, companyId, tenantId);

    if (imp.status === 'posted') {
      throw new BadRequestException(
        'Posted actual data imports cannot be deleted',
      );
    }

    await this.prisma.actualImport.delete({
      where: { id },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ActualImport',
        entityId: id,
        action: 'delete',
        oldValues: JSON.stringify(imp),
      },
    });

    return imp;
  }

  async validateImport(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ActualImportResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const oldImport = await this.prisma.actualImport.findFirst({
      where: { id, companyId },
      include: { actualLines: true },
    });
    if (!oldImport) {
      throw new NotFoundException(
        `Actual Import with ID ${id} not found under this company`,
      );
    }

    if (oldImport.status === 'posted') {
      throw new BadRequestException(
        'Posted actual data imports cannot be validated',
      );
    }

    let targetStatus: ImportStatus = 'validated';
    let errorLog: string | null = null;

    try {
      if (oldImport.actualLines && oldImport.actualLines.length > 0) {
        const lineParams = oldImport.actualLines.map((line) => ({
          accountId: line.accountId.toString(),
          siteId: line.siteId ? line.siteId.toString() : undefined,
          costCenterId: line.costCenterId
            ? line.costCenterId.toString()
            : undefined,
          productId: line.productId ? line.productId.toString() : undefined,
          materialId: line.materialId ? line.materialId.toString() : undefined,
          customerId: line.customerId ? line.customerId.toString() : undefined,
        }));
        await this.validateLineReferences(lineParams, companyId);
      }
    } catch (err) {
      targetStatus = 'failed';
      errorLog =
        err instanceof Error
          ? err.message
          : 'Validation failed due to database or referencing errors';
    }

    const updatedImport = await this.prisma.actualImport.update({
      where: { id },
      data: {
        status: targetStatus,
        errorLog,
      },
      include: { actualLines: true },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ActualImport',
        entityId: id,
        action: targetStatus === 'failed' ? 'fail' : 'update',
        oldValues: JSON.stringify(oldImport),
        newValues: JSON.stringify(updatedImport),
      },
    });

    return mapActualImportToResponse(updatedImport);
  }

  async postImport(
    id: bigint,
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<ActualImportResponseDto> {
    await this.ensureCompanyBelongsToTenant(companyId, tenantId);

    const oldImport = await this.prisma.actualImport.findFirst({
      where: { id, companyId },
      include: { actualLines: true },
    });
    if (!oldImport) {
      throw new NotFoundException(
        `Actual Import with ID ${id} not found under this company`,
      );
    }

    if (oldImport.status === 'posted') {
      return mapActualImportToResponse(oldImport);
    }

    if (oldImport.status === 'failed') {
      throw new BadRequestException(
        'Cannot post a failed actual import. Please resolve the validation errors first.',
      );
    }

    const updatedImport = await this.prisma.actualImport.update({
      where: { id },
      data: {
        status: 'posted',
      },
      include: { actualLines: true },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'ActualImport',
        entityId: id,
        action: 'post',
        oldValues: JSON.stringify(oldImport),
        newValues: JSON.stringify(updatedImport),
      },
    });

    SimpleCache.clear();

    return mapActualImportToResponse(updatedImport);
  }
}
