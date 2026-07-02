const ExcelJS = require('exceljs');
const { writeFileSync, mkdirSync } = require('fs');
const { resolve } = require('path');

const OUT = resolve(__dirname, '../static-templates');
mkdirSync(OUT, { recursive: true });

const COL_WIDTHS = { 1: 24, 2: 24, 3: 20, 4: 20, 5: 18, 6: 18, 7: 18, 8: 18, 9: 18, 10: 18, 11: 18, 12: 18, 13: 18, 14: 18 };

/* ─── Helpers ─────────────────────────────────────────── */

function dd(address, config) {
  return { address, config };
}

/* ─── Template builder ────────────────────────────────── */

async function build(moduleKey, sheetName, columns, validations = []) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ASAA FB&A System';
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });

  // Define columns
  const colDefs = columns.map((c, i) => ({
    header: c.header,
    key: `col${i}`,
    width: COL_WIDTHS[i + 1] || 22,
  }));
  ws.columns = colDefs;

  // Header row styling
  const hRow = ws.getRow(1);
  hRow.height = 32;
  hRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } };
  hRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  // Set header values + comments
  columns.forEach((c, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = c.header;
    if (c.comment) {
      cell.note = c.comment;
    }
    cell.protection = { locked: true };
  });

  // Auto-filter on header row
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  // Data validations (applied to rows 2-1000)
  for (const v of validations) {
    ws.dataValidations.add(v.address, v.config);
  }

  // Protect sheet (rows 2+ are unlocked for data entry)
  ws.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    autoFilter: true,
  });

  const filePath = resolve(OUT, `${moduleKey}_template.xlsx`);
  await wb.xlsx.writeFile(filePath);
  return filePath;
}

function req(header, comment) {
  return { header, comment: `[REQUIRED] ${comment}` };
}
function opt(header, comment) {
  return { header, comment: `[Optional] ${comment}` };
}

function monthDD(col) {
  return dd(`${col}2:${col}1000`, {
    type: 'whole',
    operator: 'between',
    formulae: [1, 12],
    allowBlank: true,
    showErrorMessage: true,
    errorTitle: 'Invalid Month',
    error: 'Month must be 1-12',
  });
}

function enumDD(col, vals) {
  return dd(`${col}2:${col}1000`, {
    type: 'list',
    allowBlank: true,
    formulae: [vals.map(v => `"${v}"`).join(',')],
    showErrorMessage: true,
    errorTitle: 'Invalid value',
    error: `Please choose from: ${vals.join(', ')}`,
  });
}

function boolDD(col) {
  return dd(`${col}2:${col}1000`, {
    type: 'list',
    allowBlank: true,
    formulae: ['"true,false"'],
    showErrorMessage: true,
    errorTitle: 'Invalid value',
    error: 'Must be true or false',
  });
}

function dateDD(col) {
  return dd(`${col}2:${col}1000`, {
    type: 'date',
    allowBlank: true,
    showErrorMessage: true,
    errorTitle: 'Invalid Date',
    error: 'Must be a valid date (YYYY-MM-DD)',
  });
}

function reqDateDD(col) {
  return dd(`${col}2:${col}1000`, {
    type: 'date',
    allowBlank: false,
    showErrorMessage: true,
    errorTitle: 'Invalid Date',
    error: 'Must be a valid date (YYYY-MM-DD)',
  });
}

/* ─── Generate All 24 Templates ───────────────────────── */

async function generateAll() {
  const results = [];

  // 1. Companies
  results.push(await build('companies', 'Companies', [
    req('Company Name', 'Company trading name'),
    opt('Legal Name', 'Official registered legal name'),
    opt('Industry Type', 'Business sector\nAllowed: food_manufacturing, food_retail, mixed, other'),
    opt('Currency Code', 'Default currency ISO 4217\nExample: EGP, USD'),
    opt('Tax Number', 'Tax registration number'),
    opt('Fiscal Year Start Month', 'Month number 1-12\nDefault: 1 (January)'),
  ], [
    enumDD('C', ['food_manufacturing', 'food_retail', 'mixed', 'other']),
    monthDD('F'),
  ]));

  // 2. Sites
  results.push(await build('sites', 'Sites', [
    req('Site Name', 'Name of site (factory, warehouse, etc.)'),
    req('Type', 'Site type\nAllowed: factory, branch, warehouse, office, distribution_center'),
    opt('Region', 'Geographic region'),
    opt('Address', 'Full address'),
    opt('Status', 'Site status\nAllowed: active, inactive\nDefault: active'),
  ], [
    enumDD('B', ['factory', 'branch', 'warehouse', 'office', 'distribution_center']),
    enumDD('E', ['active', 'inactive']),
  ]));

  // 3. Units
  results.push(await build('units', 'Units', [
    req('Unit Name', 'Full unit name\nExample: Kilogram, Piece, Liter'),
    req('Symbol', 'Short symbol\nExample: kg, pcs, L'),
  ]));

  // 4. Accounts
  results.push(await build('accounts', 'Accounts', [
    req('Account Code', 'Unique GL account code'),
    req('Account Name', 'Account display name'),
    req('Type', 'Account type (chart of accounts)\nAllowed: revenue, cogs, expense, asset, liability, equity, cashflow'),
    opt('Parent Code', 'Parent account code for hierarchy\nFK → account.code'),
    opt('Is Active', 'Active flag\nValues: true / false\nDefault: true'),
  ], [
    enumDD('C', ['revenue', 'cogs', 'expense', 'asset', 'liability', 'equity', 'cashflow']),
    boolDD('E'),
  ]));

  // 5. Cost Centers
  results.push(await build('cost-centers', 'Cost Centers', [
    req('Cost Center Code', 'Unique cost center code'),
    req('Cost Center Name', 'Department or cost center name'),
    opt('Type', 'Functional type\nAllowed: sales, production, admin, marketing, logistics, maintenance, other\nDefault: other'),
    opt('Site Name', 'Associated site\nFK → site.name'),
    opt('Parent Code', 'Parent cost center for hierarchy\nFK → costCenter.code'),
  ], [
    enumDD('C', ['sales', 'production', 'admin', 'marketing', 'logistics', 'maintenance', 'other']),
  ]));

  // 6. Product Categories
  results.push(await build('product-categories', 'Product Categories', [
    req('Category Name', 'Category name'),
    opt('Parent Category', 'Parent category for hierarchy\nFK → productCategory.name'),
  ]));

  // 7. Customers
  results.push(await build('customers', 'Customers', [
    req('Customer Code', 'Unique customer code'),
    req('Customer Name', 'Customer business name'),
    opt('Customer Type', 'Segment type\nAllowed: retail, wholesale, distributor, internal, other\nDefault: retail'),
    opt('Region', 'Geographic region'),
    opt('Phone', 'Contact phone'),
    opt('Email', 'Contact email'),
    opt('Credit Limit', 'Credit limit amount\nDefault: 0'),
    opt('Payment Terms', 'Payment terms in days\nDefault: 30'),
    opt('Is Active', 'Active flag\nValues: true / false\nDefault: true'),
  ], [
    enumDD('C', ['retail', 'wholesale', 'distributor', 'internal', 'other']),
    boolDD('I'),
  ]));

  // 8. Suppliers
  results.push(await build('suppliers', 'Suppliers', [
    req('Supplier Name', 'Supplier business name'),
    opt('Phone', 'Contact phone'),
    opt('Email', 'Contact email'),
  ]));

  // 9. Materials
  results.push(await build('materials', 'Materials', [
    req('Material Code', 'Unique material code'),
    req('Material Name', 'Material description'),
    opt('Material Type', 'Classification — free text\nSuggested: raw_material, packaging, operating_supply, spare_part, other\nDefault: raw_material'),
    req('Unit Symbol', 'Unit of measurement\nFK → unit.symbol (must exist in Units)'),
    opt('Purchase Price', 'Current purchase price per unit\nDefault: 0'),
    opt('Supplier Name', 'Primary supplier\nFK → supplier.name (must exist in Suppliers)'),
    opt('Safety Stock Qty', 'Minimum safety stock level\nDefault: 0'),
    opt('Is Active', 'Active flag\nValues: true / false\nDefault: true'),
  ], [
    boolDD('H'),
  ]));

  // 10. Products
  results.push(await build('products', 'Products', [
    req('SKU', 'Stock keeping unit code'),
    req('Product Name', 'Product display name'),
    opt('Product Type', 'Product classification\nAllowed: finished_good, semi_finished, service\nDefault: finished_good'),
    opt('Category Name', 'Product category\nFK → productCategory.name (must exist in Product Categories)'),
    req('Unit Symbol', 'Unit of measurement\nFK → unit.symbol (must exist in Units)'),
    opt('Standard Cost', 'Standard cost per unit\nDefault: 0'),
    opt('Selling Price', 'Selling price per unit\nDefault: 0'),
    opt('Is Active', 'Active flag\nValues: true / false\nDefault: true'),
  ], [
    enumDD('C', ['finished_good', 'semi_finished', 'service']),
    boolDD('H'),
  ]));

  // 11. BOM Recipes
  results.push(await build('bom-recipes', 'BOM Recipes', [
    req('Product SKU', 'Product this BOM belongs to\nFK → product.sku/name (must exist)'),
    opt('Version', 'BOM version\nDefault: v1'),
    opt('Output Qty', 'Output quantity per batch\nDefault: 1'),
    opt('Wastage %', 'Expected wastage percentage\nDefault: 0'),
    opt('Labor Cost', 'Labor cost per unit\nDefault: 0'),
    opt('Overhead Cost', 'Overhead cost per unit\nDefault: 0'),
    req('Material Code', 'Material used in this BOM line\nFK → material.code/name (must exist)'),
    req('Qty Per Output', 'Quantity of material per output unit'),
    opt('BOM Line Wastage %', 'Material-level wastage\nDefault: 0'),
  ]));

  // 12. Exchange Rates
  results.push(await build('exchange-rates', 'Exchange Rates', [
    req('From Currency', 'Source currency ISO 4217\nExample: USD, EUR'),
    req('To Currency', 'Target currency ISO 4217\nExample: EGP, GBP'),
    req('Rate', 'Exchange rate value\nMust be a valid decimal number'),
    req('Rate Date', 'Effective date\nFormat: YYYY-MM-DD'),
    opt('Source', 'Rate source\nAllowed: manual, api, import, fallback, cached\nDefault: manual'),
  ], [
    reqDateDD('D'),
    enumDD('E', ['manual', 'api', 'import', 'fallback', 'cached']),
  ]));

  // 13. KPI Targets
  results.push(await build('kpi-targets', 'KPI Targets', [
    req('KPI Name', 'Name of the KPI'),
    opt('KPI Category', 'KPI category\nAllowed: financial, operational, sales, production, hr\nDefault: financial'),
    req('Fiscal Year', 'Fiscal year\nExample: 2026'),
    opt('Period Month', 'Month number 1-12\nBlank for annual'),
    req('Target Value', 'Target value\nMust be a valid number'),
    opt('Unit', 'Unit of measurement\nExample: %, EGP, kg'),
    opt('Site Name', 'Site-specific target\nFK → site.name (must exist)'),
  ], [
    enumDD('B', ['financial', 'operational', 'sales', 'production', 'hr']),
    monthDD('D'),
  ]));

  // 14. Raw Material Prices
  results.push(await build('raw-material-prices', 'Material Prices', [
    req('Material Code', 'Material code\nFK → material.code (must exist in Materials)'),
    req('Price', 'Price per unit\nMust be a valid decimal number'),
    req('Effective Date', 'Price effective date\nFormat: YYYY-MM-DD'),
    opt('Source', 'Price source\nDefault: manual'),
  ], [
    reqDateDD('C'),
  ]));

  // 15. Production Plans
  results.push(await build('production-plans', 'Production Planning', [
    req('Product SKU', 'Product\nFK → product.sku/name (must exist)'),
    req('Site Name', 'Production site\nFK → site.name (must exist)'),
    req('Fiscal Year', 'Fiscal year\nExample: 2026'),
    req('Period Month', 'Month number\nAccepted: 1, 01, Jan, January, Q1-Q4, Arabic months'),
    req('Planned Qty', 'Planned production quantity'),
    opt('Actual Qty', 'Actual production quantity'),
    opt('Estimated Cost', 'Estimated production cost\nDefault: 0'),
    opt('Actual Cost', 'Actual production cost'),
    opt('Plan Source', 'Plan source\nAllowed: budget, forecast, manual\nDefault: manual'),
  ], [
    monthDD('D'),
    enumDD('I', ['budget', 'forecast', 'manual']),
  ]));

  // 16. Production Allocations
  results.push(await build('production-allocations', 'Production Allocations', [
    req('Site Name', 'Site\nFK → site.name (must exist)'),
    req('Period', 'Period identifier\nExample: 2026-01, 2026-Q1'),
    req('Allocated Amount', 'Allocated cost amount\nMust be a valid number'),
    opt('Cost Category', 'Cost category\nDefault: overhead'),
    opt('Allocation Method', 'Allocation basis method — free text\nSuggested: production_volume, machine_hours, direct_labor_hours, floor_area, headcount, manual\nDefault: production_volume'),
    opt('Product SKU', 'Product-specific allocation\nFK → product.sku/name (must exist)'),
    opt('Description', 'Allocation description'),
  ]));

  // 17. Yield & Waste
  results.push(await build('yield-waste', 'Yield & Waste', [
    req('Product SKU', 'Product\nFK → product.sku (must exist, must have a BOM Recipe)'),
    opt('Wastage %', 'Wastage percentage to update\nRange: 0-100'),
  ]));

  // 18. Budget Lines
  results.push(await build('budget-lines', 'Budget', [
    req('Budget Cycle', 'Budget cycle name\nExample: FY26 Annual Budget\nAuto-created if not found'),
    req('Fiscal Year', 'Fiscal year\nExample: 2026'),
    req('Account', 'GL account\nFK → account.code/name (must exist)'),
    opt('Site', 'Site\nFK → site.name (must exist)'),
    opt('Cost Center', 'Cost center\nFK → costCenter.code/name (must exist)'),
    opt('Product', 'Product\nFK → product.sku/name (must exist)'),
    opt('Material', 'Material\nFK → material.code/name (must exist)'),
    opt('Customer', 'Customer\nFK → customer.code/name (must exist)'),
    req('Month', 'Month number\nAccepted: 1, 01, Jan, January, Q1-Q4, Arabic months'),
    opt('Quantity', 'Planned quantity\nDefault: 0'),
    opt('Unit Price', 'Planned unit price\nDefault: 0'),
    req('Amount', 'Budget amount\nMust be a valid number'),
    opt('Notes', 'Budget notes or description'),
  ], [
    monthDD('I'),
  ]));

  // 19. Forecast Lines
  results.push(await build('forecast-lines', 'Forecast', [
    req('Forecast Cycle', 'Forecast cycle name\nExample: FY26 Q1 Forecast\nAuto-created if not found'),
    req('Fiscal Year', 'Fiscal year\nExample: 2026'),
    req('Account', 'GL account\nFK → account.code/name (must exist)'),
    opt('Site', 'Site\nFK → site.name (must exist)'),
    opt('Cost Center', 'Cost center\nFK → costCenter.code/name (must exist)'),
    opt('Product', 'Product\nFK → product.sku/name (must exist)'),
    opt('Material', 'Material\nFK → material.code/name (must exist)'),
    opt('Customer', 'Customer\nFK → customer.code/name (must exist)'),
    req('Month', 'Month number\nAccepted: 1, 01, Jan, January, Q1-Q4, Arabic months'),
    opt('Quantity', 'Forecast quantity\nDefault: 0'),
    opt('Unit Price', 'Forecast unit price\nDefault: 0'),
    req('Amount', 'Forecast amount\nMust be a valid number'),
    opt('Driver Type', 'Forecast driver type — free text\nSuggested: sales_volume, production_volume, headcount, square_meters, machine_hours, direct_labor_hours, manual, other'),
    opt('Notes', 'Forecast notes'),
  ], [
    monthDD('I'),
  ]));

  // 20. Actual Lines
  results.push(await build('actual-lines', 'Actuals', [
    req('Account', 'GL account\nFK → account.code/name (must exist)'),
    opt('Site', 'Site\nFK → site.name (must exist)'),
    opt('Cost Center', 'Cost center\nFK → costCenter.code/name (must exist)'),
    opt('Product', 'Product\nFK → product.sku/name (must exist)'),
    opt('Material', 'Material\nFK → material.code/name (must exist)'),
    opt('Customer', 'Customer\nFK → customer.code/name (must exist)'),
    req('Transaction Date', 'Date of the actual transaction\nFormat: YYYY-MM-DD'),
    opt('Quantity', 'Transaction quantity\nDefault: 0'),
    opt('Unit Price', 'Unit price\nDefault: 0'),
    req('Amount', 'Transaction amount\nMust be a valid number'),
    opt('Reference No', 'Invoice or reference number'),
  ], [
    reqDateDD('G'),
  ]));

  // 21. Promotions
  results.push(await build('promotions', 'Promotions', [
    req('Promotion Name', 'Promotion title'),
    opt('Description', 'Promotion description'),
    opt('Product SKU', 'Product\nFK → product.sku/name (must exist)'),
    opt('Customer Code', 'Customer\nFK → customer.code/name (must exist)'),
    opt('Discount %', 'Discount percentage'),
    opt('Discount Amount', 'Fixed discount amount'),
    req('Start Date', 'Promotion start date\nFormat: YYYY-MM-DD'),
    opt('End Date', 'Promotion end date\nFormat: YYYY-MM-DD'),
    opt('Budget Amount', 'Promotion budget amount'),
    opt('Actual Cost', 'Actual promotion cost'),
    opt('Incremental Revenue', 'Incremental revenue generated'),
    opt('ROI', 'Return on investment'),
    opt('Is Active', 'Active flag\nValues: true / false\nDefault: true'),
  ], [
    reqDateDD('G'),
    dateDD('H'),
    boolDD('M'),
  ]));

  // 22. Headcount Plans
  results.push(await build('headcount-plans', 'Headcount Plans', [
    req('Budget Cycle', 'Budget cycle\nFK → budgetCycle.name (must exist)'),
    opt('Site Name', 'Site\nFK → site.name (must exist)'),
    opt('Cost Center', 'Cost center\nFK → costCenter.code/name (must exist)'),
    req('Job Title', 'Job title for the headcount'),
    opt('Department', 'Department name'),
    opt('Employment Type', 'Employment type\nAllowed: full_time, part_time, contract, seasonal\nDefault: full_time'),
    req('Period Month', 'Month number\nAccepted: 1, 01, Jan, January, Q1-Q4, Arabic months'),
    opt('Headcount', 'Number of employees\nDefault: 1'),
    opt('Basic Salary', 'Monthly basic salary\nDefault: 0'),
    opt('Allowances', 'Monthly allowances\nDefault: 0'),
    opt('Social Insurance', 'Monthly social insurance cost\nDefault: 0'),
    req('Total Cost', 'Total monthly cost (salary + allowances + insurance)\nMust be a valid number'),
    opt('Notes', 'Headcount notes or description'),
  ], [
    enumDD('F', ['full_time', 'part_time', 'contract', 'seasonal']),
    monthDD('G'),
  ]));

  // 23. Notification Rules
  results.push(await build('notification-rules', 'Notification Rules', [
    req('Rule Name', 'Name of the notification rule'),
    req('Trigger Type', 'Event that triggers this rule\nAllowed: variance_pct, variance_amount, kpi_breach, budget_approval, forecast_approval, import_failed'),
    opt('Threshold Value', 'Threshold that triggers the alert'),
    opt('Account Code', 'Account to monitor\nFK → account.code/name (must exist)'),
    opt('Site Name', 'Site to monitor\nFK → site.name (must exist)'),
    opt('Notification Channel', 'Comma-separated channels\nExample: system,email\nDefault: system,email'),
    opt('Is Active', 'Active flag\nValues: true / false\nDefault: true'),
  ], [
    enumDD('B', ['variance_pct', 'variance_amount', 'kpi_breach', 'budget_approval', 'forecast_approval', 'import_failed']),
    boolDD('G'),
  ]));

  // 24. Sales Plans
  results.push(await build('sales-plans', 'Sales Plans', [
    req('Product SKU', 'Product\nFK → product.sku/name (must exist)'),
    req('Site Name', 'Site\nFK → site.name (must exist)'),
    req('Fiscal Year', 'Fiscal year\nExample: 2026'),
    req('Period Month', 'Month number\nAccepted: 1, 01, Jan, January, Q1-Q4, Arabic months'),
    req('Planned Sales Qty', 'Planned sales quantity\nDefault: 0'),
    opt('Actual Sales Qty', 'Actual sales quantity'),
  ], [
    monthDD('D'),
  ]));

  return results;
}

/* ─── Main ────────────────────────────────────────────── */

generateAll()
  .then(files => {
    console.log(`\nGenerated ${files.length} templates:\n`);
    files.forEach(f => {
      const name = f.split('/').pop();
      console.log(`  ${name}`);
    });
    console.log('\nAll templates created successfully.\n');
  })
  .catch(err => { console.error('Error:', err); process.exit(1); });
