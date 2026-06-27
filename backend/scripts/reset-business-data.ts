/**
 * Reset business data — keeps only records required for login.
 *
 * Usage:
 *   node --env-file=.env -r ts-node/register -r tsconfig-paths/register scripts/reset-business-data.ts --confirm-reset
 *
 * Safe:
 *   - Idempotent: running twice does not fail
 *   - Never deletes admin user / role / tenant / company / plan
 *   - Prints counts before and after
 *   - Requires --confirm-reset flag
 */

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

/* ────────────────────────────────────────────────────────────────────────────
 *  Tables to delete (child-first order, matches schema FK relationships).
 *  Tables with `onDelete: Cascade` from parent will also be caught, but we
 *  list children explicitly for clarity and to avoid silent failures.
 * ──────────────────────────────────────────────────────────────────────────── */
const DELETE_ORDER: Array<{ model: keyof PrismaClient; label: string }> = [
  // Leaf children
  { model: 'importJobLine',            label: 'import_job_lines' },
  { model: 'alert',                    label: 'alerts' },
  { model: 'notification',             label: 'notifications' },
  { model: 'auditLog',                 label: 'audit_logs' },
  { model: 'approval',                 label: 'approvals' },

  // Costing
  { model: 'productCostSnapshot',      label: 'product_cost_snapshots' },
  { model: 'productionCostAllocation', label: 'production_cost_allocations' },
  { model: 'costDriver',               label: 'cost_drivers' },

  // Forecast / Budget children
  { model: 'forecastAccuracyLog',      label: 'forecast_accuracy_logs' },
  { model: 'seasonalIndex',            label: 'seasonal_indices' },
  { model: 'rawMaterialPrice',         label: 'raw_material_prices' },
  { model: 'forecastLine',             label: 'forecast_lines' },
  { model: 'budgetLine',               label: 'budget_lines' },
  { model: 'headcountPlan',            label: 'headcount_plans' },

  // BOM
  { model: 'bomLine',                  label: 'bom_lines' },

  // Actuals
  { model: 'actualLine',               label: 'actual_lines' },
  { model: 'actualImport',             label: 'actual_imports' },

  // Operational children
  { model: 'inventorySnapshot',        label: 'inventory_snapshots' },
  { model: 'productionPlan',           label: 'production_plans' },
  { model: 'kpiTarget',                label: 'kpi_targets' },

  // Parent operational
  { model: 'forecastCycle',            label: 'forecast_cycles' },
  { model: 'budgetCycle',              label: 'budget_cycles' },
  { model: 'scenario',                 label: 'scenarios' },

  // Config children
  { model: 'notificationRule',         label: 'notification_rules' },
  { model: 'promotion',                label: 'promotions' },
  { model: 'exchangeRate',             label: 'exchange_rates' },

  // BOM / Products / Materials
  { model: 'bomRecipe',                label: 'bom_recipes' },
  { model: 'product',                  label: 'products' },
  { model: 'material',                 label: 'materials' },

  // Entities
  { model: 'customer',                 label: 'customers' },
  { model: 'supplier',                 label: 'suppliers' },
  { model: 'productCategory',          label: 'product_categories' },
  { model: 'costCenter',               label: 'cost_centers' },
  { model: 'account',                  label: 'accounts' },
  { model: 'unit',                     label: 'units' },
  { model: 'site',                     label: 'sites' },

  // Integration
  { model: 'importJob',                label: 'import_jobs' },
  { model: 'importMapping',            label: 'import_mappings' },
  { model: 'integrationConnection',    label: 'integration_connections' },
];

/* ────────────────────────────────────────────────────────────────────────────
 *  Records to KEEP (never delete these)
 * ──────────────────────────────────────────────────────────────────────────── */
const KEEP_TENANT_SLUG = 'idiibi-demo';
const KEEP_ADMIN_EMAIL = 'admin@idiibi.com';
const KEEP_ROLE_NAME = 'Super Admin';

async function getCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const { model, label } of DELETE_ORDER) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      counts[label] = await (prisma[model] as any).count();
    } catch {
      counts[label] = -1; // table may not exist
    }
  }
  // System tables
  counts['plans'] = await prisma.plan.count();
  counts['tenants'] = await prisma.tenant.count();
  counts['companies'] = await prisma.company.count();
  counts['roles'] = await prisma.role.count();
  counts['users'] = await prisma.user.count();
  counts['subscriptions'] = await prisma.subscription.count();
  return counts;
}

async function deleteInBatches(
  model: keyof PrismaClient,
  label: string,
  batchSize = 500,
): Promise<number> {
  let totalDeleted = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelDelegate = prisma[model] as any;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const ids: Array<{ id: unknown }> = await modelDelegate.findMany({
      select: { id: true },
      take: batchSize,
    });
    if (ids.length === 0) break;

    const idValues = ids.map((r) => r.id);
    const result = await modelDelegate.deleteMany({
      where: { id: { in: idValues } },
    });
    totalDeleted += result.count;
    process.stdout.write(`  ${label}: deleted ${totalDeleted}...\r`);
  }
  if (totalDeleted > 0) console.log(`  ${label}: deleted ${totalDeleted} total`);
  else console.log(`  ${label}: already empty`);
  return totalDeleted;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.includes('--confirm-reset')) {
    console.error('❌  Refusing to run without --confirm-reset flag.');
    console.error('   Usage: npm run reset:business-data');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('  BUSINESS DATA RESET');
  console.log('═══════════════════════════════════════════════════════\n');

  // ── Identify records to keep ──────────────────────────────────────────
  const tenant = await prisma.tenant.findFirst({ where: { slug: KEEP_TENANT_SLUG } });
  if (!tenant) {
    console.error(`❌  Tenant "${KEEP_TENANT_SLUG}" not found. Aborting.`);
    process.exit(1);
  }

  const company = await prisma.company.findFirst({
    where: { tenantId: tenant.id },
  });
  const role = await prisma.role.findFirst({
    where: { tenantId: tenant.id, name: KEEP_ROLE_NAME },
  });
  const adminUser = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email: KEEP_ADMIN_EMAIL },
  });

  console.log('Records to KEEP:');
  console.log(`  Tenant:  ${tenant.id} (${tenant.name})`);
  console.log(`  Company: ${company?.id ?? 'NOT FOUND'} (${company?.name ?? '-'})`);
  console.log(`  Role:    ${role?.id ?? 'NOT FOUND'} (${role?.name ?? '-'})`);
  console.log(`  User:    ${adminUser?.id ?? 'NOT FOUND'} (${adminUser?.email ?? '-'})`);
  console.log('');

  if (!company || !role || !adminUser) {
    console.error('❌  Missing required company/role/admin user. Run seed first, then reset.');
    process.exit(1);
  }

  // ── Counts before ─────────────────────────────────────────────────────
  console.log('── Counts BEFORE reset ──');
  const before = await getCounts();
  for (const [table, count] of Object.entries(before)) {
    console.log(`  ${table}: ${count}`);
  }
  console.log('');

  // ── Delete in batches ─────────────────────────────────────────────────
  console.log('── Deleting ──');
  let totalDeleted = 0;

  for (const { model, label } of DELETE_ORDER) {
    try {
      const deleted = await deleteInBatches(model, label);
      totalDeleted += deleted;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  WARN ${label}: ${msg}`);
    }
  }

  // ── Delete non-admin users (keep only admin) ──────────────────────────
  console.log('\n── Removing non-admin users ──');
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      id: { not: adminUser.id },
    },
  });
  console.log(`  users (non-admin): deleted ${deletedUsers.count}`);
  totalDeleted += deletedUsers.count;

  // ── Delete non-required roles (keep only Super Admin) ─────────────────
  console.log('── Removing non-admin roles ──');
  const deletedRoles = await prisma.role.deleteMany({
    where: {
      id: { not: role.id },
    },
  });
  console.log(`  roles (non-admin): deleted ${deletedRoles.count}`);
  totalDeleted += deletedRoles.count;

  // ── Delete non-required companies (keep only default) ─────────────────
  console.log('── Removing non-default companies ──');
  const deletedCompanies = await prisma.company.deleteMany({
    where: {
      id: { not: company.id },
    },
  });
  console.log(`  companies (non-default): deleted ${deletedCompanies.count}`);
  totalDeleted += deletedCompanies.count;

  // ── Delete non-required tenants (keep only iDiibi) ────────────────────
  console.log('── Removing non-default tenants ──');
  const deletedTenants = await prisma.tenant.deleteMany({
    where: {
      id: { not: tenant.id },
    },
  });
  console.log(`  tenants (non-default): deleted ${deletedTenants.count}`);
  totalDeleted += deletedTenants.count;

  // ── Delete subscriptions for non-admin tenant ──────────────────────────
  console.log('── Removing orphan subscriptions ──');
  const deletedSubs = await prisma.subscription.deleteMany({
    where: {
      tenantId: { not: tenant.id },
    },
  });
  console.log(`  subscriptions (orphan): deleted ${deletedSubs.count}`);
  totalDeleted += deletedSubs.count;

  // ── Counts after ──────────────────────────────────────────────────────
  console.log('\n── Counts AFTER reset ──');
  const after = await getCounts();
  for (const [table, count] of Object.entries(after)) {
    const beforeCount = before[table] ?? 0;
    const delta = beforeCount - count;
    console.log(`  ${table}: ${count}${delta > 0 ? ` (-${delta})` : ''}`);
  }

  // ── Verify admin login record ─────────────────────────────────────────
  const verifyUser = await prisma.user.findFirst({
    where: { email: KEEP_ADMIN_EMAIL, tenantId: tenant.id },
    select: { id: true, email: true, status: true, roleId: true },
  });
  const verifyRole = await prisma.role.findFirst({
    where: { id: verifyUser?.roleId ?? BigInt(0) },
    select: { id: true, name: true, permissions: true },
  });

  console.log('\n── Verification ──');
  console.log(`  Admin user:  ${verifyUser ? 'OK' : 'MISSING'} (${verifyUser?.email ?? '-'}, status=${verifyUser?.status ?? '-'})`);
  console.log(`  Admin role:  ${verifyRole ? 'OK' : 'MISSING'} (${verifyRole?.name ?? '-'})`);
  console.log(`  Tenant:      OK (${tenant.id})`);
  console.log(`  Company:     ${company ? 'OK' : 'MISSING'} (${company?.id ?? '-'})`);

  console.log(`\n✅ Reset complete. Total records deleted: ${totalDeleted}`);
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
