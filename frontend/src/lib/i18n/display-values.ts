import type { TranslationKey } from './translations';

// ---------------------------------------------------------------------------
// Centralised helpers for translating API / database display values
// All mapped through t(key) so they respect the active locale.
// ---------------------------------------------------------------------------

/**
 * Translate a status value (active/inactive/pending/approved/rejected etc.)
 */
export function translateStatus(status: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    active: 'common.active',
    inactive: 'common.inactive',
    pending: 'common.pending',
    approved: 'common.approved',
    rejected: 'common.rejected',
    draft: 'common.draft',
    submitted: 'common.submitted',
    completed: 'common.completed',
    cancelled: 'common.cancelled',
    changeable: 'page.notificationRules.changeable',
  };
  return map[status.toLowerCase()] ?? ('common.' + status.toLowerCase() as TranslationKey);
}

/**
 * Translate a generic type value
 */
export function translateType(type: string, context?: string): TranslationKey {
  const key = context ? `${context}.${type}` : `type.${type}`;
  return key as TranslationKey;
}

/**
 * Translate an action (create/edit/delete/approve/reject)
 */
export function translateAction(action: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    create: 'common.create',
    update: 'common.update',
    delete: 'common.delete',
    approve: 'common.approve',
    reject: 'common.reject',
    submit: 'common.submit',
    cancel: 'common.cancel',
    restore: 'common.restore',
    login: 'common.login',
    logout: 'common.logout',
  };
  return map[action.toLowerCase()] ?? ('action.' + action.toLowerCase() as TranslationKey);
}

/**
 * Translate known entity/table names for audit logs etc.
 */
export function translateEntity(entity: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    company: 'nav.companies',
    site: 'nav.sites',
    unit: 'nav.units',
    account: 'nav.accounts',
    cost_center: 'nav.costCenters',
    'cost-center': 'nav.costCenters',
    costCenter: 'nav.costCenters',
    product_category: 'nav.productCategories',
    'product-category': 'nav.productCategories',
    productCategory: 'nav.productCategories',
    supplier: 'nav.suppliers',
    customer: 'nav.customers',
    product: 'nav.products',
    material: 'nav.materials',
    bom_recipe: 'nav.bomRecipes',
    'bom-recipe': 'nav.bomRecipes',
    bomRecipe: 'nav.bomRecipes',
    kpi_target: 'nav.kpiTargets',
    'kpi-target': 'nav.kpiTargets',
    kpiTarget: 'nav.kpiTargets',
    notification_rule: 'nav.notificationRules',
    'notification-rule': 'nav.notificationRules',
    notificationRule: 'nav.notificationRules',
    user: 'nav.users',
    role: 'common.role',
    permission: 'common.permission',
    import_log: 'nav.actualImports',
    'import-log': 'nav.actualImports',
    importLog: 'nav.actualImports',
    company_site: 'nav.sites',
    'company-site': 'nav.sites',
    companySite: 'nav.sites',
  };
  return map[entity.toLowerCase()] ?? ('entity.' + entity.toLowerCase() as TranslationKey);
}

/**
 * Translate notification titles/bodies
 */
export function translateNotificationTitle(title: string): string {
  const map: Record<string, string> = {
    'Budget Threshold Exceeded': 'budgetThresholdExceeded',
    'Spending Alert': 'spendingAlert',
    'Approval Required': 'approvalRequired',
    'New Report Available': 'newReportAvailable',
    'USD Rate Increase Alert': 'usdRateIncrease',
    'Scenario Triggered': 'scenarioTriggered',
  };
  const tKey = map[title];
  return tKey ? `notification.${tKey}` : title;
}

export function translateNotificationBody(body: string): string {
  const map: Record<string, string> = {
    'A budget threshold has been exceeded': 'budgetThresholdBody',
    'Unusual spending detected': 'spendingBody',
    'Your approval is needed': 'approvalBody',
    'A new report is ready': 'newReportBody',
  };
  const tKey = map[body];
  return tKey ? `notification.${tKey}` : body;
}

/**
 * Translate connection/system types
 */
export function translateConnectionType(type: string): TranslationKey {
  return `connectionType.${type}` as TranslationKey;
}

export function translateSourceSystem(system: string): TranslationKey {
  return `sourceSystem.${system}` as TranslationKey;
}

export function translateAccountType(acctType: string): string {
  return `accountType.${acctType.replace(/[^a-zA-Z0-9]/g, '')}`;
}

export function translateForecastMethod(method: string): TranslationKey {
  return `forecastMethod.${method}` as TranslationKey;
}

export function translateScenarioType(scenarioType: string): TranslationKey {
  return `scenarioType.${scenarioType}` as TranslationKey;
}

export function translateImportType(importType: string): TranslationKey {
  return `importType.${importType}` as TranslationKey;
}
