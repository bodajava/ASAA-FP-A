import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

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
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

async function main() {
  console.log('Resetting business data...');

  // Delete in order respecting foreign key constraints
  await prisma.auditLog.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationRule.deleteMany();

  // Import jobs
  await prisma.importJobLine.deleteMany();
  await prisma.importJob.deleteMany();

  // Production & inventory
  await prisma.productionPlan.deleteMany();
  await prisma.productionCostAllocation.deleteMany();
  await prisma.inventorySnapshot.deleteMany();
  await prisma.productCostSnapshot.deleteMany();

  // Pricing
  await prisma.rawMaterialPrice.deleteMany();

  // Actuals
  await prisma.actualLine.deleteMany();
  await prisma.actualImport.deleteMany();

  // BOM
  await prisma.bomLine.deleteMany();
  await prisma.bomRecipe.deleteMany();

  // Forecast
  await prisma.forecastAccuracyLog.deleteMany();
  await prisma.forecastLine.deleteMany();
  await prisma.forecastCycle.deleteMany();
  await prisma.seasonalIndex.deleteMany();

  // Budget & headcount
  await prisma.budgetLine.deleteMany();
  await prisma.budgetCycle.deleteMany();
  await prisma.headcountPlan.deleteMany();

  // Scenarios
  await prisma.scenario.deleteMany();
  await prisma.costDriver.deleteMany();

  // Exchange rates
  await prisma.exchangeRate.deleteMany();

  // Promotions
  await prisma.promotion.deleteMany();

  // Integrations
  await prisma.importMapping.deleteMany();
  await prisma.integrationConnection.deleteMany();

  // KPI targets
  await prisma.kpiTarget.deleteMany();

  // Master data (preserve: Company, Tenant, User, Role, Plan, Subscription)
  await prisma.material.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.costCenter.deleteMany();
  await prisma.account.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.site.deleteMany();

  console.log('Business data reset complete.');
  console.log('Preserved: tenant, company, admin user, role, plan');
}

main()
  .catch((e) => {
    console.error('Reset failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
