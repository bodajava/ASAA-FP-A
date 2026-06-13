/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as XLSX from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';
import { SimpleCache } from '../common/utils/cache.util';

export interface RowPreviewResult {
  index: number;
  data: Record<string, any>;
  isValid: boolean;
  errors: string[];
}

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeKeys(row: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};
    for (const key of Object.keys(row)) {
      const cleanKey = key
        .replace(/\s+/g, '')
        .replace(/_+/g, '')
        .replace(/-+/g, '')
        .toLowerCase();
      normalized[cleanKey] = row[key];
    }
    return normalized;
  }

  getSampleCSV(module: string): string {
    switch (module.toLowerCase()) {
      case 'companies':
        return 'name,legalName,industryType,currencyCode,taxNumber\nMy New Company,My Legal Name,mixed,EGP,123-456-789';
      case 'sites':
        return 'name,type,region,address\nCairo HQ,office,Cairo,12 El Tahrir St\nAlexandria Plant,factory,Alexandria,Desert Road';
      case 'units':
        return 'name,symbol\nKilogram,kg\nPieces,pcs\nLiters,L';
      case 'accounts':
        return 'code,name,type,parentCode\n4000,Sales Revenue,revenue,\n5000,Cost of Goods Sold,cogs,\n6000,Rent Expense,expense,';
      case 'costcenters':
      case 'cost-centers':
        return 'code,name,type,siteCode,parentCode\nCC-MKT,Marketing Dept,marketing,,';
      case 'productcategories':
      case 'product-categories':
        return 'name,parentCategoryName\nBeverages,\nSoft Drinks,Beverages';
      case 'suppliers':
        return 'name,phone,email\nAl Ahram Corp,+2021234567,info@alahram.com';
      case 'customers':
        return 'code,name,customerType,region,phone,email,creditLimit,paymentTerms\nCUST-01,Universal Stores,wholesale,Giza,,info@universal.com,50000,30';
      case 'products':
        return 'sku,name,productType,salePrice,standardCost,categoryName,unitSymbol\nPROD-CAN,Canned Drink,finished_good,15,10,Beverages,pcs';
      case 'materials':
        return 'code,name,purchasePrice,safetyStockQty,supplierName,unitSymbol\nMAT-SUG,Raw Sugar,5,100,Al Ahram Corp,kg';
      case 'bomrecipes':
      case 'bom-recipes':
        return 'productSku,version,outputQty,wastagePct,laborCost,overheadCost,materialCode,qtyPerOutput,bomLineWastagePct\nPROD-CAN,v1,1,0.02,2.5,1.2,MAT-SUG,0.15,0.01';
      case 'budgetlines':
      case 'budget-lines':
        return 'budgetCycleName,fiscalYear,accountCode,siteCode,costCenterCode,productSku,materialCode,customerCode,periodMonth,quantity,unitPrice,amount,notes\nFY25 Annual Budget,2025,4000,Cairo HQ,CC-MKT,PROD-CAN,,,1,1000,15,15000,January sales projection';
      case 'forecastlines':
      case 'forecast-lines':
        return 'forecastCycleName,fiscalYear,accountCode,siteCode,costCenterCode,productSku,materialCode,customerCode,periodMonth,quantity,unitPrice,amount,driverType,notes\nFY25 Rolling Q1,2025,4000,Cairo HQ,CC-MKT,PROD-CAN,,,1,1200,15,18000,driver_based,Q1 updated forecast';
      case 'actuallines':
      case 'actual-lines':
        return 'accountCode,siteCode,costCenterCode,productSku,materialCode,customerCode,transactionDate,quantity,unitPrice,amount,referenceNo\n4000,Cairo HQ,CC-MKT,PROD-CAN,,,2025-01-15,950,15,14250,TX-99812';
      default:
        throw new BadRequestException(`Unknown module template: ${module}`);
    }
  }

  async preview(
    module: string,
    fileContent: string,
    fileName: string,
    companyId: bigint,
    tenantId: bigint,
  ): Promise<RowPreviewResult[]> {
    let rawRows: any[] = [];
    const isCsv = fileName.toLowerCase().endsWith('.csv');

    try {
      const buffer = Buffer.from(fileContent, 'base64');
      if (isCsv) {
        rawRows = csvParse(buffer.toString('utf-8'), {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } else {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        rawRows = XLSX.utils.sheet_to_json(sheet);
      }
    } catch (err: any) {
      throw new BadRequestException(`Failed to parse file: ${err.message}`);
    }

    const results: RowPreviewResult[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const rawRow = rawRows[i];
      const normalized = this.normalizeKeys(rawRow);
      const errors: string[] = [];

      // Validate references and columns according to module
      await this.validateRow(module, normalized, companyId, tenantId, errors);

      results.push({
        index: i + 1,
        data: rawRow,
        isValid: errors.length === 0,
        errors,
      });
    }

    return results;
  }

  private async validateRow(
    module: string,
    row: Record<string, any>,
    companyId: bigint,
    tenantId: bigint,
    errors: string[],
  ): Promise<void> {
    const mod = module.toLowerCase().replace(/[-_]/g, '');

    switch (mod) {
      case 'companies': {
        if (!row.name) errors.push('Company Name is required.');
        if (row.currencycode && row.currencycode.length !== 3) {
          errors.push('Currency Code must be exactly 3 characters.');
        }
        if (
          row.industrytype &&
          !['mixed', 'retail', 'manufacturing', 'services'].includes(
            row.industrytype,
          )
        ) {
          errors.push(
            'Industry Type must be mixed, retail, manufacturing, or services.',
          );
        }
        break;
      }
      case 'sites': {
        if (!row.name) errors.push('Site Name is required.');
        if (!row.type) errors.push('Site Type is required.');
        else if (
          ![
            'factory',
            'branch',
            'warehouse',
            'office',
            'distribution_center',
          ].includes(row.type)
        ) {
          errors.push(
            'Site Type must be factory, branch, warehouse, office, or distribution_center.',
          );
        }
        break;
      }
      case 'units': {
        if (!row.name) errors.push('Unit Name is required.');
        if (!row.symbol) errors.push('Unit Symbol is required.');
        break;
      }
      case 'accounts': {
        if (!row.code) errors.push('Account Code is required.');
        if (!row.name) errors.push('Account Name is required.');
        if (!row.type) errors.push('Account Type is required.');
        else if (
          ![
            'revenue',
            'cogs',
            'expense',
            'asset',
            'liability',
            'equity',
            'cashflow',
          ].includes(row.type)
        ) {
          errors.push(
            'Account Type must be revenue, cogs, expense, asset, liability, equity, or cashflow.',
          );
        }
        if (row.code && companyId) {
          const accExists = await this.prisma.account.findFirst({
            where: { code: String(row.code).trim(), companyId },
          });
          if (accExists) {
            errors.push(
              `Account Code "${row.code}" already exists in the company.`,
            );
          }
        }
        if (row.parentcode && companyId) {
          const parent = await this.prisma.account.findFirst({
            where: { code: String(row.parentcode).trim(), companyId },
          });
          if (!parent) {
            errors.push(
              `Parent Account with code "${row.parentcode}" does not exist.`,
            );
          }
        }
        break;
      }
      case 'costcenters': {
        if (!row.code) errors.push('Cost Center Code is required.');
        if (!row.name) errors.push('Cost Center Name is required.');
        if (
          row.type &&
          ![
            'sales',
            'production',
            'admin',
            'marketing',
            'logistics',
            'maintenance',
            'other',
          ].includes(row.type)
        ) {
          errors.push(
            'Cost Center Type must be sales, production, admin, marketing, logistics, maintenance, or other.',
          );
        }
        if (row.sitecode && companyId) {
          const site = await this.prisma.site.findFirst({
            where: { name: String(row.sitecode).trim(), companyId },
          });
          if (!site) {
            errors.push(`Site with name "${row.sitecode}" does not exist.`);
          }
        }
        if (row.parentcode && companyId) {
          const parent = await this.prisma.costCenter.findFirst({
            where: { code: String(row.parentcode).trim(), companyId },
          });
          if (!parent) {
            errors.push(
              `Parent Cost Center with code "${row.parentcode}" does not exist.`,
            );
          }
        }
        break;
      }
      case 'productcategories': {
        if (!row.name) errors.push('Category Name is required.');
        if (row.parentcategoryname && companyId) {
          const parent = await this.prisma.productCategory.findFirst({
            where: { name: String(row.parentcategoryname).trim(), companyId },
          });
          if (!parent) {
            errors.push(
              `Parent Product Category with name "${row.parentcategoryname}" does not exist.`,
            );
          }
        }
        break;
      }
      case 'suppliers': {
        if (!row.name) errors.push('Supplier Name is required.');
        break;
      }
      case 'customers': {
        if (!row.code) errors.push('Customer Code is required.');
        if (!row.name) errors.push('Customer Name is required.');
        if (
          row.customertype &&
          !['retail', 'wholesale', 'distributor', 'internal', 'other'].includes(
            row.customertype,
          )
        ) {
          errors.push(
            'Customer Type must be retail, wholesale, distributor, internal, or other.',
          );
        }
        break;
      }
      case 'products': {
        if (!row.sku) errors.push('SKU is required.');
        if (!row.name) errors.push('Product Name is required.');
        if (
          row.producttype &&
          !['finished_good', 'semi_finished', 'service'].includes(
            row.producttype,
          )
        ) {
          errors.push(
            'Product Type must be finished_good, semi_finished, or service.',
          );
        }
        if (row.categoryname && companyId) {
          const cat = await this.prisma.productCategory.findFirst({
            where: { name: String(row.categoryname).trim(), companyId },
          });
          if (!cat) {
            errors.push(`Category "${row.categoryname}" does not exist.`);
          }
        }
        if (row.unitsymbol && companyId) {
          const unit = await this.prisma.unit.findFirst({
            where: { symbol: String(row.unitsymbol).trim(), companyId },
          });
          if (!unit) {
            errors.push(`Unit Symbol "${row.unitsymbol}" does not exist.`);
          }
        }
        break;
      }
      case 'materials': {
        if (!row.code) errors.push('Material Code is required.');
        if (!row.name) errors.push('Material Name is required.');
        if (row.suppliername && companyId) {
          const supplier = await this.prisma.supplier.findFirst({
            where: { name: String(row.suppliername).trim(), companyId },
          });
          if (!supplier) {
            errors.push(`Supplier "${row.suppliername}" does not exist.`);
          }
        }
        if (row.unitsymbol && companyId) {
          const unit = await this.prisma.unit.findFirst({
            where: { symbol: String(row.unitsymbol).trim(), companyId },
          });
          if (!unit) {
            errors.push(`Unit Symbol "${row.unitsymbol}" does not exist.`);
          }
        }
        break;
      }
      case 'bomrecipes': {
        if (!row.productsku) errors.push('Product SKU is required.');
        if (!row.materialcode) errors.push('Material Code is required.');
        if (!row.qtyperoutput) errors.push('Quantity Per Output is required.');
        else if (isNaN(Number(row.qtyperoutput)))
          errors.push('Quantity Per Output must be a number.');

        if (row.productsku && companyId) {
          const product = await this.prisma.product.findFirst({
            where: { sku: String(row.productsku).trim(), companyId },
          });
          if (!product) {
            errors.push(`Product with SKU "${row.productsku}" does not exist.`);
          }
        }
        if (row.materialcode && companyId) {
          const material = await this.prisma.material.findFirst({
            where: { code: String(row.materialcode).trim(), companyId },
          });
          if (!material) {
            errors.push(
              `Material with Code "${row.materialcode}" does not exist.`,
            );
          }
        }
        break;
      }
      case 'budgetlines': {
        if (!row.budgetcyclename) errors.push('Budget Cycle Name is required.');
        if (!row.fiscalyear) errors.push('Fiscal Year is required.');
        if (!row.accountcode) errors.push('Account Code is required.');
        if (!row.periodmonth) errors.push('Period Month is required.');
        else {
          const month = Number(row.periodmonth);
          if (isNaN(month) || month < 1 || month > 12) {
            errors.push('Period Month must be an integer between 1 and 12.');
          }
        }
        if (!row.amount) errors.push('Amount is required.');
        else if (isNaN(Number(row.amount)))
          errors.push('Amount must be a number.');

        if (row.accountcode && companyId) {
          const acc = await this.prisma.account.findFirst({
            where: { code: String(row.accountcode).trim(), companyId },
          });
          if (!acc)
            errors.push(`Account Code "${row.accountcode}" does not exist.`);
        }
        if (row.sitecode && companyId) {
          const site = await this.prisma.site.findFirst({
            where: { name: String(row.sitecode).trim(), companyId },
          });
          if (!site) errors.push(`Site "${row.sitecode}" does not exist.`);
        }
        if (row.costcentercode && companyId) {
          const cc = await this.prisma.costCenter.findFirst({
            where: { code: String(row.costcentercode).trim(), companyId },
          });
          if (!cc)
            errors.push(
              `Cost Center Code "${row.costcentercode}" does not exist.`,
            );
        }
        if (row.productsku && companyId) {
          const prod = await this.prisma.product.findFirst({
            where: { sku: String(row.productsku).trim(), companyId },
          });
          if (!prod)
            errors.push(`Product SKU "${row.productsku}" does not exist.`);
        }
        if (row.materialcode && companyId) {
          const mat = await this.prisma.material.findFirst({
            where: { code: String(row.materialcode).trim(), companyId },
          });
          if (!mat)
            errors.push(`Material Code "${row.materialcode}" does not exist.`);
        }
        if (row.customercode && companyId) {
          const cust = await this.prisma.customer.findFirst({
            where: { code: String(row.customercode).trim(), companyId },
          });
          if (!cust)
            errors.push(`Customer Code "${row.customercode}" does not exist.`);
        }
        break;
      }
      case 'forecastlines': {
        if (!row.forecastcyclename)
          errors.push('Forecast Cycle Name is required.');
        if (!row.fiscalyear) errors.push('Fiscal Year is required.');
        if (!row.accountcode) errors.push('Account Code is required.');
        if (!row.periodmonth) errors.push('Period Month is required.');
        else {
          const month = Number(row.periodmonth);
          if (isNaN(month) || month < 1 || month > 12) {
            errors.push('Period Month must be an integer between 1 and 12.');
          }
        }
        if (!row.amount) errors.push('Amount is required.');
        else if (isNaN(Number(row.amount)))
          errors.push('Amount must be a number.');

        if (row.accountcode && companyId) {
          const acc = await this.prisma.account.findFirst({
            where: { code: String(row.accountcode).trim(), companyId },
          });
          if (!acc)
            errors.push(`Account Code "${row.accountcode}" does not exist.`);
        }
        if (row.sitecode && companyId) {
          const site = await this.prisma.site.findFirst({
            where: { name: String(row.sitecode).trim(), companyId },
          });
          if (!site) errors.push(`Site "${row.sitecode}" does not exist.`);
        }
        if (row.costcentercode && companyId) {
          const cc = await this.prisma.costCenter.findFirst({
            where: { code: String(row.costcentercode).trim(), companyId },
          });
          if (!cc)
            errors.push(
              `Cost Center Code "${row.costcentercode}" does not exist.`,
            );
        }
        if (row.productsku && companyId) {
          const prod = await this.prisma.product.findFirst({
            where: { sku: String(row.productsku).trim(), companyId },
          });
          if (!prod)
            errors.push(`Product SKU "${row.productsku}" does not exist.`);
        }
        if (row.materialcode && companyId) {
          const mat = await this.prisma.material.findFirst({
            where: { code: String(row.materialcode).trim(), companyId },
          });
          if (!mat)
            errors.push(`Material Code "${row.materialcode}" does not exist.`);
        }
        if (row.customercode && companyId) {
          const cust = await this.prisma.customer.findFirst({
            where: { code: String(row.customercode).trim(), companyId },
          });
          if (!cust)
            errors.push(`Customer Code "${row.customercode}" does not exist.`);
        }
        break;
      }
      case 'actuallines': {
        if (!row.accountcode) errors.push('Account Code is required.');
        if (!row.transactiondate) errors.push('Transaction Date is required.');
        else if (isNaN(Date.parse(row.transactiondate))) {
          errors.push(
            'Transaction Date must be a valid date format (e.g. YYYY-MM-DD).',
          );
        }
        if (!row.amount) errors.push('Amount is required.');
        else if (isNaN(Number(row.amount)))
          errors.push('Amount must be a number.');

        if (row.accountcode && companyId) {
          const acc = await this.prisma.account.findFirst({
            where: { code: String(row.accountcode).trim(), companyId },
          });
          if (!acc)
            errors.push(`Account Code "${row.accountcode}" does not exist.`);
        }
        if (row.sitecode && companyId) {
          const site = await this.prisma.site.findFirst({
            where: { name: String(row.sitecode).trim(), companyId },
          });
          if (!site) errors.push(`Site "${row.sitecode}" does not exist.`);
        }
        if (row.costcentercode && companyId) {
          const cc = await this.prisma.costCenter.findFirst({
            where: { code: String(row.costcentercode).trim(), companyId },
          });
          if (!cc)
            errors.push(
              `Cost Center Code "${row.costcentercode}" does not exist.`,
            );
        }
        if (row.productsku && companyId) {
          const prod = await this.prisma.product.findFirst({
            where: { sku: String(row.productsku).trim(), companyId },
          });
          if (!prod)
            errors.push(`Product SKU "${row.productsku}" does not exist.`);
        }
        if (row.materialcode && companyId) {
          const mat = await this.prisma.material.findFirst({
            where: { code: String(row.materialcode).trim(), companyId },
          });
          if (!mat)
            errors.push(`Material Code "${row.materialcode}" does not exist.`);
        }
        if (row.customercode && companyId) {
          const cust = await this.prisma.customer.findFirst({
            where: { code: String(row.customercode).trim(), companyId },
          });
          if (!cust)
            errors.push(`Customer Code "${row.customercode}" does not exist.`);
        }
        break;
      }
      default:
        break;
    }
  }

  async commit(
    module: string,
    rows: any[],
    companyId: bigint,
    tenantId: bigint,
    userId: bigint,
  ): Promise<{ successCount: number; failCount: number }> {
    const validRows: any[] = [];
    let failCount = 0;

    for (const rawRow of rows) {
      const normalized = this.normalizeKeys(rawRow);
      const errors: string[] = [];
      await this.validateRow(module, normalized, companyId, tenantId, errors);
      if (errors.length === 0) {
        validRows.push(normalized);
      } else {
        failCount++;
      }
    }

    if (validRows.length === 0) {
      return { successCount: 0, failCount };
    }

    const mod = module.toLowerCase().replace(/[-_]/g, '');

    await this.prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        switch (mod) {
          case 'companies': {
            await tx.company.create({
              data: {
                tenantId,
                name: String(row.name).trim(),
                legalName: row.legalname ? String(row.legalname).trim() : null,
                industryType: row.industrytype || 'mixed',
                currencyCode: row.currencycode
                  ? String(row.currencycode).trim()
                  : 'EGP',
                taxNumber: row.taxnumber ? String(row.taxnumber).trim() : null,
              },
            });
            break;
          }
          case 'sites': {
            await tx.site.create({
              data: {
                companyId,
                name: String(row.name).trim(),
                type: row.type,
                region: row.region ? String(row.region).trim() : null,
                address: row.address ? String(row.address).trim() : null,
              },
            });
            break;
          }
          case 'units': {
            await tx.unit.create({
              data: {
                companyId,
                name: String(row.name).trim(),
                symbol: String(row.symbol).trim(),
              },
            });
            break;
          }
          case 'accounts': {
            let parentId: bigint | null = null;
            if (row.parentcode) {
              const p = await tx.account.findFirst({
                where: { code: String(row.parentcode).trim(), companyId },
              });
              parentId = p ? p.id : null;
            }
            await tx.account.create({
              data: {
                companyId,
                code: String(row.code).trim(),
                name: String(row.name).trim(),
                type: row.type,
                parentId,
              },
            });
            break;
          }
          case 'costcenters': {
            let siteId: bigint | null = null;
            if (row.sitecode) {
              const s = await tx.site.findFirst({
                where: { name: String(row.sitecode).trim(), companyId },
              });
              siteId = s ? s.id : null;
            }
            let parentId: bigint | null = null;
            if (row.parentcode) {
              const p = await tx.costCenter.findFirst({
                where: { code: String(row.parentcode).trim(), companyId },
              });
              parentId = p ? p.id : null;
            }
            await tx.costCenter.create({
              data: {
                companyId,
                siteId,
                parentId,
                code: String(row.code).trim(),
                name: String(row.name).trim(),
                type: row.type || 'other',
              },
            });
            break;
          }
          case 'productcategories': {
            let parentId: bigint | null = null;
            if (row.parentcategoryname) {
              const p = await tx.productCategory.findFirst({
                where: {
                  name: String(row.parentcategoryname).trim(),
                  companyId,
                },
              });
              parentId = p ? p.id : null;
            }
            await tx.productCategory.create({
              data: {
                companyId,
                name: String(row.name).trim(),
                parentId,
              },
            });
            break;
          }
          case 'suppliers': {
            await tx.supplier.create({
              data: {
                companyId,
                name: String(row.name).trim(),
                phone: row.phone ? String(row.phone).trim() : null,
                email: row.email ? String(row.email).trim() : null,
              },
            });
            break;
          }
          case 'customers': {
            await tx.customer.create({
              data: {
                companyId,
                code: String(row.code).trim(),
                name: String(row.name).trim(),
                customerType: row.customertype || 'retail',
                region: row.region ? String(row.region).trim() : null,
                phone: row.phone ? String(row.phone).trim() : null,
                email: row.email ? String(row.email).trim() : null,
                creditLimit: row.creditlimit ? Number(row.creditlimit) : 0,
                paymentTerms: row.paymentterms ? Number(row.paymentterms) : 30,
              },
            });
            break;
          }
          case 'products': {
            let categoryId: bigint | null = null;
            if (row.categoryname) {
              const c = await tx.productCategory.findFirst({
                where: { name: String(row.categoryname).trim(), companyId },
              });
              categoryId = c ? c.id : null;
            }
            let unitId: bigint | null = null;
            if (row.unitsymbol) {
              const u = await tx.unit.findFirst({
                where: { symbol: String(row.unitsymbol).trim(), companyId },
              });
              unitId = u ? u.id : null;
            }
            await tx.product.create({
              data: {
                companyId,
                sku: String(row.sku).trim(),
                name: String(row.name).trim(),
                productType: row.producttype || 'finished_good',
                salePrice: row.saleprice ? Number(row.saleprice) : 0,
                standardCost: row.standardcost ? Number(row.standardcost) : 0,
                categoryId,
                unitId,
              },
            });
            break;
          }
          case 'materials': {
            let supplierId: bigint | null = null;
            if (row.suppliername) {
              const s = await tx.supplier.findFirst({
                where: { name: String(row.suppliername).trim(), companyId },
              });
              supplierId = s ? s.id : null;
            }
            let unitId: bigint | null = null;
            if (row.unitsymbol) {
              const u = await tx.unit.findFirst({
                where: { symbol: String(row.unitsymbol).trim(), companyId },
              });
              unitId = u ? u.id : null;
            }
            await tx.material.create({
              data: {
                companyId,
                code: String(row.code).trim(),
                name: String(row.name).trim(),
                purchasePrice: row.purchaseprice
                  ? Number(row.purchaseprice)
                  : 0,
                safetyStockQty: row.safetystockqty
                  ? Number(row.safetystockqty)
                  : 0,
                supplierId,
                unitId,
              },
            });
            break;
          }
          case 'bomrecipes': {
            const product = await tx.product.findFirst({
              where: { sku: String(row.productsku).trim(), companyId },
            });
            const material = await tx.material.findFirst({
              where: { code: String(row.materialcode).trim(), companyId },
            });
            if (product && material) {
              const version = row.version ? String(row.version).trim() : 'v1';
              let recipe = await tx.bomRecipe.findFirst({
                where: { productId: product.id, version, companyId },
              });
              if (!recipe) {
                recipe = await tx.bomRecipe.create({
                  data: {
                    companyId,
                    productId: product.id,
                    version,
                    outputQty: row.outputqty ? Number(row.outputqty) : 1,
                    wastagePct: row.wastagepct ? Number(row.wastagepct) : 0,
                    laborCost: row.laborcost ? Number(row.laborcost) : 0,
                    overheadCost: row.overheadcost
                      ? Number(row.overheadcost)
                      : 0,
                  },
                });
              }
              await tx.bomLine.create({
                data: {
                  bomId: recipe.id,
                  materialId: material.id,
                  qtyPerOutput: Number(row.qtyperoutput),
                  wastagePct: row.bomlinewastagepct
                    ? Number(row.bomlinewastagepct)
                    : 0,
                },
              });
            }
            break;
          }
          case 'budgetlines': {
            const acc = await tx.account.findFirst({
              where: { code: String(row.accountcode).trim(), companyId },
            });
            if (!acc) break;

            const fiscalYear = Number(row.fiscalyear);
            const cycleName = String(row.budgetcyclename).trim();
            let cycle = await tx.budgetCycle.findFirst({
              where: { name: cycleName, fiscalYear, companyId },
            });
            if (!cycle) {
              cycle = await tx.budgetCycle.create({
                data: {
                  companyId,
                  name: cycleName,
                  fiscalYear,
                  status: 'draft',
                  createdBy: userId,
                },
              });
            }

            let siteId: bigint | null = null;
            if (row.sitecode) {
              const s = await tx.site.findFirst({
                where: { name: String(row.sitecode).trim(), companyId },
              });
              siteId = s ? s.id : null;
            }
            let costCenterId: bigint | null = null;
            if (row.costcentercode) {
              const cc = await tx.costCenter.findFirst({
                where: { code: String(row.costcentercode).trim(), companyId },
              });
              costCenterId = cc ? cc.id : null;
            }
            let productId: bigint | null = null;
            if (row.productsku) {
              const p = await tx.product.findFirst({
                where: { sku: String(row.productsku).trim(), companyId },
              });
              productId = p ? p.id : null;
            }
            let materialId: bigint | null = null;
            if (row.materialcode) {
              const m = await tx.material.findFirst({
                where: { code: String(row.materialcode).trim(), companyId },
              });
              materialId = m ? m.id : null;
            }
            let customerId: bigint | null = null;
            if (row.customercode) {
              const c = await tx.customer.findFirst({
                where: { code: String(row.customercode).trim(), companyId },
              });
              customerId = c ? c.id : null;
            }

            await tx.budgetLine.create({
              data: {
                budgetCycleId: cycle.id,
                accountId: acc.id,
                siteId,
                costCenterId,
                productId,
                materialId,
                customerId,
                periodMonth: Number(row.periodmonth),
                quantity: row.quantity ? Number(row.quantity) : 0,
                unitPrice: row.unitprice ? Number(row.unitprice) : 0,
                amount: Number(row.amount),
                notes: row.notes ? String(row.notes).trim() : null,
              },
            });
            break;
          }
          case 'forecastlines': {
            const acc = await tx.account.findFirst({
              where: { code: String(row.accountcode).trim(), companyId },
            });
            if (!acc) break;

            const fiscalYear = Number(row.fiscalyear);
            const cycleName = String(row.forecastcyclename).trim();
            let cycle = await tx.forecastCycle.findFirst({
              where: { name: cycleName, fiscalYear, companyId },
            });
            if (!cycle) {
              cycle = await tx.forecastCycle.create({
                data: {
                  companyId,
                  name: cycleName,
                  fiscalYear,
                  basePeriod: new Date(fiscalYear, 0, 1),
                  status: 'draft',
                  createdBy: userId,
                },
              });
            }

            let siteId: bigint | null = null;
            if (row.sitecode) {
              const s = await tx.site.findFirst({
                where: { name: String(row.sitecode).trim(), companyId },
              });
              siteId = s ? s.id : null;
            }
            let costCenterId: bigint | null = null;
            if (row.costcentercode) {
              const cc = await tx.costCenter.findFirst({
                where: { code: String(row.costcentercode).trim(), companyId },
              });
              costCenterId = cc ? cc.id : null;
            }
            let productId: bigint | null = null;
            if (row.productsku) {
              const p = await tx.product.findFirst({
                where: { sku: String(row.productsku).trim(), companyId },
              });
              productId = p ? p.id : null;
            }
            let materialId: bigint | null = null;
            if (row.materialcode) {
              const m = await tx.material.findFirst({
                where: { code: String(row.materialcode).trim(), companyId },
              });
              materialId = m ? m.id : null;
            }
            let customerId: bigint | null = null;
            if (row.customercode) {
              const c = await tx.customer.findFirst({
                where: { code: String(row.customercode).trim(), companyId },
              });
              customerId = c ? c.id : null;
            }

            await tx.forecastLine.create({
              data: {
                forecastCycleId: cycle.id,
                accountId: acc.id,
                siteId,
                costCenterId,
                productId,
                materialId,
                customerId,
                periodMonth: Number(row.periodmonth),
                quantity: row.quantity ? Number(row.quantity) : 0,
                unitPrice: row.unitprice ? Number(row.unitprice) : 0,
                amount: Number(row.amount),
                driverType: row.drivertype
                  ? String(row.drivertype).trim()
                  : null,
                notes: row.notes ? String(row.notes).trim() : null,
              },
            });
            break;
          }
          case 'actuallines': {
            const acc = await tx.account.findFirst({
              where: { code: String(row.accountcode).trim(), companyId },
            });
            if (!acc) break;

            const transactionDate = new Date(row.transactiondate);
            const fiscalYear = transactionDate.getFullYear();

            // Find or create ActualImport for GL lines
            let imp = await tx.actualImport.findFirst({
              where: {
                companyId,
                importType: 'gl',
                status: 'posted',
              },
            });
            if (!imp) {
              imp = await tx.actualImport.create({
                data: {
                  companyId,
                  importType: 'gl',
                  periodFrom: new Date(fiscalYear, 0, 1),
                  periodTo: new Date(fiscalYear, 11, 31),
                  status: 'posted',
                  importedBy: userId,
                },
              });
            }

            let siteId: bigint | null = null;
            if (row.sitecode) {
              const s = await tx.site.findFirst({
                where: { name: String(row.sitecode).trim(), companyId },
              });
              siteId = s ? s.id : null;
            }
            let costCenterId: bigint | null = null;
            if (row.costcentercode) {
              const cc = await tx.costCenter.findFirst({
                where: { code: String(row.costcentercode).trim(), companyId },
              });
              costCenterId = cc ? cc.id : null;
            }
            let productId: bigint | null = null;
            if (row.productsku) {
              const p = await tx.product.findFirst({
                where: { sku: String(row.productsku).trim(), companyId },
              });
              productId = p ? p.id : null;
            }
            let materialId: bigint | null = null;
            if (row.materialcode) {
              const m = await tx.material.findFirst({
                where: { code: String(row.materialcode).trim(), companyId },
              });
              materialId = m ? m.id : null;
            }
            let customerId: bigint | null = null;
            if (row.customercode) {
              const c = await tx.customer.findFirst({
                where: { code: String(row.customercode).trim(), companyId },
              });
              customerId = c ? c.id : null;
            }

            await tx.actualLine.create({
              data: {
                actualImportId: imp.id,
                accountId: acc.id,
                siteId,
                costCenterId,
                productId,
                materialId,
                customerId,
                transactionDate,
                quantity: row.quantity ? Number(row.quantity) : 0,
                unitPrice: row.unitprice ? Number(row.unitprice) : 0,
                amount: Number(row.amount),
                referenceNo: row.referenceno
                  ? String(row.referenceno).trim()
                  : null,
              },
            });
            break;
          }
          default:
            break;
        }
      }
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Import',
        entityId: null,
        action: 'import',
        newValues: {
          module,
          successCount: validRows.length,
          failCount,
        },
      },
    });

    // Clear cache to ensure reports and dashboard are updated
    SimpleCache.clear();

    return {
      successCount: validRows.length,
      failCount,
    };
  }
}
