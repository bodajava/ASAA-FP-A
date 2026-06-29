import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface DependencyCheckResult {
  canImport: boolean;
  module: string;
  missingEntities: Array<{
    entityType: string;
    code: string;
    sheetName?: string;
    rowNumber?: number;
    columnName?: string;
    suggestedFix: string;
    requiredImportOrder: string;
  }>;
  requiredModules: string[];
  optionalModules: string[];
}

export interface ModuleDependencyRules {
  budget: string[];
  forecast: string[];
  actuals: string[];
  bom: string[];
  production: string[];
  inventory: string[];
  products: string[];
  materials: string[];
  customers: string[];
  suppliers: string[];
}

const DEPENDENCY_RULES: ModuleDependencyRules = {
  budget: ['accounts', 'sites', 'costCenters', 'products'],
  forecast: ['accounts', 'sites', 'costCenters', 'products'],
  actuals: ['accounts', 'sites', 'costCenters', 'products'],
  bom: ['products', 'materials', 'units'],
  production: ['sites', 'products'],
  inventory: ['sites', 'products', 'materials'],
  products: ['accounts', 'productCategories', 'units'],
  materials: ['accounts', 'units'],
  customers: ['accounts'],
  suppliers: ['accounts'],
};

const IMPORT_ORDER = [
  'companies',
  'units',
  'sites',
  'accounts',
  'costcenters',
  'productcategories',
  'customers',
  'suppliers',
  'materials',
  'products',
  'bomrecipes',
  'bomlines',
  'exchangerates',
  'materialprices',
  'pricelist',
  'promotions',
  'actuallines',
  'productionplans',
  'budgetlines',
  'forecastlines',
  'kpitargets',
];

@Injectable()
export class ImportDependencyCheckerService {
  private readonly logger = new Logger(ImportDependencyCheckerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkDependencies(
    companyId: bigint,
    moduleType: string,
    data?: Array<{ code?: string; sheetName?: string; rowNumber?: number; columnName?: string }>,
  ): Promise<DependencyCheckResult> {
    const rules = DEPENDENCY_RULES[moduleType as keyof ModuleDependencyRules];

    if (!rules) {
      return {
        canImport: true,
        module: moduleType,
        missingEntities: [],
        requiredModules: [],
        optionalModules: [],
      };
    }

    const missingEntities: DependencyCheckResult['missingEntities'] = [];

    for (const dependency of rules) {
      const missing = await this.checkModuleExists(companyId, dependency, data);
      missingEntities.push(...missing);
    }

    const canImport = missingEntities.length === 0;

    if (!canImport) {
      this.logger.warn(
        `Import blocked for module ${moduleType}: ${missingEntities.length} missing entities`,
      );
    }

    return {
      canImport,
      module: moduleType,
      missingEntities,
      requiredModules: rules,
      optionalModules: [],
    };
  }

  private async checkModuleExists(
    companyId: bigint,
    moduleType: string,
    data?: Array<{ code?: string; sheetName?: string; rowNumber?: number; columnName?: string }>,
  ): Promise<DependencyCheckResult['missingEntities']> {
    const missing: DependencyCheckResult['missingEntities'] = [];
    const orderIndex = IMPORT_ORDER.indexOf(moduleType);
    const requiredImportOrder = IMPORT_ORDER.slice(0, orderIndex + 1).join(' → ');

    let count = 0;
    try {
      switch (moduleType) {
        case 'accounts':
          count = await this.prisma.account.count({ where: { companyId } });
          break;
        case 'sites':
          count = await this.prisma.site.count({ where: { companyId } });
          break;
        case 'costCenters':
          count = await this.prisma.costCenter.count({ where: { companyId } });
          break;
        case 'products':
          count = await this.prisma.product.count({ where: { companyId } });
          break;
        case 'materials':
          count = await this.prisma.material.count({ where: { companyId } });
          break;
        case 'customers':
          count = await this.prisma.customer.count({ where: { companyId } });
          break;
        case 'suppliers':
          count = await this.prisma.supplier.count({ where: { companyId } });
          break;
        case 'units':
          count = await this.prisma.unit.count({ where: { companyId } });
          break;
        case 'productCategories':
          count = await this.prisma.productCategory.count({ where: { companyId } });
          break;
        default:
          count = 1; // Unknown modules pass by default
      }
    } catch {
      count = 0;
    }

    if (count === 0) {
      const friendlyNames: Record<string, string> = {
        accounts: 'Accounts (Chart of Accounts)',
        sites: 'Sites (Branches/Locations)',
        costCenters: 'Cost Centers',
        products: 'Products',
        materials: 'Raw Materials',
        customers: 'Customers',
        suppliers: 'Suppliers',
        units: 'Units of Measurement',
        productCategories: 'Product Categories',
      };

      missing.push({
        entityType: moduleType,
        code: `${moduleType}_missing`,
        sheetName: data?.[0]?.sheetName,
        rowNumber: data?.[0]?.rowNumber,
        columnName: data?.[0]?.columnName,
        suggestedFix: `Import ${friendlyNames[moduleType] || moduleType} first. Download the required master data template from the Excel Integration page.`,
        requiredImportOrder,
      });
    }

    return missing;
  }

  getModuleDependencyGraph(): Record<string, string[]> {
    return { ...DEPENDENCY_RULES };
  }

  getImportOrder(): string[] {
    return [...IMPORT_ORDER];
  }
}
