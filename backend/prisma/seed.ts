import { PrismaClient, TenantStatus, IndustryType, UserStatus, SiteType, SiteStatus, AccountType, ProductType, CustomerType, RateSource, CycleStatus, PeriodType, ScenarioType, ForecastMethod, ImportSourceSystem, ImportType, ImportStatus, CostCenterType, BillingCycle, SubscriptionStatus, PlanSource, KpiCategory, TriggerType, EmploymentType } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';

function createPrismaClient(): PrismaClient {
  let url = process.env.DATABASE_URL!;
  if (url && url.startsWith('"') && url.endsWith('"')) {
    url = url.slice(1, -1);
  }
  const adapter = new PrismaMariaDb(url);
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

const prisma = createPrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed...\n');

  // 1. Tenant
  let tenant = await prisma.tenant.findUnique({
    where: { slug: 'idiibi-demo' },
  });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'iDiibi Demo Tenant',
        slug: 'idiibi-demo',
        status: TenantStatus.active,
        trialEndsAt: new Date('2027-12-31'),
      },
    });
    console.log(`✅ Created Tenant: ID=${tenant.id}, Slug=${tenant.slug}`);
  } else {
    console.log(`ℹ️ Tenant already exists: ID=${tenant.id}`);
  }

  // 2. Company
  let company = await prisma.company.findFirst({
    where: { tenantId: tenant.id, name: 'iDiibi Manufacturing Co.' },
  });
  if (!company) {
    company = await prisma.company.create({
      data: {
        tenantId: tenant.id,
        name: 'iDiibi Manufacturing Co.',
        legalName: 'iDiibi Manufacturing Co. LLC',
        industryType: IndustryType.food_manufacturing,
        currencyCode: 'EGP',
        fiscalYearStartMonth: 1,
        taxNumber: 'TAX-99887766',
      },
    });
    console.log(`✅ Created Company: ID=${company.id}, Name=${company.name}`);
  } else {
    console.log(`ℹ️ Company already exists: ID=${company.id}`);
  }

  // 3. Super Admin Role
  let role = await prisma.role.findFirst({
    where: { tenantId: tenant.id, name: 'Super Admin' },
  });
  if (!role) {
    role = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'Super Admin',
        permissions: JSON.stringify({ all: true }),
      },
    });
    console.log(`✅ Created Role: ID=${role.id}, Name=${role.name}`);
  } else {
    console.log(`ℹ️ Role already exists: ID=${role.id}`);
  }

  // 4. Admin User
  const email = 'admin@idiibi.com';
  const password = 'Admin@123456';
  const passwordHash = await bcrypt.hash(password, 10);

  let user = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        roleId: role.id,
        name: 'iDiibi Admin',
        email,
        passwordHash,
        status: UserStatus.active,
      },
    });
    console.log(`✅ Created Admin User: ID=${user.id}, Email=${user.email}`);
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    console.log(`✅ Verified/Updated Admin User Password: ID=${user.id}`);
  }

  // 5. Sites
  const siteData = [
    { name: 'Main Factory', type: SiteType.factory, region: 'Cairo', address: '10th of Ramadan City' },
    { name: 'Main Warehouse', type: SiteType.warehouse, region: 'Giza', address: '6th of October City' },
    { name: 'HQ Office', type: SiteType.office, region: 'Cairo', address: 'New Cairo' },
  ];
  const sites = [];
  for (const s of siteData) {
    let site = await prisma.site.findFirst({
      where: { companyId: company.id, name: s.name },
    });
    if (!site) {
      site = await prisma.site.create({
        data: {
          companyId: company.id,
          name: s.name,
          type: s.type,
          region: s.region,
          address: s.address,
          status: SiteStatus.active,
        },
      });
      console.log(`✅ Created Site: Name=${site.name}, Type=${site.type}`);
    }
    sites.push(site);
  }

  // 6. Units
  const unitData = [
    { name: 'Kilogram', symbol: 'kg' },
    { name: 'Metric Ton', symbol: 'ton' },
    { name: 'Piece', symbol: 'pcs' },
    { name: 'Liter', symbol: 'L' },
  ];
  const units = [];
  for (const u of unitData) {
    let unit = await prisma.unit.findFirst({
      where: { companyId: company.id, symbol: u.symbol },
    });
    if (!unit) {
      unit = await prisma.unit.create({
        data: {
          companyId: company.id,
          name: u.name,
          symbol: u.symbol,
        },
      });
      console.log(`✅ Created Unit: Symbol=${unit.symbol}`);
    }
    units.push(unit);
  }
  const kgUnit = units.find(u => u.symbol === 'kg')!;
  const LUnit = units.find(u => u.symbol === 'L')!;
  const pcsUnit = units.find(u => u.symbol === 'pcs')!;

  // 7. Accounts
  const accountData = [
    { code: '4000', name: 'Sales Revenue', type: AccountType.revenue },
    { code: '5000', name: 'Cost of Goods Sold', type: AccountType.cogs },
    { code: '6000', name: 'Rent Expense', type: AccountType.expense },
    { code: '6100', name: 'Salaries Expense', type: AccountType.expense },
    { code: '1000', name: 'Inventory Asset', type: AccountType.asset },
    { code: '2000', name: 'Accounts Payable', type: AccountType.liability },
  ];
  const accounts = [];
  for (const a of accountData) {
    let account = await prisma.account.findUnique({
      where: { companyId_code: { companyId: company.id, code: a.code } },
    });
    if (!account) {
      account = await prisma.account.create({
        data: {
          companyId: company.id,
          code: a.code,
          name: a.name,
          type: a.type,
          isActive: true,
        },
      });
      console.log(`✅ Created Account: Code=${account.code}, Name=${account.name}`);
    }
    accounts.push(account);
  }
  const salesAccount = accounts.find(a => a.code === '4000')!;
  const cogsAccount = accounts.find(a => a.code === '5000')!;
  const rentAccount = accounts.find(a => a.code === '6000')!;
  const salariesAccount = accounts.find(a => a.code === '6100')!;

  // 8. Cost Centers
  const ccData = [
    { code: 'CC_PROD', name: 'Production Dept', type: CostCenterType.production },
    { code: 'CC_SALES', name: 'Sales & Marketing', type: CostCenterType.sales },
    { code: 'CC_ADMIN', name: 'Administration', type: CostCenterType.admin },
  ];
  const costCenters = [];
  for (const cc of ccData) {
    let costCenter = await prisma.costCenter.findFirst({
      where: { companyId: company.id, code: cc.code },
    });
    if (!costCenter) {
      costCenter = await prisma.costCenter.create({
        data: {
          companyId: company.id,
          code: cc.code,
          name: cc.name,
          type: cc.type,
        },
      });
      console.log(`✅ Created Cost Center: Code=${costCenter.code}`);
    }
    costCenters.push(costCenter);
  }
  const ccProd = costCenters.find(c => c.code === 'CC_PROD')!;
  const ccSales = costCenters.find(c => c.code === 'CC_SALES')!;

  // 9. Suppliers
  const supplierData = [
    { name: 'Al-Hoda Raw Materials Co.', phone: '01011111111', email: 'alhoda@supplier.com' },
    { name: 'Delta Packaging Solutions', phone: '01022222222', email: 'delta@supplier.com' },
  ];
  const suppliers = [];
  for (const s of supplierData) {
    let supplier = await prisma.supplier.findFirst({
      where: { companyId: company.id, name: s.name },
    });
    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: {
          companyId: company.id,
          name: s.name,
          phone: s.phone,
          email: s.email,
        },
      });
      console.log(`✅ Created Supplier: Name=${supplier.name}`);
    }
    suppliers.push(supplier);
  }
  const rawMaterialSupplier = suppliers[0];
  const packagingSupplier = suppliers[1];

  // 10. Customers
  const customerData = [
    { code: 'CUST-001', name: 'HyperOne retail', customerType: CustomerType.retail, email: 'hyperone@customer.com' },
    { code: 'CUST-002', name: 'Carrefour Wholesale', customerType: CustomerType.wholesale, email: 'carrefour@customer.com' },
  ];
  const customers = [];
  for (const c of customerData) {
    let customer = await prisma.customer.findUnique({
      where: { companyId_code: { companyId: company.id, code: c.code } },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          companyId: company.id,
          code: c.code,
          name: c.name,
          customerType: c.customerType,
          email: c.email,
          isActive: true,
        },
      });
      console.log(`✅ Created Customer: Code=${customer.code}`);
    }
    customers.push(customer);
  }

  // 11. Product Categories
  const categoryData = [
    { name: 'Beverages' },
    { name: 'Dairy Products' },
  ];
  const categories = [];
  for (const cat of categoryData) {
    let category = await prisma.productCategory.findFirst({
      where: { companyId: company.id, name: cat.name },
    });
    if (!category) {
      category = await prisma.productCategory.create({
        data: {
          companyId: company.id,
          name: cat.name,
        },
      });
      console.log(`✅ Created Product Category: Name=${category.name}`);
    }
    categories.push(category);
  }
  const beveragesCategory = categories.find(c => c.name === 'Beverages')!;
  const dairyCategory = categories.find(c => c.name === 'Dairy Products')!;

  // 12. Products
  const productData = [
    { sku: 'PROD-JUICE', name: 'Apple Juice 250ml', categoryId: beveragesCategory.id, unitId: pcsUnit.id, salePrice: 15.00, standardCost: 8.00 },
    { sku: 'PROD-MILK', name: 'Full Cream Milk 1L', categoryId: dairyCategory.id, unitId: pcsUnit.id, salePrice: 35.00, standardCost: 20.00 },
  ];
  const products = [];
  for (const p of productData) {
    let product = await prisma.product.findUnique({
      where: { companyId_sku: { companyId: company.id, sku: p.sku } },
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          companyId: company.id,
          sku: p.sku,
          name: p.name,
          categoryId: p.categoryId,
          unitId: p.unitId,
          salePrice: p.salePrice,
          standardCost: p.standardCost,
          productType: ProductType.finished_good,
          isActive: true,
        },
      });
      console.log(`✅ Created Product: SKU=${product.sku}`);
    }
    products.push(product);
  }
  const juiceProduct = products.find(p => p.sku === 'PROD-JUICE')!;
  const milkProduct = products.find(p => p.sku === 'PROD-MILK')!;

  // 13. Materials
  const materialData = [
    { code: 'MAT-SUGAR', name: 'Refined White Sugar', supplierId: rawMaterialSupplier.id, unitId: kgUnit.id, purchasePrice: 30.00 },
    { code: 'MAT-CONCENTRATE', name: 'Apple Juice Concentrate', supplierId: rawMaterialSupplier.id, unitId: LUnit.id, purchasePrice: 150.00 },
    { code: 'MAT-CARTON', name: 'TetraPack Carton 250ml', supplierId: packagingSupplier.id, unitId: pcsUnit.id, purchasePrice: 1.50 },
  ];
  const materials = [];
  for (const m of materialData) {
    let material = await prisma.material.findUnique({
      where: { companyId_code: { companyId: company.id, code: m.code } },
    });
    if (!material) {
      material = await prisma.material.create({
        data: {
          companyId: company.id,
          code: m.code,
          name: m.name,
          supplierId: m.supplierId,
          unitId: m.unitId,
          purchasePrice: m.purchasePrice,
          isActive: true,
        },
      });
      console.log(`✅ Created Material: Code=${material.code}`);
    }
    materials.push(material);
  }
  const sugarMaterial = materials.find(m => m.code === 'MAT-SUGAR')!;
  const concentrateMaterial = materials.find(m => m.code === 'MAT-CONCENTRATE')!;
  const cartonMaterial = materials.find(m => m.code === 'MAT-CARTON')!;

  // 14. BOM Recipes
  let juiceBom = await prisma.bomRecipe.findFirst({
    where: { companyId: company.id, productId: juiceProduct.id },
  });
  if (!juiceBom) {
    juiceBom = await prisma.bomRecipe.create({
      data: {
        companyId: company.id,
        productId: juiceProduct.id,
        version: 'v1',
        outputQty: 1,
        wastagePct: 0.02,
        laborCost: 0.50,
        overheadCost: 0.30,
        isActive: true,
      },
    });
    console.log(`✅ Created BOM Recipe for Product: ID=${juiceProduct.id}`);

    await prisma.bomLine.createMany({
      data: [
        { bomId: juiceBom.id, materialId: sugarMaterial.id, qtyPerOutput: 0.02, unitCost: 30.00 },
        { bomId: juiceBom.id, materialId: concentrateMaterial.id, qtyPerOutput: 0.05, unitCost: 150.00 },
        { bomId: juiceBom.id, materialId: cartonMaterial.id, qtyPerOutput: 1.00, unitCost: 1.50 },
      ],
    });
    console.log('  Added lines to Apple Juice BOM');
  }

  let milkBom = await prisma.bomRecipe.findFirst({
    where: { companyId: company.id, productId: milkProduct.id },
  });
  if (!milkBom) {
    milkBom = await prisma.bomRecipe.create({
      data: {
        companyId: company.id,
        productId: milkProduct.id,
        version: 'v1',
        outputQty: 1,
        wastagePct: 0.01,
        laborCost: 1.00,
        overheadCost: 0.50,
        isActive: true,
      },
    });
    console.log(`✅ Created BOM Recipe for Product: ID=${milkProduct.id}`);

    await prisma.bomLine.createMany({
      data: [
        { bomId: milkBom.id, materialId: cartonMaterial.id, qtyPerOutput: 1.00, unitCost: 1.50 },
      ],
    });
    console.log('  Added lines to Milk BOM');
  }

  // 15. Budget Cycle + Budget Lines
  let budgetCycle = await prisma.budgetCycle.findFirst({
    where: { companyId: company.id, fiscalYear: 2025, name: 'FY2025 Annual Budget' },
  });
  if (!budgetCycle) {
    budgetCycle = await prisma.budgetCycle.create({
      data: {
        companyId: company.id,
        name: 'FY2025 Annual Budget',
        fiscalYear: 2025,
        periodType: PeriodType.annual,
        status: CycleStatus.approved,
        createdBy: user.id,
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    });
    console.log(`✅ Created Budget Cycle: ${budgetCycle.name}`);

    const lines = [];
    for (let month = 1; month <= 12; month++) {
      lines.push({
        budgetCycleId: budgetCycle.id,
        accountId: salesAccount.id,
        periodMonth: month,
        amount: 100000.00,
        notes: `Projected monthly revenue for month ${month}`,
      });
      lines.push({
        budgetCycleId: budgetCycle.id,
        accountId: cogsAccount.id,
        periodMonth: month,
        amount: 55000.00,
        notes: `Projected COGS for month ${month}`,
      });
      lines.push({
        budgetCycleId: budgetCycle.id,
        accountId: salariesAccount.id,
        periodMonth: month,
        amount: 20000.00,
        notes: `Budgeted salaries for month ${month}`,
      });
      lines.push({
        budgetCycleId: budgetCycle.id,
        accountId: rentAccount.id,
        periodMonth: month,
        amount: 10000.00,
        notes: `Budgeted rent for month ${month}`,
      });
    }
    await prisma.budgetLine.createMany({ data: lines });
    console.log('  Seeded 48 Budget Lines (Sales, COGS, Salaries, Rent for 12 months)');
  }

  // 16. Actual Import + Actual Lines
  let actualImport = await prisma.actualImport.findFirst({
    where: { companyId: company.id, sourceSystem: ImportSourceSystem.excel, importType: ImportType.gl },
  });
  if (!actualImport) {
    actualImport = await prisma.actualImport.create({
      data: {
        companyId: company.id,
        sourceSystem: ImportSourceSystem.excel,
        importType: ImportType.gl,
        periodFrom: new Date('2025-01-01'),
        periodTo: new Date('2025-01-31'),
        status: ImportStatus.posted,
        importedBy: user.id,
      },
    });
    console.log(`✅ Created Actual Import: ID=${actualImport.id}`);

    await prisma.actualLine.createMany({
      data: [
        {
          actualImportId: actualImport.id,
          accountId: salesAccount.id,
          transactionDate: new Date('2025-01-15'),
          amount: 120000.00,
          referenceNo: 'REV-202501',
        },
        {
          actualImportId: actualImport.id,
          accountId: cogsAccount.id,
          transactionDate: new Date('2025-01-15'),
          amount: 70000.00,
          referenceNo: 'COGS-202501',
        },
        {
          actualImportId: actualImport.id,
          accountId: rentAccount.id,
          transactionDate: new Date('2025-01-01'),
          amount: 10000.00,
          referenceNo: 'RENT-202501',
        },
        {
          actualImportId: actualImport.id,
          accountId: salariesAccount.id,
          transactionDate: new Date('2025-01-28'),
          amount: 21500.00,
          referenceNo: 'PAY-202501',
        },
      ],
    });
    console.log('  Seeded January Actual Lines (Sales, COGS, Rent, Salaries)');
  }

  // 17. Scenario Examples
  const scenarios = [];
  const scenarioData = [
    {
      name: 'Base Scenario',
      scenarioType: ScenarioType.base,
      assumptionsJson: { material_price_growth: 0.05, sales_volume_growth: 0.10 },
    },
    {
      name: 'High Inflation Scenario',
      scenarioType: ScenarioType.custom,
      assumptionsJson: { sugar_price_increase_pct: 20, cogs_increase_pct: 10 },
    },
    {
      name: 'Demand Drop Scenario',
      scenarioType: ScenarioType.pessimistic,
      assumptionsJson: { sales_volume_drop_pct: 15 },
    },
  ];
  for (const sc of scenarioData) {
    let scenario = await prisma.scenario.findFirst({
      where: { companyId: company.id, name: sc.name },
    });
    if (!scenario) {
      scenario = await prisma.scenario.create({
        data: {
          companyId: company.id,
          name: sc.name,
          scenarioType: sc.scenarioType,
          assumptionsJson: JSON.stringify(sc.assumptionsJson),
          createdBy: user.id,
        },
      });
      console.log(`✅ Created Scenario Assumption: ${scenario.name}`);
    }
    scenarios.push(scenario);
  }
  const baseScenario = scenarios.find(s => s.scenarioType === ScenarioType.base)!;

  // 18. Forecast Cycle + Forecast Lines
  let forecastCycle = await prisma.forecastCycle.findFirst({
    where: { companyId: company.id, fiscalYear: 2025, name: 'FY2025 Q1 rolling Forecast' },
  });
  if (!forecastCycle) {
    forecastCycle = await prisma.forecastCycle.create({
      data: {
        companyId: company.id,
        scenarioId: baseScenario.id,
        name: 'FY2025 Q1 rolling Forecast',
        fiscalYear: 2025,
        basePeriod: new Date('2025-01-31'),
        method: ForecastMethod.rolling,
        status: CycleStatus.approved,
        createdBy: user.id,
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    });
    console.log(`✅ Created Forecast Cycle: ${forecastCycle.name}`);

    await prisma.forecastLine.createMany({
      data: [
        {
          forecastCycleId: forecastCycle.id,
          accountId: salesAccount.id,
          periodMonth: 2,
          amount: 130000.00,
          driverType: 'sales_growth',
          notes: 'Forecasted February Sales with +10% demand assumption',
        },
        {
          forecastCycleId: forecastCycle.id,
          accountId: cogsAccount.id,
          periodMonth: 2,
          amount: 80000.00,
          driverType: 'rolling_avg',
          notes: 'Forecasted February COGS',
        },
        {
          forecastCycleId: forecastCycle.id,
          accountId: salesAccount.id,
          periodMonth: 3,
          amount: 135000.00,
          driverType: 'sales_growth',
          notes: 'Forecasted March Sales',
        },
        {
          forecastCycleId: forecastCycle.id,
          accountId: cogsAccount.id,
          periodMonth: 3,
          amount: 82000.00,
          driverType: 'rolling_avg',
          notes: 'Forecasted March COGS',
        },
      ],
    });
    console.log('  Seeded Forecast Lines for Feb/March');
  }

  // 19. Plans (Pricing Packages)
  const planData = [
    {
      name: 'Starter',
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxCompanies: 1,
      maxUsers: 3,
      features: { maxBranches: 1, maxFactories: 0, bomEnabled: false, advancedForecast: false, apiAccess: false, support: 'email' },
    },
    {
      name: 'Business',
      monthlyPrice: 199,
      yearlyPrice: 1999,
      maxCompanies: 3,
      maxUsers: 15,
      features: { maxBranches: 10, maxFactories: 2, bomEnabled: true, advancedForecast: true, apiAccess: true, support: 'priority' },
    },
    {
      name: 'Enterprise',
      monthlyPrice: 499,
      yearlyPrice: 4999,
      maxCompanies: 10,
      maxUsers: 50,
      features: { maxBranches: 999, maxFactories: 99, bomEnabled: true, advancedForecast: true, apiAccess: true, support: 'dedicated', customIntegrations: true },
    },
  ];
  const plans = [];
  for (const p of planData) {
    let plan = await prisma.plan.findFirst({
      where: { name: p.name },
    });
    if (!plan) {
      plan = await prisma.plan.create({
        data: {
          name: p.name,
          monthlyPrice: p.monthlyPrice,
          yearlyPrice: p.yearlyPrice,
          maxCompanies: p.maxCompanies,
          maxUsers: p.maxUsers,
          features: JSON.stringify(p.features),
        },
      });
      console.log(`✅ Created Plan: ${plan.name}`);
    } else {
      console.log(`ℹ️ Plan already exists: ${plan.name}`);
    }
    plans.push(plan);
  }
  const businessPlan = plans.find(p => p.name === 'Business')!;

  // 20. Subscription
  let subscription = await prisma.subscription.findFirst({
    where: { tenantId: tenant.id, planId: businessPlan.id },
  });
  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: businessPlan.id,
        startsAt: new Date(),
        billingCycle: BillingCycle.monthly,
        amount: 199.00,
        status: SubscriptionStatus.active,
      },
    });
    console.log(`✅ Created Subscription: Tenant=${tenant.id}, Plan=${businessPlan.name}`);
  } else {
    console.log(`ℹ️ Subscription already exists: ID=${subscription.id}`);
  }

  // 21. Exchange Rates
  const rateData = [
    { fromCurrency: 'EGP', toCurrency: 'USD', rate: 0.032 },
    { fromCurrency: 'EGP', toCurrency: 'EUR', rate: 0.027 },
  ];
  for (const r of rateData) {
    let rate = await prisma.exchangeRate.findFirst({
      where: { companyId: company.id, fromCurrency: r.fromCurrency, toCurrency: r.toCurrency, rateDate: new Date('2025-01-01') },
    });
    if (!rate) {
      rate = await prisma.exchangeRate.create({
        data: {
          companyId: company.id,
          fromCurrency: r.fromCurrency,
          toCurrency: r.toCurrency,
          rate: r.rate,
          rateDate: new Date('2025-01-01'),
          source: RateSource.manual,
          createdBy: user.id,
        },
      });
      console.log(`✅ Created Exchange Rate: ${r.fromCurrency} -> ${r.toCurrency} = ${r.rate}`);
    } else {
      console.log(`ℹ️ Exchange rate already exists: ${r.fromCurrency} -> ${r.toCurrency}`);
    }
  }

  // 22. Headcount Plans
  const headcountPlanData = [
    { siteId: sites[0].id, costCenterId: ccProd.id, jobTitle: 'Production Worker', department: 'Production', headcount: 20, periodMonth: 1, basicSalary: 5000, allowances: 1000, socialInsurance: 500 },
    { siteId: sites[2].id, costCenterId: ccSales.id, jobTitle: 'Sales Representative', department: 'Sales', headcount: 5, periodMonth: 1, basicSalary: 8000, allowances: 1500, socialInsurance: 500 },
    { siteId: sites[2].id, costCenterId: costCenters.find(c => c.code === 'CC_ADMIN')!.id, jobTitle: 'Admin Staff', department: 'Administration', headcount: 3, periodMonth: 1, basicSalary: 10000, allowances: 2000, socialInsurance: 500 },
  ];
  for (const hc of headcountPlanData) {
    let existing = await prisma.headcountPlan.findFirst({
      where: { budgetCycleId: budgetCycle.id, siteId: hc.siteId, costCenterId: hc.costCenterId, periodMonth: hc.periodMonth },
    });
    if (!existing) {
      const totalCost = (hc.basicSalary + hc.allowances + hc.socialInsurance) * hc.headcount;
      await prisma.headcountPlan.create({
        data: {
          budgetCycleId: budgetCycle.id,
          siteId: hc.siteId,
          costCenterId: hc.costCenterId,
          jobTitle: hc.jobTitle,
          department: hc.department,
          employmentType: EmploymentType.full_time,
          headcount: hc.headcount,
          periodMonth: hc.periodMonth,
          basicSalary: hc.basicSalary,
          allowances: hc.allowances,
          socialInsurance: hc.socialInsurance,
          totalCost: totalCost,
        },
      });
      console.log(`✅ Created Headcount Plan: ${hc.department} (${hc.headcount} headcount)`);
    } else {
      console.log(`ℹ️ Headcount Plan already exists: ${hc.department}`);
    }
  }

  // 23. Production Plans
  const productionPlanData = [
    { productId: juiceProduct.id, month: 1, plannedQty: 10000, estimatedCost: 80000 },
    { productId: juiceProduct.id, month: 2, plannedQty: 10000, estimatedCost: 80000 },
    { productId: juiceProduct.id, month: 3, plannedQty: 10000, estimatedCost: 80000 },
    { productId: milkProduct.id, month: 1, plannedQty: 5000, estimatedCost: 100000 },
    { productId: milkProduct.id, month: 2, plannedQty: 5000, estimatedCost: 100000 },
    { productId: milkProduct.id, month: 3, plannedQty: 5000, estimatedCost: 100000 },
  ];
  for (const pp of productionPlanData) {
    let existing = await prisma.productionPlan.findFirst({
      where: { companyId: company.id, siteId: sites[0].id, productId: pp.productId, fiscalYear: 2025, periodMonth: pp.month },
    });
    if (!existing) {
      await prisma.productionPlan.create({
        data: {
          companyId: company.id,
          siteId: sites[0].id,
          productId: pp.productId,
          planSource: PlanSource.manual,
          fiscalYear: 2025,
          periodMonth: pp.month,
          plannedQty: pp.plannedQty,
          estimatedCost: pp.estimatedCost,
        },
      });
      const productName = pp.productId === juiceProduct.id ? 'Juice' : 'Milk';
      console.log(`✅ Created Production Plan: ${productName} (Month ${pp.month})`);
    } else {
      console.log(`ℹ️ Production Plan already exists: product=${pp.productId}, month=${pp.month}`);
    }
  }

  // 24. Inventory Snapshots
  const months = [1, 2, 3];
  const snapshotDates = [
    new Date('2025-01-31'),
    new Date('2025-02-28'),
    new Date('2025-03-31'),
  ];
  for (let i = 0; i < months.length; i++) {
    const snapDate = snapshotDates[i];
    // Product snapshots
    const productSnapshots = [
      { productId: juiceProduct.id, materialId: null, qtyOnHand: 2000, inventoryValue: 16000 },
      { productId: milkProduct.id, materialId: null, qtyOnHand: 1500, inventoryValue: 30000 },
    ];
    for (const ps of productSnapshots) {
      let existing = await prisma.inventorySnapshot.findFirst({
        where: { companyId: company.id, siteId: sites[1].id, productId: ps.productId, snapshotDate: snapDate },
      });
      if (!existing) {
        await prisma.inventorySnapshot.create({
          data: {
            companyId: company.id,
            siteId: sites[1].id,
            productId: ps.productId,
            snapshotDate: snapDate,
            qtyOnHand: ps.qtyOnHand,
            inventoryValue: ps.inventoryValue,
          },
        });
        console.log(`✅ Created Inventory Snapshot: Product=${ps.productId}, Date=${snapDate.toISOString().slice(0, 10)}`);
      } else {
        console.log(`ℹ️ Inventory Snapshot already exists: product=${ps.productId}, date=${snapDate.toISOString().slice(0, 10)}`);
      }
    }
    // Material snapshots
    const materialSnapshots = [
      { materialId: sugarMaterial.id, productId: null, qtyOnHand: 100, inventoryValue: 3000 },
      { materialId: concentrateMaterial.id, productId: null, qtyOnHand: 200, inventoryValue: 30000 },
      { materialId: cartonMaterial.id, productId: null, qtyOnHand: 3000, inventoryValue: 4500 },
    ];
    for (const ms of materialSnapshots) {
      let existing = await prisma.inventorySnapshot.findFirst({
        where: { companyId: company.id, siteId: sites[1].id, materialId: ms.materialId, snapshotDate: snapDate },
      });
      if (!existing) {
        await prisma.inventorySnapshot.create({
          data: {
            companyId: company.id,
            siteId: sites[1].id,
            materialId: ms.materialId,
            snapshotDate: snapDate,
            qtyOnHand: ms.qtyOnHand,
            inventoryValue: ms.inventoryValue,
          },
        });
        console.log(`✅ Created Inventory Snapshot: Material=${ms.materialId}, Date=${snapDate.toISOString().slice(0, 10)}`);
      } else {
        console.log(`ℹ️ Inventory Snapshot already exists: material=${ms.materialId}, date=${snapDate.toISOString().slice(0, 10)}`);
      }
    }
  }

  // 25. KPI Targets
  const kpiData = [
    { kpiName: 'Revenue Target', kpiCategory: KpiCategory.financial, fiscalYear: 2025, targetValue: 1200000, unit: null },
    { kpiName: 'Gross Margin Target', kpiCategory: KpiCategory.financial, fiscalYear: 2025, targetValue: 40, unit: '%' },
    { kpiName: 'Production Efficiency', kpiCategory: KpiCategory.production, fiscalYear: 2025, targetValue: 95, unit: '%' },
    { kpiName: 'Customer Satisfaction', kpiCategory: KpiCategory.sales, fiscalYear: 2025, targetValue: 90, unit: '%' },
  ];
  for (const kpi of kpiData) {
    let existing = await prisma.kpiTarget.findFirst({
      where: { companyId: company.id, kpiName: kpi.kpiName, fiscalYear: kpi.fiscalYear },
    });
    if (!existing) {
      await prisma.kpiTarget.create({
        data: {
          companyId: company.id,
          kpiName: kpi.kpiName,
          kpiCategory: kpi.kpiCategory,
          fiscalYear: kpi.fiscalYear,
          targetValue: kpi.targetValue,
          unit: kpi.unit,
          createdBy: user.id,
        },
      });
      console.log(`✅ Created KPI Target: ${kpi.kpiName}`);
    } else {
      console.log(`ℹ️ KPI Target already exists: ${kpi.kpiName}`);
    }
  }

  // 26. Notification Rules
  const ruleData = [
    { ruleName: 'Budget Variance Alert', triggerType: TriggerType.variance_pct, thresholdValue: 10, accountId: salesAccount.id, channel: null },
    { ruleName: 'Import Failure Alert', triggerType: TriggerType.import_failed, thresholdValue: null, accountId: null, channel: 'system,email' },
  ];
  for (const rule of ruleData) {
    let existing = await prisma.notificationRule.findFirst({
      where: { companyId: company.id, ruleName: rule.ruleName },
    });
    if (!existing) {
      await prisma.notificationRule.create({
        data: {
          companyId: company.id,
          ruleName: rule.ruleName,
          triggerType: rule.triggerType,
          thresholdValue: rule.thresholdValue,
          accountId: rule.accountId,
          channel: rule.channel ?? 'system',
          createdBy: user.id,
        },
      });
      console.log(`✅ Created Notification Rule: ${rule.ruleName}`);
    } else {
      console.log(`ℹ️ Notification Rule already exists: ${rule.ruleName}`);
    }
  }

  // 27. Promotions
  const promoData = [
    { name: 'Summer Juice Promo', productId: juiceProduct.id, discountPct: 15, discountAmt: null, startDate: new Date('2025-06-01'), endDate: new Date('2025-08-31'), budgetAmt: 15000 },
    { name: 'New Year Milk Bundle', productId: milkProduct.id, discountPct: null, discountAmt: 10, startDate: new Date('2025-12-15'), endDate: new Date('2026-01-15'), budgetAmt: 8000 },
  ];
  for (const promo of promoData) {
    let existing = await prisma.promotion.findFirst({
      where: { companyId: company.id, name: promo.name },
    });
    if (!existing) {
      await prisma.promotion.create({
        data: {
          companyId: company.id,
          name: promo.name,
          productId: promo.productId,
          discountPct: promo.discountPct,
          discountAmt: promo.discountAmt,
          startDate: promo.startDate,
          endDate: promo.endDate,
          budgetAmt: promo.budgetAmt,
          createdBy: user.id,
        },
      });
      console.log(`✅ Created Promotion: ${promo.name}`);
    } else {
      console.log(`ℹ️ Promotion already exists: ${promo.name}`);
    }
  }

  // 28. Raw Material Prices
  const priceData = [
    { materialId: sugarMaterial.id, price: 30.00, priceDate: new Date('2025-01-01') },
    { materialId: sugarMaterial.id, price: 32.50, priceDate: new Date('2025-03-01') },
    { materialId: sugarMaterial.id, price: 35.00, priceDate: new Date('2025-06-01') },
    { materialId: concentrateMaterial.id, price: 150.00, priceDate: new Date('2025-01-01') },
    { materialId: concentrateMaterial.id, price: 155.00, priceDate: new Date('2025-04-01') },
    { materialId: cartonMaterial.id, price: 1.50, priceDate: new Date('2025-01-01') },
  ];
  for (const rmp of priceData) {
    let existing = await prisma.rawMaterialPrice.findFirst({
      where: { companyId: company.id, materialId: rmp.materialId, priceDate: rmp.priceDate },
    });
    if (!existing) {
      await prisma.rawMaterialPrice.create({
        data: {
          companyId: company.id,
          materialId: rmp.materialId,
          price: rmp.price,
          priceDate: rmp.priceDate,
          source: 'manual',
        },
      });
      console.log(`✅ Created Raw Material Price: material=${rmp.materialId}, date=${rmp.priceDate.toISOString().slice(0, 10)}, price=${rmp.price}`);
    } else {
      console.log(`ℹ️ Raw Material Price already exists: material=${rmp.materialId}, date=${rmp.priceDate.toISOString().slice(0, 10)}`);
    }
  }

  // 29. Additional Roles
  const additionalRoles = [
    { name: 'Chief Financial Officer (CFO)', permissions: { all: false, financial: true, reports: true, budget: true, forecast: true } },
    { name: 'FP&A Manager', permissions: { all: false, budget: true, forecast: true, reports: true, analytics: true } },
    { name: 'Financial Analyst', permissions: { all: false, read: true, budget: true, reports: true } },
    { name: 'Sales Manager', permissions: { all: false, sales: true, customers: true, read: true } },
    { name: 'Production Manager', permissions: { all: false, production: true, inventory: true, read: true } },
    { name: 'Procurement Manager', permissions: { all: false, procurement: true, suppliers: true, read: true } },
    { name: 'Branch Manager', permissions: { all: false, branch: true, read: true, inventory: true } },
    { name: 'Warehouse Manager', permissions: { all: false, inventory: true, warehouse: true, read: true } },
    { name: 'Auditor', permissions: { all: false, read: true } },
  ];
  for (const r of additionalRoles) {
    let existingRole = await prisma.role.findFirst({
      where: { tenantId: tenant.id, name: r.name },
    });
    if (!existingRole) {
      await prisma.role.create({
        data: {
          tenantId: tenant.id,
          name: r.name,
          permissions: JSON.stringify(r.permissions),
        },
      });
      console.log(`✅ Created Role: ${r.name}`);
    } else {
      console.log(`ℹ️ Role already exists: ${r.name}`);
    }
  }

  console.log('\n========================================');
  console.log('🎉 Seed completed successfully!\n');
  console.log('  Use these credentials to log in:\n');
  console.log(`  Tenant ID (slug):  ${tenant.slug} (Numeric ID: ${tenant.id})`);
  console.log(`  Company ID:        ${company.id}`);
  console.log(`  Email:             ${email}`);
  console.log(`  Password:          ${password}`);
  console.log('\n  Login API example:');
  console.log(`  curl -X POST http://localhost:3001/api/auth/login \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -H "x-tenant-id: ${tenant.id}" \\`);
  console.log(`    -d '{"email":"${email}","password":"${password}"}'`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e.message ?? e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
