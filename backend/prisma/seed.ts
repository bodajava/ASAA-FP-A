import { 
  PrismaClient, 
  TenantStatus, 
  IndustryType, 
  UserStatus, 
  SiteType, 
  SiteStatus, 
  AccountType, 
  ProductType, 
  CustomerType, 
  RateSource, 
  CycleStatus, 
  PeriodType, 
  ScenarioType, 
  ForecastMethod, 
  ImportSourceSystem, 
  ImportType, 
  ImportStatus, 
  CostCenterType, 
  BillingCycle, 
  SubscriptionStatus, 
  PlanSource, 
  KpiCategory, 
  TriggerType, 
  EmploymentType,
  ApprovalStatus,
  NotificationChannel,
  NotificationStatus,
  ConnectionType,
  SyncSchedule,
  SyncStatus
} from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function encrypt(text: string): string {
  if (!text) return '';
  const secret = process.env.ENCRYPTION_KEY || 'test-encryption-key-32-chars-for-testing!!';
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.createHash('sha256').update(secret).digest();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function createPrismaClient(): PrismaClient {
  let url = process.env.DATABASE_URL!;
  if (url && url.startsWith('"') && url.endsWith('"')) {
    url = url.slice(1, -1);
  }
  const urlObj = new URL(url);
  if (!urlObj.searchParams.has('allowPublicKeyRetrieval')) {
    urlObj.searchParams.set('allowPublicKeyRetrieval', 'true');
  }
  if (!urlObj.searchParams.has('connectionLimit')) {
    urlObj.searchParams.set('connectionLimit', '10');
  }
  url = urlObj.toString();
  const adapter = new PrismaMariaDb(url, { useTextProtocol: true });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

const prisma = createPrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed for two companies...\n');

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

  // 2. Super Admin Role
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

  // 3. Admin User
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

  // 4. Plans (Pricing Packages)
  const planData = [
    {
      name: 'Starter',
      code: 'starter',
      description: 'Best for small businesses and companies with a single branch',
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxCompanies: 1,
      maxUsers: 5,
      maxBranches: 1,
      dashboardLevel: 'basic',
      suitableFor: ['Small businesses', 'Companies with a single branch'],
      features: [
        'Budget Management',
        'Forecast Management',
        'Excel Import',
        'Basic Financial Reports',
      ],
      restrictions: ['1 Company', '1 Branch', 'Basic dashboards only'],
    },
    {
      name: 'Business',
      code: 'business',
      description: 'Best for medium-sized companies and multi-branch businesses',
      monthlyPrice: 49.99,
      yearlyPrice: 499.99,
      maxCompanies: 3,
      maxUsers: 25,
      maxBranches: 10,
      dashboardLevel: 'advanced',
      suitableFor: ['Medium-sized companies', 'Multi-branch businesses'],
      features: [
        'Budget Management',
        'Forecast Management',
        'Excel Import',
        'Basic Financial Reports',
        'Multi-Branch Support',
        'POS Import',
        'Inventory Management',
        'Profitability Analysis',
        'User Roles & Permissions',
      ],
      restrictions: ['Multiple branches', 'Advanced reporting enabled'],
    },
    {
      name: 'Enterprise',
      code: 'enterprise',
      description: 'Best for manufacturing companies, large enterprises, and retail chains',
      monthlyPrice: 149.99,
      yearlyPrice: 1499.99,
      maxCompanies: 999,
      maxUsers: 999,
      maxBranches: 999,
      dashboardLevel: 'full',
      suitableFor: ['Manufacturing companies', 'Large enterprises', 'Multi-site organizations and retail chains'],
      features: [
        'Budget Management',
        'Forecast Management',
        'Excel Import',
        'Basic Financial Reports',
        'Multi-Branch Support',
        'Inventory Management',
        'POS Import',
        'Profitability Analysis',
        'User Roles & Permissions',
        'Bill of Materials (BOM) Management',
        'Oracle Integration',
        'API Integration',
        'Workflow Approvals',
        'Advanced Financial Scenarios and Analytics',
      ],
      restrictions: ['Unlimited companies', 'Unlimited branches', 'Full feature access'],
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
          code: p.code,
          description: p.description,
          monthlyPrice: p.monthlyPrice,
          yearlyPrice: p.yearlyPrice,
          maxCompanies: p.maxCompanies,
          maxUsers: p.maxUsers,
          maxBranches: p.maxBranches,
          dashboardLevel: p.dashboardLevel,
          suitableFor: JSON.stringify(p.suitableFor),
          features: JSON.stringify(p.features),
          restrictions: JSON.stringify(p.restrictions),
        },
      });
      console.log(`✅ Created Plan: ${plan.name}`);
    } else {
      console.log(`ℹ️ Plan already exists: ${plan.name}`);
    }
    plans.push(plan);
  }
  const businessPlan = plans.find(p => p.name === 'Business')!;

  // 5. Subscription
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

  // 6. Additional Roles
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
    }
  }

  // ============================================================
  // COMPANY 1: iDiibi Manufacturing Co.
  // ============================================================
  console.log('\n--- Seeding Company 1: iDiibi Manufacturing Co. ---');
  let company1 = await prisma.company.findFirst({
    where: { tenantId: tenant.id, name: 'iDiibi Manufacturing Co.' },
  });
  if (!company1) {
    company1 = await prisma.company.create({
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
    console.log(`✅ Created Company 1: ID=${company1.id}, Name=${company1.name}`);
  } else {
    console.log(`ℹ️ Company 1 already exists: ID=${company1.id}`);
  }

  await seedCompanyData(company1.id, {
    sites: [
      { name: 'Main Factory', type: SiteType.factory, region: 'Cairo', address: '10th of Ramadan City' },
      { name: 'Main Warehouse', type: SiteType.warehouse, region: 'Giza', address: '6th of October City' },
      { name: 'HQ Office', type: SiteType.office, region: 'Cairo', address: 'New Cairo' },
    ],
    units: [
      { name: 'Kilogram', symbol: 'kg' },
      { name: 'Metric Ton', symbol: 'ton' },
      { name: 'Piece', symbol: 'pcs' },
      { name: 'Liter', symbol: 'L' },
    ],
    accounts: [
      { code: '4000', name: 'Sales Revenue', type: AccountType.revenue },
      { code: '5000', name: 'Cost of Goods Sold', type: AccountType.cogs },
      { code: '6000', name: 'Rent Expense', type: AccountType.expense },
      { code: '6100', name: 'Salaries Expense', type: AccountType.expense },
      { code: '1000', name: 'Inventory Asset', type: AccountType.asset },
      { code: '2000', name: 'Accounts Payable', type: AccountType.liability },
    ],
    costCenters: [
      { code: 'CC_PROD', name: 'Production Dept', type: CostCenterType.production },
      { code: 'CC_SALES', name: 'Sales & Marketing', type: CostCenterType.sales },
      { code: 'CC_ADMIN', name: 'Administration', type: CostCenterType.admin },
    ],
    suppliers: [
      { name: 'Al-Hoda Raw Materials Co.', phone: '01011111111', email: 'alhoda@supplier.com' },
      { name: 'Delta Packaging Solutions', phone: '01022222222', email: 'delta@supplier.com' },
    ],
    customers: [
      { code: 'CUST-001', name: 'HyperOne retail', customerType: CustomerType.retail, email: 'hyperone@customer.com' },
      { code: 'CUST-002', name: 'Carrefour Wholesale', customerType: CustomerType.wholesale, email: 'carrefour@customer.com' },
    ],
    categories: [
      { name: 'Beverages' },
      { name: 'Dairy Products' },
    ],
    products: (cats: any, uns: any) => [
      { sku: 'PROD-JUICE', name: 'Apple Juice 250ml', categoryId: cats['Beverages'], unitId: uns['pcs'], salePrice: 15.00, standardCost: 8.00 },
      { sku: 'PROD-MILK', name: 'Full Cream Milk 1L', categoryId: cats['Dairy Products'], unitId: uns['pcs'], salePrice: 35.00, standardCost: 20.00 },
    ],
    materials: (supps: any, uns: any) => [
      { code: 'MAT-SUGAR', name: 'Refined White Sugar', supplierId: supps['Al-Hoda Raw Materials Co.'], unitId: uns['kg'], purchasePrice: 30.00 },
      { code: 'MAT-CONCENTRATE', name: 'Apple Juice Concentrate', supplierId: supps['Al-Hoda Raw Materials Co.'], unitId: uns['L'], purchasePrice: 150.00 },
      { code: 'MAT-CARTON', name: 'TetraPack Carton 250ml', supplierId: supps['Delta Packaging Solutions'], unitId: uns['pcs'], purchasePrice: 1.50 },
    ],
    boms: (prods: any, mats: any) => [
      {
        productId: prods['PROD-JUICE'],
        version: 'v1',
        outputQty: 1,
        wastagePct: 0.02,
        laborCost: 0.50,
        overheadCost: 0.30,
        lines: [
          { materialId: mats['MAT-SUGAR'], qtyPerOutput: 0.02, unitCost: 30.00 },
          { materialId: mats['MAT-CONCENTRATE'], qtyPerOutput: 0.05, unitCost: 150.00 },
          { materialId: mats['MAT-CARTON'], qtyPerOutput: 1.00, unitCost: 1.50 },
        ]
      },
      {
        productId: prods['PROD-MILK'],
        version: 'v1',
        outputQty: 1,
        wastagePct: 0.01,
        laborCost: 1.00,
        overheadCost: 0.50,
        lines: [
          { materialId: mats['MAT-CARTON'], qtyPerOutput: 1.00, unitCost: 1.50 },
        ]
      }
    ],
    budget: {
      year: 2025,
      name: 'FY2025 Annual Budget',
      monthlyValues: {
        '4000': 100000.00, // Revenue
        '5000': 55000.00,  // COGS
        '6100': 20000.00,  // Salaries
        '6000': 10000.00,  // Rent
      }
    },
    actual: {
      periodFrom: new Date('2025-01-01'),
      periodTo: new Date('2025-01-31'),
      lines: [
        { accountCode: '4000', amount: 120000.00, date: new Date('2025-01-15'), ref: 'REV-202501' },
        { accountCode: '5000', amount: 70000.00, date: new Date('2025-01-15'), ref: 'COGS-202501' },
        { accountCode: '6000', amount: 10000.00, date: new Date('2025-01-01'), ref: 'RENT-202501' },
        { accountCode: '6100', amount: 21500.00, date: new Date('2025-01-28'), ref: 'PAY-202501' },
      ]
    },
    forecast: {
      year: 2025,
      name: 'FY2025 Q1 rolling Forecast',
      lines: [
        { accountCode: '4000', month: 2, amount: 130000.00, driver: 'sales_growth', notes: 'Forecasted Feb Sales' },
        { accountCode: '5000', month: 2, amount: 80000.00, driver: 'rolling_avg', notes: 'Forecasted Feb COGS' },
        { accountCode: '4000', month: 3, amount: 135000.00, driver: 'sales_growth', notes: 'Forecasted March Sales' },
        { accountCode: '5000', month: 3, amount: 82000.00, driver: 'rolling_avg', notes: 'Forecasted March COGS' },
      ]
    },
    rates: [
      { from: 'EGP', to: 'USD', rate: 0.032 },
      { from: 'EGP', to: 'EUR', rate: 0.027 },
    ],
    headcount: (sts: any, ccs: any) => [
      { siteId: sts['Main Factory'], costCenterId: ccs['CC_PROD'], jobTitle: 'Production Worker', department: 'Production', headcount: 20, periodMonth: 1, basicSalary: 5000, allowances: 1000, socialInsurance: 500 },
      { siteId: sts['HQ Office'], costCenterId: ccs['CC_SALES'], jobTitle: 'Sales Representative', department: 'Sales', headcount: 5, periodMonth: 1, basicSalary: 8000, allowances: 1500, socialInsurance: 500 },
    ],
    production: (sts: any, prds: any) => [
      { siteId: sts['Main Factory'], productId: prds['PROD-JUICE'], month: 1, plannedQty: 10000, estimatedCost: 80000 },
      { siteId: sts['Main Factory'], productId: prds['PROD-JUICE'], month: 2, plannedQty: 10000, estimatedCost: 80000 },
      { siteId: sts['Main Factory'], productId: prds['PROD-MILK'], month: 1, plannedQty: 5000, estimatedCost: 100000 },
    ],
    inventory: (sts: any, prds: any, mats: any) => [
      { siteId: sts['Main Warehouse'], productId: prds['PROD-JUICE'], materialId: null, qtyOnHand: 2000, inventoryValue: 16000, date: new Date('2025-01-31') },
      { siteId: sts['Main Warehouse'], productId: prds['PROD-MILK'], materialId: null, qtyOnHand: 1500, inventoryValue: 30000, date: new Date('2025-01-31') },
      { siteId: sts['Main Warehouse'], productId: null, materialId: mats['MAT-SUGAR'], qtyOnHand: 100, inventoryValue: 3000, date: new Date('2025-01-31') },
    ],
    kpis: [
      { name: 'Revenue Target', category: KpiCategory.financial, target: 1200000, unit: null },
      { name: 'Gross Margin Target', category: KpiCategory.financial, target: 40, unit: '%' },
    ],
    rules: [
      { name: 'Budget Variance Alert', trigger: TriggerType.variance_pct, threshold: 10, accountCode: '4000', channel: 'system' },
    ],
    promotions: (prds: any) => [
      { name: 'Summer Juice Promo', productId: prds['PROD-JUICE'], discountPct: 15, discountAmt: null, startDate: new Date('2025-06-01'), endDate: new Date('2025-08-31'), budget: 15000 },
    ],
    matPrices: (mats: any) => [
      { materialId: mats['MAT-SUGAR'], price: 30.00, date: new Date('2025-01-01') },
      { materialId: mats['MAT-CONCENTRATE'], price: 150.00, date: new Date('2025-01-01') },
    ],
    tenantId: tenant.id,
    userId: user.id
  });

  // ============================================================
  // COMPANY 2: Delta Beverages Corp.
  // ============================================================
  console.log('\n--- Seeding Company 2: Delta Beverages Corp. ---');
  let company2 = await prisma.company.findFirst({
    where: { tenantId: tenant.id, name: 'Delta Beverages Corp.' },
  });
  if (!company2) {
    company2 = await prisma.company.create({
      data: {
        tenantId: tenant.id,
        name: 'Delta Beverages Corp.',
        legalName: 'Delta Beverages Corp. LLC',
        industryType: IndustryType.food_manufacturing,
        currencyCode: 'EGP',
        fiscalYearStartMonth: 1,
        taxNumber: 'TAX-11223344',
      },
    });
    console.log(`✅ Created Company 2: ID=${company2.id}, Name=${company2.name}`);
  } else {
    console.log(`ℹ️ Company 2 already exists: ID=${company2.id}`);
  }

  await seedCompanyData(company2.id, {
    sites: [
      { name: 'Delta Main Plant', type: SiteType.factory, region: 'Delta Region', address: 'Sadat City Industrial Zone' },
      { name: 'Mansoura DC', type: SiteType.warehouse, region: 'Mansoura', address: 'Mansoura Logistics Center' },
      { name: 'Cairo Cold Storage', type: SiteType.warehouse, region: 'Cairo', address: 'Obour City' },
    ],
    units: [
      { name: 'Kilogram', symbol: 'kg' },
      { name: 'Pieces', symbol: 'pcs' },
      { name: 'Liter', symbol: 'L' },
    ],
    accounts: [
      { code: '4000', name: 'Sales Revenue - Bottled Drinks', type: AccountType.revenue },
      { code: '5000', name: 'Raw Ingredients Cost', type: AccountType.expense },
      { code: '6000', name: 'Cost of Goods Sold', type: AccountType.cogs },
      { code: '7000', name: 'Salaries & Wages', type: AccountType.expense },
      { code: '1000', name: 'Inventory Asset', type: AccountType.asset },
      { code: '2000', name: 'Accounts Payable', type: AccountType.liability },
    ],
    costCenters: [
      { code: 'CC-PROD', name: 'Bottling Line', type: CostCenterType.production },
      { code: 'CC-SALES', name: 'Sales Distribution', type: CostCenterType.sales },
      { code: 'CC-ADMIN', name: 'General Administration', type: CostCenterType.admin },
    ],
    suppliers: [
      { name: 'Suez Sugar Refinery', phone: '01033333333', email: 'suez@sugar.com' },
      { name: 'Industrial Gases Egypt', phone: '01044444444', email: 'gases@egypt.com' },
    ],
    customers: [
      { code: 'CUST-001', name: 'Delta Beverage Distributor', customerType: CustomerType.wholesale, email: 'dist@delta.com' },
      { code: 'CUST-002', name: 'Port Said Retail Group', customerType: CustomerType.retail, email: 'portsaid@retail.com' },
    ],
    categories: [
      { name: 'Carbonated Drinks' },
      { name: 'Juices & Nectars' },
    ],
    products: (cats: any, uns: any) => [
      { sku: 'P001', name: 'Cola Drink 330ml', categoryId: cats['Carbonated Drinks'], unitId: uns['pcs'], salePrice: 5.00, standardCost: 2.80 },
      { sku: 'P002', name: 'Orange Juice 1L', categoryId: cats['Juices & Nectars'], unitId: uns['L'], salePrice: 18.00, standardCost: 11.00 },
    ],
    materials: (supps: any, uns: any) => [
      { code: 'M001', name: 'Sugar Syrup', supplierId: supps['Suez Sugar Refinery'], unitId: uns['kg'], purchasePrice: 2.10 },
      { code: 'M002', name: 'CO2 Gas', supplierId: supps['Industrial Gases Egypt'], unitId: uns['kg'], purchasePrice: 1.50 },
    ],
    boms: (prods: any, mats: any) => [
      {
        productId: prods['P001'],
        version: 'v1',
        outputQty: 2400,
        wastagePct: 0.01,
        laborCost: 200.00,
        overheadCost: 120.00,
        lines: [
          { materialId: mats['M001'], qtyPerOutput: 0.05, unitCost: 2.10 },
          { materialId: mats['M002'], qtyPerOutput: 0.003, unitCost: 1.50 },
        ]
      }
    ],
    budget: {
      year: 2025,
      name: 'FY2025 Annual Budget',
      monthlyValues: {
        '4000': 150000.00, // Revenue
        '5000': 85000.00,  // COGS
        '7000': 30000.00,  // Salaries
        '6000': 12000.00,  // Rent
      }
    },
    actual: {
      periodFrom: new Date('2025-01-01'),
      periodTo: new Date('2025-01-31'),
      lines: [
        { accountCode: '4000', amount: 165000.00, date: new Date('2025-01-15'), ref: 'REV-DELTA01' },
        { accountCode: '5000', amount: 92000.00, date: new Date('2025-01-15'), ref: 'COGS-DELTA01' },
        { accountCode: '6000', amount: 12000.00, date: new Date('2025-01-01'), ref: 'RENT-DELTA01' },
        { accountCode: '7000', amount: 31500.00, date: new Date('2025-01-28'), ref: 'PAY-DELTA01' },
      ]
    },
    forecast: {
      year: 2025,
      name: 'FY2025 Q1 rolling Forecast',
      lines: [
        { accountCode: '4000', month: 2, amount: 170000.00, driver: 'sales_growth', notes: 'Forecasted Feb Sales' },
        { accountCode: '5000', month: 2, amount: 95000.00, driver: 'rolling_avg', notes: 'Forecasted Feb COGS' },
        { accountCode: '4000', month: 3, amount: 175000.00, driver: 'sales_growth', notes: 'Forecasted March Sales' },
        { accountCode: '5000', month: 3, amount: 98000.00, driver: 'rolling_avg', notes: 'Forecasted March COGS' },
      ]
    },
    rates: [
      { from: 'EGP', to: 'USD', rate: 0.032 },
      { from: 'EGP', to: 'EUR', rate: 0.027 },
    ],
    headcount: (sts: any, ccs: any) => [
      { siteId: sts['Delta Main Plant'], costCenterId: ccs['CC-PROD'], jobTitle: 'Bottling Operator', department: 'Production', headcount: 15, periodMonth: 1, basicSalary: 4500, allowances: 800, socialInsurance: 450 },
      { siteId: sts['Mansoura DC'], costCenterId: ccs['CC-SALES'], jobTitle: 'Delivery Driver', department: 'Logistics', headcount: 8, periodMonth: 1, basicSalary: 5500, allowances: 1000, socialInsurance: 500 },
    ],
    production: (sts: any, prds: any) => [
      { siteId: sts['Delta Main Plant'], productId: prds['P001'], month: 1, plannedQty: 50000, estimatedCost: 140000 },
      { siteId: sts['Delta Main Plant'], productId: prds['P001'], month: 2, plannedQty: 50000, estimatedCost: 140000 },
    ],
    inventory: (sts: any, prds: any, mats: any) => [
      { siteId: sts['Cairo Cold Storage'], productId: prds['P001'], materialId: null, qtyOnHand: 12000, inventoryValue: 33600, date: new Date('2025-01-31') },
      { siteId: sts['Mansoura DC'], productId: null, materialId: mats['M001'], qtyOnHand: 500, inventoryValue: 1050, date: new Date('2025-01-31') },
    ],
    kpis: [
      { name: 'Revenue Target', category: KpiCategory.financial, target: 1800000, unit: null },
      { name: 'Gross Margin Target', category: KpiCategory.financial, target: 45, unit: '%' },
    ],
    rules: [
      { name: 'Budget Variance Alert', trigger: TriggerType.variance_pct, threshold: 10, accountCode: '4000', channel: 'system' },
    ],
    promotions: (prds: any) => [
      { name: 'Cola Summer Blast', productId: prds['P001'], discountPct: 10, discountAmt: null, startDate: new Date('2025-07-01'), endDate: new Date('2025-08-31'), budget: 25000 },
    ],
    matPrices: (mats: any) => [
      { materialId: mats['M001'], price: 2.10, date: new Date('2025-01-01') },
      { materialId: mats['M002'], price: 1.50, date: new Date('2025-01-01') },
    ],
    tenantId: tenant.id,
    userId: user.id
  });

  // ============================================================
  // 30. Seed Approvals, Notifications, and Audit Logs (Tenant level)
  // ============================================================
  console.log('\n--- Seeding Approvals, Notifications, and Audit Logs ---');
  
  // Seed Approvals
  const budgetCycle1 = await prisma.budgetCycle.findFirst({ where: { companyId: company1.id, name: 'FY2025 Annual Budget' } });
  const forecastCycle1 = await prisma.forecastCycle.findFirst({ where: { companyId: company1.id, name: 'FY2025 Q1 rolling Forecast' } });
  
  if (budgetCycle1) {
    const existing = await prisma.approval.findFirst({ where: { tenantId: tenant.id, entityType: 'BudgetCycle', entityId: budgetCycle1.id } });
    if (!existing) {
      await prisma.approval.create({
        data: {
          tenantId: tenant.id,
          entityType: 'BudgetCycle',
          entityId: budgetCycle1.id,
          stepOrder: 1,
          status: ApprovalStatus.approved,
          requestedBy: user.id,
          approvedBy: user.id,
          approvedAt: new Date(),
          comments: 'Annual budget cycle approved by administrator.',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      console.log('✅ Created Approval for Company 1 Budget Cycle');
    }
  }

  if (forecastCycle1) {
    const existing = await prisma.approval.findFirst({ where: { tenantId: tenant.id, entityType: 'ForecastCycle', entityId: forecastCycle1.id } });
    if (!existing) {
      await prisma.approval.create({
        data: {
          tenantId: tenant.id,
          entityType: 'ForecastCycle',
          entityId: forecastCycle1.id,
          stepOrder: 1,
          status: ApprovalStatus.approved,
          requestedBy: user.id,
          approvedBy: user.id,
          approvedAt: new Date(),
          comments: 'Forecast cycle approved by administrator.',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      console.log('✅ Created Approval for Company 1 Forecast Cycle');
    }
  }

  // Seed Notifications
  const rule1 = await prisma.notificationRule.findFirst({ where: { companyId: company1.id, ruleName: 'Budget Variance Alert' } });
  if (rule1) {
    const existing = await prisma.notification.findFirst({ where: { companyId: company1.id, title: 'Budget Variance Alert' } });
    if (!existing) {
      await prisma.notification.create({
        data: {
          ruleId: rule1.id,
          companyId: company1.id,
          userId: user.id,
          title: 'Budget Variance Alert',
          body: 'Actual expenses for Salaries Expense exceeded the budget by 7.5% in January 2025.',
          channel: NotificationChannel.system,
          entityType: 'ActualImport',
          entityId: 1n, // simulated ID
          status: NotificationStatus.read,
          sentAt: new Date(),
          readAt: new Date(),
        }
      });
      console.log('✅ Created system notification for Company 1');
    }
  }

  // Seed Audit Logs
  const existingAudit = await prisma.auditLog.findFirst({ where: { tenantId: tenant.id, action: 'login' } });
  if (!existingAudit) {
    await prisma.auditLog.createMany({
      data: [
        {
          tenantId: tenant.id,
          userId: user.id,
          entityType: 'User',
          entityId: user.id,
          action: 'login',
          oldValues: null,
          newValues: '{"email":"admin@idiibi.com","status":"active"}',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          createdAt: new Date(),
        },
        {
          tenantId: tenant.id,
          userId: user.id,
          entityType: 'BudgetCycle',
          entityId: budgetCycle1?.id || 1n,
          action: 'approve',
          oldValues: '{"status":"submitted"}',
          newValues: '{"status":"approved"}',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          createdAt: new Date(),
        }
      ]
    });
    console.log('✅ Seeded 2 Audit Logs');
  }

  console.log('\n========================================');
  console.log('🎉 Comprehensive seed completed successfully!');
  console.log('  Use these credentials to log in:\n');
  console.log(`  Tenant ID (slug):  ${tenant.slug} (Numeric ID: ${tenant.id})`);
  console.log(`  Company 1 ID:      ${company1.id} (${company1.name})`);
  console.log(`  Company 2 ID:      ${company2.id} (${company2.name})`);
  console.log(`  Email:             ${email}`);
  console.log(`  Password:          ${password}`);
  console.log('========================================\n');
}

async function seedCompanyData(companyId: bigint, data: any) {
  const companySelector = { companyId };

  // 1. Sites
  const sites: any = {};
  for (const s of data.sites) {
    let site = await prisma.site.findFirst({
      where: { companyId, name: s.name },
    });
    if (!site) {
      site = await prisma.site.create({
        data: {
          companyId,
          name: s.name,
          type: s.type,
          region: s.region,
          address: s.address,
          status: SiteStatus.active,
        },
      });
      console.log(`  ✅ Created Site: ${site.name}`);
    }
    sites[s.name] = site.id;
  }

  // 2. Units
  const units: any = {};
  for (const u of data.units) {
    let unit = await prisma.unit.findFirst({
      where: { companyId, symbol: u.symbol },
    });
    if (!unit) {
      unit = await prisma.unit.create({
        data: {
          companyId,
          name: u.name,
          symbol: u.symbol,
        },
      });
      console.log(`  ✅ Created Unit: ${unit.symbol}`);
    }
    units[u.symbol] = unit.id;
  }

  // 3. Accounts
  const accounts: any = {};
  for (const a of data.accounts) {
    let account = await prisma.account.findUnique({
      where: { companyId_code: { companyId, code: a.code } },
    });
    if (!account) {
      account = await prisma.account.create({
        data: {
          companyId,
          code: a.code,
          name: a.name,
          type: a.type,
          isActive: true,
        },
      });
      console.log(`  ✅ Created Account: ${account.code} - ${account.name}`);
    }
    accounts[a.code] = account.id;
  }

  // 4. Cost Centers
  const costCenters: any = {};
  for (const cc of data.costCenters) {
    let costCenter = await prisma.costCenter.findFirst({
      where: { companyId, code: cc.code },
    });
    if (!costCenter) {
      costCenter = await prisma.costCenter.create({
        data: {
          companyId,
          code: cc.code,
          name: cc.name,
          type: cc.type,
        },
      });
      console.log(`  ✅ Created Cost Center: ${costCenter.code}`);
    }
    costCenters[cc.code] = costCenter.id;
  }

  // 5. Suppliers
  const suppliers: any = {};
  for (const s of data.suppliers) {
    let supplier = await prisma.supplier.findFirst({
      where: { companyId, name: s.name },
    });
    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: {
          companyId,
          name: s.name,
          phone: s.phone,
          email: s.email,
        },
      });
      console.log(`  ✅ Created Supplier: ${supplier.name}`);
    }
    suppliers[s.name] = supplier.id;
  }

  // 6. Customers
  const customers: any = {};
  for (const c of data.customers) {
    let customer = await prisma.customer.findUnique({
      where: { companyId_code: { companyId, code: c.code } },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          companyId,
          code: c.code,
          name: c.name,
          customerType: c.customerType,
          email: c.email,
          isActive: true,
        },
      });
      console.log(`  ✅ Created Customer: ${customer.code}`);
    }
    customers[c.code] = customer.id;
  }

  // 7. Categories
  const categories: any = {};
  for (const cat of data.categories) {
    let category = await prisma.productCategory.findFirst({
      where: { companyId, name: cat.name },
    });
    if (!category) {
      category = await prisma.productCategory.create({
        data: {
          companyId,
          name: cat.name,
        },
      });
      console.log(`  ✅ Created Product Category: ${category.name}`);
    }
    categories[cat.name] = category.id;
  }

  // 8. Products
  const products: any = {};
  const productsToSeed = data.products(categories, units);
  for (const p of productsToSeed) {
    let product = await prisma.product.findUnique({
      where: { companyId_sku: { companyId, sku: p.sku } },
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          companyId,
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
      console.log(`  ✅ Created Product: ${product.sku}`);
    }
    products[p.sku] = product.id;
  }

  // 9. Materials
  const materials: any = {};
  const materialsToSeed = data.materials(suppliers, units);
  for (const m of materialsToSeed) {
    let material = await prisma.material.findUnique({
      where: { companyId_code: { companyId, code: m.code } },
    });
    if (!material) {
      material = await prisma.material.create({
        data: {
          companyId,
          code: m.code,
          name: m.name,
          supplierId: m.supplierId,
          unitId: m.unitId,
          purchasePrice: m.purchasePrice,
          isActive: true,
        },
      });
      console.log(`  ✅ Created Material: ${material.code}`);
    }
    materials[m.code] = material.id;
  }

  // 10. BOM Recipes
  const bomsToSeed = data.boms(products, materials);
  for (const bom of bomsToSeed) {
    let recipe = await prisma.bomRecipe.findFirst({
      where: { companyId, productId: bom.productId, version: bom.version },
    });
    if (!recipe) {
      recipe = await prisma.bomRecipe.create({
        data: {
          companyId,
          productId: bom.productId,
          version: bom.version,
          outputQty: bom.outputQty,
          wastagePct: bom.wastagePct,
          laborCost: bom.laborCost,
          overheadCost: bom.overheadCost,
          isActive: true,
        },
      });
      console.log(`  ✅ Created BOM Recipe for product ID: ${bom.productId}`);

      for (const line of bom.lines) {
        await prisma.bomLine.create({
          data: {
            bomId: recipe.id,
            materialId: line.materialId,
            qtyPerOutput: line.qtyPerOutput,
            unitCost: line.unitCost,
          }
        });
      }
      console.log(`    Added lines to BOM Recipe.`);
    }
  }

  // 11. Budget Cycle + Budget Lines
  let budgetCycle = await prisma.budgetCycle.findFirst({
    where: { companyId, fiscalYear: data.budget.year, name: data.budget.name },
  });
  if (!budgetCycle) {
    budgetCycle = await prisma.budgetCycle.create({
      data: {
        companyId,
        name: data.budget.name,
        fiscalYear: data.budget.year,
        periodType: PeriodType.annual,
        status: CycleStatus.approved,
        createdBy: data.userId,
        approvedBy: data.userId,
        approvedAt: new Date(),
      },
    });
    console.log(`  ✅ Created Budget Cycle: ${budgetCycle.name}`);

    const lines = [];
    const accountsInDb = Object.keys(data.budget.monthlyValues);
    for (let month = 1; month <= 12; month++) {
      for (const code of accountsInDb) {
        const accountId = accounts[code];
        if (accountId) {
          lines.push({
            budgetCycleId: budgetCycle.id,
            accountId: accountId,
            periodMonth: month,
            amount: data.budget.monthlyValues[code],
            notes: `Projected standard value for ${code} month ${month}`,
          });
        }
      }
    }
    await prisma.budgetLine.createMany({ data: lines });
    console.log(`    Seeded ${lines.length} Budget Lines`);
  }

  // 12. Actual Import + Actual Lines
  let actualImport = await prisma.actualImport.findFirst({
    where: { companyId, sourceSystem: ImportSourceSystem.excel, importType: ImportType.gl, status: ImportStatus.posted },
  });
  if (!actualImport) {
    actualImport = await prisma.actualImport.create({
      data: {
        companyId,
        sourceSystem: ImportSourceSystem.excel,
        importType: ImportType.gl,
        periodFrom: data.actual.periodFrom,
        periodTo: data.actual.periodTo,
        status: ImportStatus.posted,
        importedBy: data.userId,
      },
    });
    console.log(`  ` + `✅ Created Actual Import: ID=${actualImport.id}`);

    const linesToInsert = data.actual.lines.map((l: any) => ({
      actualImportId: actualImport!.id,
      accountId: accounts[l.accountCode],
      transactionDate: l.date,
      amount: l.amount,
      referenceNo: l.ref,
    })).filter((l: any) => l.accountId !== undefined);

    await prisma.actualLine.createMany({ data: linesToInsert });
    console.log(`    Seeded ${linesToInsert.length} Actual Lines`);
  }

  // 13. Scenarios
  const baseScenario = await prisma.scenario.findFirst({
    where: { companyId, scenarioType: ScenarioType.base },
  });
  let scenarioId = baseScenario?.id;
  if (!baseScenario) {
    const sc = await prisma.scenario.create({
      data: {
        companyId,
        name: 'Base Scenario',
        scenarioType: ScenarioType.base,
        assumptionsJson: JSON.stringify({ material_price_growth: 0.05, sales_volume_growth: 0.10 }),
        createdBy: data.userId,
      }
    });
    console.log(`  ` + `✅ Created Scenario: ${sc.name}`);
    scenarioId = sc.id;
  }

  // 14. Forecast Cycle + Forecast Lines
  let forecastCycle = await prisma.forecastCycle.findFirst({
    where: { companyId, fiscalYear: data.forecast.year, name: data.forecast.name },
  });
  if (!forecastCycle && scenarioId) {
    forecastCycle = await prisma.forecastCycle.create({
      data: {
        companyId,
        scenarioId: scenarioId,
        name: data.forecast.name,
        fiscalYear: data.forecast.year,
        basePeriod: data.actual.periodTo,
        method: ForecastMethod.rolling,
        status: CycleStatus.approved,
        createdBy: data.userId,
        approvedBy: data.userId,
        approvedAt: new Date(),
      },
    });
    console.log(`  ` + `✅ Created Forecast Cycle: ${forecastCycle.name}`);

    const fLines = data.forecast.lines.map((l: any) => ({
      forecastCycleId: forecastCycle!.id,
      accountId: accounts[l.accountCode],
      periodMonth: l.month,
      amount: l.amount,
      driverType: l.driver,
      notes: l.notes,
    })).filter((l: any) => l.accountId !== undefined);

    await prisma.forecastLine.createMany({ data: fLines });
    console.log(`    Seeded ${fLines.length} Forecast Lines`);
  }

  // 15. Exchange Rates
  for (const r of data.rates) {
    let rate = await prisma.exchangeRate.findFirst({
      where: { companyId, fromCurrency: r.from, toCurrency: r.to, rateDate: new Date('2025-01-01') },
    });
    if (!rate) {
      rate = await prisma.exchangeRate.create({
        data: {
          companyId,
          fromCurrency: r.from,
          toCurrency: r.to,
          rate: r.rate,
          rateDate: new Date('2025-01-01'),
          source: RateSource.manual,
          createdBy: data.userId,
        },
      });
      console.log(`  ✅ Created Exchange Rate: ${r.from} -> ${r.to}`);
    }
  }

  // 16. Headcount Plans
  const headcountToSeed = data.headcount(sites, costCenters);
  for (const hc of headcountToSeed) {
    let existing = await prisma.headcountPlan.findFirst({
      where: { budgetCycleId: budgetCycle.id, siteId: hc.siteId, costCenterId: hc.costCenterId, periodMonth: hc.periodMonth, jobTitle: hc.jobTitle },
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
      console.log(`  ✅ Created Headcount Plan: ${hc.jobTitle}`);
    }
  }

  // 17. Production Plans
  const prodToSeed = data.production(sites, products);
  for (const pp of prodToSeed) {
    let existing = await prisma.productionPlan.findFirst({
      where: { companyId, siteId: pp.siteId, productId: pp.productId, fiscalYear: data.budget.year, periodMonth: pp.month },
    });
    if (!existing) {
      await prisma.productionPlan.create({
        data: {
          companyId,
          siteId: pp.siteId,
          productId: pp.productId,
          planSource: PlanSource.manual,
          fiscalYear: data.budget.year,
          periodMonth: pp.month,
          plannedQty: pp.plannedQty,
          estimatedCost: pp.estimatedCost,
        },
      });
      console.log(`  ✅ Created Production Plan for Product ID: ${pp.productId}`);
    }
  }

  // 18. Inventory Snapshots
  const invToSeed = data.inventory(sites, products, materials);
  for (const inv of invToSeed) {
    let existing = await prisma.inventorySnapshot.findFirst({
      where: { companyId, siteId: inv.siteId, productId: inv.productId, materialId: inv.materialId, snapshotDate: inv.date },
    });
    if (!existing) {
      await prisma.inventorySnapshot.create({
        data: {
          companyId,
          siteId: inv.siteId,
          productId: inv.productId,
          materialId: inv.materialId,
          snapshotDate: inv.date,
          qtyOnHand: inv.qtyOnHand,
          inventoryValue: inv.inventoryValue,
        },
      });
      console.log(`  ✅ Created Inventory Snapshot for site ID: ${inv.siteId}`);
    }
  }

  // 19. KPI Targets
  for (const kpi of data.kpis) {
    let existing = await prisma.kpiTarget.findFirst({
      where: { companyId, kpiName: kpi.name, fiscalYear: data.budget.year },
    });
    if (!existing) {
      await prisma.kpiTarget.create({
        data: {
          companyId,
          kpiName: kpi.name,
          kpiCategory: kpi.category,
          fiscalYear: data.budget.year,
          targetValue: kpi.target,
          unit: kpi.unit,
          createdBy: data.userId,
        },
      });
      console.log(`  ✅ Created KPI Target: ${kpi.name}`);
    }
  }

  // 20. Notification Rules
  for (const rule of data.rules) {
    let existing = await prisma.notificationRule.findFirst({
      where: { companyId, ruleName: rule.name },
    });
    if (!existing) {
      await prisma.notificationRule.create({
        data: {
          companyId,
          ruleName: rule.name,
          triggerType: rule.trigger,
          thresholdValue: rule.threshold,
          accountId: accounts[rule.accountCode],
          channel: rule.channel,
          createdBy: data.userId,
        },
      });
      console.log(`  ✅ Created Notification Rule: ${rule.name}`);
    }
  }

  // 21. Promotions
  const promoToSeed = data.promotions(products);
  for (const promo of promoToSeed) {
    let existing = await prisma.promotion.findFirst({
      where: { companyId, name: promo.name },
    });
    if (!existing) {
      await prisma.promotion.create({
        data: {
          companyId,
          name: promo.name,
          productId: promo.productId,
          discountPct: promo.discountPct,
          discountAmt: promo.discountAmt,
          startDate: promo.startDate,
          endDate: promo.endDate,
          budgetAmt: promo.budget,
          createdBy: data.userId,
        },
      });
      console.log(`  ✅ Created Promotion: ${promo.name}`);
    }
  }

  // 22. Raw Material Prices
  const pricesToSeed = data.matPrices(materials);
  for (const rmp of pricesToSeed) {
    let existing = await prisma.rawMaterialPrice.findFirst({
      where: { companyId, materialId: rmp.materialId, priceDate: rmp.date },
    });
    if (!existing) {
      await prisma.rawMaterialPrice.create({
        data: {
          companyId,
          materialId: rmp.materialId,
          price: rmp.price,
          priceDate: rmp.date,
          source: 'manual',
        },
      });
      console.log(`  ✅ Created Raw Material Price for material ID: ${rmp.materialId}`);
    }
  }

  // 23. Integration Connection & Import Mappings (Oracle Mock / Direct Setup)
  let connection = await prisma.integrationConnection.findFirst({
    where: { companyId, name: 'Oracle UAT Source' },
  });
  if (!connection) {
    connection = await prisma.integrationConnection.create({
      data: {
        companyId,
        name: 'Oracle UAT Source',
        connectionType: ConnectionType.oracle,
        host: 'mock',
        port: 1521,
        databaseName: 'FREEPDB1',
        username: 'fpuat',
        passwordEnc: encrypt('FpUat123'),
        syncSchedule: SyncSchedule.manual,
        isActive: true,
        createdBy: data.userId,
      }
    });
    console.log(`  ✅ Created Integration Connection: ${connection.name}`);
  }

  // Seed Import Mappings
  const mappingsToSeed = [
    { name: 'Oracle Sales Mapping', type: ImportType.sales },
    { name: 'Oracle Expenses Mapping', type: ImportType.expenses },
    { name: 'Oracle GL Actuals Mapping', type: ImportType.gl },
  ];

  for (const m of mappingsToSeed) {
    let existingMap = await prisma.importMapping.findFirst({
      where: { companyId, name: m.name },
    });
    if (!existingMap) {
      const config = {
        accountCode: 'Account Code',
        amount: 'Amount',
        transactionDate: 'Date',
        quantity: 'Quantity',
        unitPrice: 'Unit Price',
        referenceNo: 'Reference',
        productSku: 'Product SKU',
        customerCode: 'Customer Code',
        siteCode: 'Site Code',
      };
      await prisma.importMapping.create({
        data: {
          companyId,
          connectionId: connection.id,
          name: m.name,
          sourceSystem: ImportSourceSystem.oracle,
          importType: m.type,
          mappingConfig: JSON.stringify(config),
          isDefault: true,
          isActive: true,
          createdBy: data.userId,
        }
      });
      console.log(`  ✅ Created Import Mapping: ${m.name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e.message ?? e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
