/**
 * Column Matcher Service
 *
 * Maps Excel columns to ERP fields.
 * Supports exact match, alias match, pattern match, and user overrides.
 * Never renames Excel columns — original names are always preserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ColumnAnalysis, ColumnMapping } from './types/excel-integration.types';

@Injectable()
export class ColumnMatcherService {
  private readonly logger = new Logger(ColumnMatcherService.name);

  /* ─── Known alias mappings (Excel column name → ERP field) ──────────── */

  private readonly ALIAS_MAP: Record<string, string[]> = {
    code: ['code', 'accountcode', 'glcode', 'accountnumber', 'number', 'ref', 'reference', 'accountcode', 'itemcode'],
    name: ['name', 'description', 'title', 'itemname', 'productname', 'materialname', 'customername', 'suppliername'],
    sku: ['sku', 'productsku', 'itemsku', 'itemcode', 'productcode', 'barcode'],
    type: ['type', 'category', 'class', 'classification', 'producttype', 'materialtype', 'customertype', 'suppliertype'],
    price: ['price', 'cost', 'amount', 'rate', 'unitprice', 'unitcost', 'purchaseprice', 'sellingprice', 'standardcost', 'costkg', 'costperkg'],
    quantity: ['quantity', 'qty', 'amount', 'volume', 'stock', 'balance', 'opening', 'closing', 'pcs', 'count'],
    date: ['date', 'transactiondate', 'effectivedate', 'startdate', 'enddate', 'duedate', 'createdat', 'snapshotdate'],
    currency: ['currency', 'curr', 'ccy', 'currencycode'],
    unit: ['unit', 'uom', 'unitofmeasure', 'measure', 'unitsymbol'],
    status: ['status', 'state', 'isactive', 'active', 'enabled'],
    email: ['email', 'e-mail', 'mail'],
    phone: ['phone', 'telephone', 'mobile', 'fax'],
    address: ['address', 'location', 'street', 'city', 'country', 'region', 'zip', 'postal'],
    notes: ['notes', 'remarks', 'comment', 'comments', 'desc', 'description'],
    periodmonth: ['month', 'period', 'periodmonth', 'fiscalmonth'],
    fiscalyear: ['year', 'fiscalyear', 'fy'],
    amount: ['amount', 'total', 'sum', 'value', 'budgetamount', 'forecastamount', 'plannedamount', 'actualamount'],
    weight: ['weight', 'weightkg', 'netweight', 'grossweight', 'weightpercarton', 'netweightcarton'],
    version: ['version', 'ver'],
    sitecode: ['sitecode', 'branchcode', 'warehousecode', 'factorycode', 'siteid'],
    costcentercode: ['costcentercode', 'cccode', 'departmentcode', 'costcenter'],
    customercustomer: ['customercode', 'clientcode', 'customerid'],
    suppliercode: ['suppliercode', 'vendorcode', 'supplierid'],
    materialcode: ['materialcode', 'rmcode', 'rawmaterialcode', 'materialid'],
    productsku: ['productsku', 'productcode', 'itemsku', 'itemcode', 'bomsku'],
    yieldpct: ['yield%', 'yieldpct', 'yieldpercent', 'yield'],
    wastagepct: ['waste%', 'wastage%', 'wastagepct', 'wastepct', 'wastage'],
    discountpct: ['discount%', 'discountpct', 'discountpercent', 'discount'],
    creditlimit: ['creditlimit', 'credit', 'creditlimitusd'],
    paymentterms: ['paymentterms', 'terms', 'paymentdays'],
    legalname: ['legalname', 'companyname', 'tradingas'],
    industrytype: ['industrytype', 'industry', 'sector'],
    taxnumber: ['taxnumber', 'vatnumber', 'tin', 'crnumber', 'vatno'],
    fiscalyearstartmonth: ['fiscalyearstartmonth', 'fystartmonth', 'startmonth'],
    drivertype: ['drivertype', 'driver', 'drivercategory'],
    kpiname: ['kpiname', 'kpi', 'metric'],
    kpicategory: ['kpicategory', 'category'],
    targetvalue: ['targetvalue', 'target', 'budget', 'forecast', 'planned'],
    actualvalue: ['actualvalue', 'actual', 'achieved'],
    fromcurrency: ['fromcurrency', 'sourcecurrency', 'basecurrency'],
    tocurrency: ['tocurrency', 'targetcurrency', 'quotecurrency'],
    ratedate: ['ratedate', 'fxdate', 'effectivedate', 'date'],
    batchnumber: ['batchnumber', 'batch', 'lotnumber', 'lot'],
    barcode: ['barcode', 'upc', 'ean', 'gtin', 'code128'],
    minstock: ['minstock', 'minimumstock', 'safetystock', 'reorderpoint'],
    materialtype: ['materialtype', 'typeofmaterial', 'rmtype', 'rawmaterialtype'],
    producttype: ['producttype', 'typeofproduct', 'fgtype', 'finishedgoodtype'],
    customertype: ['customertype', 'typeofcustomer', 'segment'],
    suppliertype: ['suppliertype', 'vendortype', 'typeofsupplier'],
    costallocation: ['costallocation', 'allocation', 'allocationmethod'],
  };

  /* ─── Main Mapping Function ────────────────────────────────────────── */

  /**
   * Build column mappings for a sheet.
   * Returns ColumnMapping[] preserving original Excel column names.
   */
  buildColumnMappings(
    columns: ColumnAnalysis[],
    userOverrides?: Record<string, string>,
  ): ColumnMapping[] {
    return columns.map(col => {
      // User override takes highest priority
      if (userOverrides?.[col.originalName]) {
        return {
          excelColumn: col.originalName,
          erpField: userOverrides[col.originalName],
          type: 'direct' as const,
          confidence: 1,
        };
      }

      // High-confidence auto-mapping from analyzer
      if (col.mappingConfidence >= 0.8 && col.mappedErpField) {
        const transform = this.detectTransform(col);
        return {
          excelColumn: col.originalName,
          erpField: col.mappedErpField,
          type: transform ? 'transform' : 'direct',
          transform,
          confidence: col.mappingConfidence,
        };
      }

      // Alias-based matching
      const aliasMatch = this.matchAlias(col.normalizedKey);
      if (aliasMatch) {
        return {
          excelColumn: col.originalName,
          erpField: aliasMatch,
          type: 'direct',
          confidence: 0.7,
        };
      }

      // Low-confidence: map to normalized key as-is
      return {
        excelColumn: col.originalName,
        erpField: col.normalizedKey,
        type: 'direct',
        confidence: 0.3,
      };
    });
  }

  /* ─── Alias Matching ───────────────────────────────────────────────── */

  private matchAlias(normalizedKey: string): string | null {
    for (const [field, aliases] of Object.entries(this.ALIAS_MAP)) {
      if (aliases.includes(normalizedKey)) {
        return field;
      }
    }
    return null;
  }

  /* ─── Transform Detection ──────────────────────────────────────────── */

  private detectTransform(col: ColumnAnalysis): string | undefined {
    // Currency columns need parsing if they contain symbols
    if (col.detectedType === 'currency' || col.sampleValues.some((v: string) => /[$€£EGP]/.test(v))) {
      return 'parse_currency';
    }

    // Date columns might need reformatting
    if (col.detectedType === 'date' && col.sampleValues.some((v: string) => /\//.test(v))) {
      return 'normalize_date';
    }

    // Boolean columns stored as yes/no
    if (col.detectedType === 'boolean' && col.sampleValues.some((v: string) => /^(yes|no)$/i.test(v))) {
      return 'parse_boolean';
    }

    return undefined;
  }

  /* ─── Confidence Scoring ───────────────────────────────────────────── */

  calculateOverallConfidence(mappings: ColumnMapping[]): number {
    if (mappings.length === 0) return 0;
    const total = mappings.reduce((sum, m) => sum + m.confidence, 0);
    return total / mappings.length;
  }

  getHighConfidenceCount(mappings: ColumnMapping[]): number {
    return mappings.filter(m => m.confidence >= 0.7).length;
  }

  getLowConfidenceColumns(mappings: ColumnMapping[]): ColumnMapping[] {
    return mappings.filter(m => m.confidence < 0.5);
  }

  getSuggestedMappings(
    columns: ColumnAnalysis[],
    userOverrides?: Record<string, string>,
  ): ColumnMapping[] {
    return this.buildColumnMappings(columns, userOverrides);
  }
}
