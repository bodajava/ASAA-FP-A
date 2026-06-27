/**
 * Backup business data via Prisma (no mysqldump needed).
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/backup-business-data.ts
 *
 * Output:
 *   prisma/backups/before-data-reset-YYYYMMDD-HHMMSS.json
 */

import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as fs from 'fs';
import * as path from 'path';

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

// All tables that contain business data (ordered by dependency — children first is irrelevant for read-only backup)
const TABLES: Array<{ model: keyof PrismaClient; label: string }> = [
  { model: 'importJobLine', label: 'import_job_lines' },
  { model: 'alert', label: 'alerts' },
  { model: 'notification', label: 'notifications' },
  { model: 'auditLog', label: 'audit_logs' },
  { model: 'approval', label: 'approvals' },
  { model: 'productCostSnapshot', label: 'product_cost_snapshots' },
  { model: 'productionCostAllocation', label: 'production_cost_allocations' },
  { model: 'costDriver', label: 'cost_drivers' },
  { model: 'forecastAccuracyLog', label: 'forecast_accuracy_logs' },
  { model: 'seasonalIndex', label: 'seasonal_indices' },
  { model: 'rawMaterialPrice', label: 'raw_material_prices' },
  { model: 'forecastLine', label: 'forecast_lines' },
  { model: 'budgetLine', label: 'budget_lines' },
  { model: 'headcountPlan', label: 'headcount_plans' },
  { model: 'bomLine', label: 'bom_lines' },
  { model: 'actualLine', label: 'actual_lines' },
  { model: 'actualImport', label: 'actual_imports' },
  { model: 'inventorySnapshot', label: 'inventory_snapshots' },
  { model: 'productionPlan', label: 'production_plans' },
  { model: 'kpiTarget', label: 'kpi_targets' },
  { model: 'forecastCycle', label: 'forecast_cycles' },
  { model: 'budgetCycle', label: 'budget_cycles' },
  { model: 'scenario', label: 'scenarios' },
  { model: 'notificationRule', label: 'notification_rules' },
  { model: 'promotion', label: 'promotions' },
  { model: 'exchangeRate', label: 'exchange_rates' },
  { model: 'bomRecipe', label: 'bom_recipes' },
  { model: 'product', label: 'products' },
  { model: 'material', label: 'materials' },
  { model: 'customer', label: 'customers' },
  { model: 'supplier', label: 'suppliers' },
  { model: 'productCategory', label: 'product_categories' },
  { model: 'costCenter', label: 'cost_centers' },
  { model: 'account', label: 'accounts' },
  { model: 'unit', label: 'units' },
  { model: 'site', label: 'sites' },
  { model: 'importJob', label: 'import_jobs' },
  { model: 'importMapping', label: 'import_mappings' },
  { model: 'integrationConnection', label: 'integration_connections' },
  { model: 'subscription', label: 'subscriptions' },
  { model: 'user', label: 'users' },
  { model: 'role', label: 'roles' },
  { model: 'company', label: 'companies' },
  { model: 'tenant', label: 'tenants' },
  { model: 'plan', label: 'plans' },
];

async function main() {
  console.log('=== Business Data Backup ===\n');

  const backup: Record<string, unknown[]> = {};
  let totalRows = 0;

  for (const { model, label } of TABLES) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await (prisma[model] as any).findMany();
      backup[label] = rows;
      totalRows += rows.length;
      console.log(`  ${label}: ${rows.length} rows`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  SKIP ${label}: ${msg}`);
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(__dirname, '..', 'prisma', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `before-data-reset-${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2));

  console.log(`\nBackup saved: ${backupFile}`);
  console.log(`Total rows backed up: ${totalRows}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
