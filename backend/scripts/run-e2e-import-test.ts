import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ClientWorkbookImportService } from '../src/excel-integration/client-workbook-import.service';
import { PrismaService } from '../src/prisma.service';
import * as fs from 'fs';

async function getCounts(prisma: PrismaService) {
  const [
    companies,
    sites,
    units,
    products,
    materials,
    customers,
    suppliers,
    budgetLines,
    forecastLines,
    actualLines,
    productionPlans,
    exchangeRates,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.site.count(),
    prisma.unit.count(),
    prisma.product.count(),
    prisma.material.count(),
    prisma.customer.count(),
    prisma.supplier.count(),
    prisma.budgetLine.count(),
    prisma.forecastLine.count(),
    prisma.actualLine.count(),
    prisma.productionPlan.count(),
    prisma.exchangeRate.count(),
  ]);

  return {
    companies,
    sites,
    units,
    products,
    materials,
    customers,
    suppliers,
    budgetLines,
    forecastLines,
    actualLines,
    productionPlans,
    exchangeRates,
  };
}

async function resetDatabase(prisma: PrismaService) {
  console.log('Resetting database business data...');
  await prisma.rawMaterialPrice.deleteMany();
  await prisma.forecastLine.deleteMany();
  await prisma.budgetLine.deleteMany();
  await prisma.headcountPlan.deleteMany();
  await prisma.bomLine.deleteMany();
  await prisma.actualLine.deleteMany();
  await prisma.actualImport.deleteMany();
  await prisma.inventorySnapshot.deleteMany();
  await prisma.productionPlan.deleteMany();
  await prisma.kpiTarget.deleteMany();
  await prisma.forecastCycle.deleteMany();
  await prisma.budgetCycle.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.notificationRule.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.exchangeRate.deleteMany();
  await prisma.bomRecipe.deleteMany();
  await prisma.product.deleteMany();
  await prisma.material.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.costCenter.deleteMany();
  await prisma.account.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.site.deleteMany();
  console.log('Database reset complete.');
}

async function main() {
  console.log('Bootstrapping NestJS context...');
  let app: any;
  let prisma: PrismaService;
  let importService: ClientWorkbookImportService;

  // Retry loop for establishing database connection
  while (true) {
    try {
      if (app) await app.close();
      app = await NestFactory.createApplicationContext(AppModule);
      prisma = app.get(PrismaService);
      importService = app.get(ClientWorkbookImportService);
      
      // Test query
      await prisma.company.count();
      console.log('Successfully connected to database!');
      break;
    } catch (err: any) {
      console.warn(`Connection attempt failed: ${err.message || err}. Retrying in 15 seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }
  }

  // Get active company and user
  const company = await prisma.company.findFirst();
  const user = await prisma.user.findFirst();

  if (!company || !user) {
    console.error('Error: No company or user found in database.');
    await app.close();
    process.exit(1);
  }

  console.log(`Using Company: ${company.name} (${company.id})`);
  console.log(`Using User: ${user.email} (${user.id})`);

  // Clean data first so we start from zero
  await resetDatabase(prisma);

  console.log('\n--- Record Counts BEFORE Import ---');
  const before = await getCounts(prisma);
  console.log(JSON.stringify(before, null, 2));

  // File 1: Heavens Date Upload Test Workbook
  const heavensPath = '/Users/abdelrhmannounir/Desktop/Heavens_Date_Upload_Test_Workbook.xlsx';
  if (fs.existsSync(heavensPath)) {
    console.log(`\nImporting Heavens Date Workbook from ${heavensPath}...`);
    const heavensBuffer = fs.readFileSync(heavensPath);
    const heavensResult = await importService.importWorkbook(
      heavensBuffer,
      'Heavens_Date_Upload_Test_Workbook.xlsx',
      company.id,
      user.id,
    );

    console.log('Heavens Date Import Result:');
    console.log(`Success: ${heavensResult.success}`);
    console.log(`Sheets Processed: ${heavensResult.sheetsProcessed}`);
    console.log(`Sheets Imported: ${heavensResult.sheetsImported}`);
    console.log(`Sheets Skipped: ${heavensResult.sheetsSkipped}`);
    console.log('Totals per module:', heavensResult.totals);
    if (heavensResult.errors.length > 0) {
      console.error('Errors encountered:', heavensResult.errors.slice(0, 10));
      if (heavensResult.errors.length > 10) {
        console.log(`...and ${heavensResult.errors.length - 10} more errors`);
      }
    }
  } else {
    console.warn(`\nWarning: Heavens Date Workbook not found at ${heavensPath}, skipping.`);
  }

  // File 2: Bawadi Foods Upload Test Workbook (Downloads/Test 2.xlsx)
  const bawadiPath = '/Users/abdelrhmannounir/Downloads/Test 2.xlsx';
  if (fs.existsSync(bawadiPath)) {
    console.log(`\nImporting Bawadi Foods Workbook from ${bawadiPath}...`);
    const bawadiBuffer = fs.readFileSync(bawadiPath);
    const bawadiResult = await importService.importWorkbook(
      bawadiBuffer,
      'Bawadi_Foods_Upload_Test_Workbook.xlsx',
      company.id,
      user.id,
    );

    console.log('Bawadi Foods Import Result:');
    console.log(`Success: ${bawadiResult.success}`);
    console.log(`Sheets Processed: ${bawadiResult.sheetsProcessed}`);
    console.log(`Sheets Imported: ${bawadiResult.sheetsImported}`);
    console.log(`Sheets Skipped: ${bawadiResult.sheetsSkipped}`);
    console.log('Totals per module:', bawadiResult.totals);
    if (bawadiResult.errors.length > 0) {
      console.error('Errors encountered:', bawadiResult.errors.slice(0, 10));
      if (bawadiResult.errors.length > 10) {
        console.log(`...and ${bawadiResult.errors.length - 10} more errors`);
      }
    }
  } else {
    console.warn(`\nWarning: Bawadi Foods Workbook not found at ${bawadiPath}, skipping.`);
  }

  console.log('\n--- Record Counts AFTER Import ---');
  const after = await getCounts(prisma);
  console.log(JSON.stringify(after, null, 2));

  console.log('\n--- Net Inserted Counts ---');
  const diff: Record<string, number> = {};
  for (const [key, beforeVal] of Object.entries(before)) {
    const afterVal = after[key as keyof typeof after];
    diff[key] = afterVal - beforeVal;
  }
  console.log(JSON.stringify(diff, null, 2));

  await app.close();
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
