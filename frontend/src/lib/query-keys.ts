/**
 * Shared query keys for consistent cache management across the app.
 * Use these in useQuery, useMutation, queryClient.invalidateQueries, etc.
 *
 * Pattern: queryKeys.{resource}.list({ page, search, companyId })
 *          queryKeys.{resource}.detail(id)
 *          queryKeys.{resource}.all (wildcard)
 */
export const queryKeys = {
  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    kpis: (companyId: string) => ['dashboard', 'kpis', companyId] as const,
    revenue: (companyId: string, year: number) => ['dashboard', 'revenue', companyId, year] as const,
    topProducts: (companyId: string, year: number) => ['dashboard', 'top-products', companyId, year] as const,
    topCustomers: (companyId: string, year: number) => ['dashboard', 'top-customers', companyId, year] as const,
    utilization: (companyId: string, year: number) => ['dashboard', 'utilization', companyId, year] as const,
  },

  // Master data lists (small, refetched often)
  accounts: {
    all: ['accounts'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['accounts', 'list', companyId, params] as const,
  },
  materials: {
    all: ['materials'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['materials', 'list', companyId, params] as const,
  },
  products: {
    all: ['products'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['products', 'list', companyId, params] as const,
  },
  suppliers: {
    all: ['suppliers'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['suppliers', 'list', companyId, params] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['customers', 'list', companyId, params] as const,
  },
  sites: {
    all: ['sites'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['sites', 'list', companyId, params] as const,
  },
  units: {
    all: ['units'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['units', 'list', companyId, params] as const,
  },
  costCenters: {
    all: ['cost-centers'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['cost-centers', 'list', companyId, params] as const,
  },
  productCategories: {
    all: ['product-categories'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['product-categories', 'list', companyId, params] as const,
  },
  bomRecipes: {
    all: ['bom-recipes'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['bom-recipes', 'list', companyId, params] as const,
  },

  // Planning
  budgets: {
    all: ['budgets'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['budgets', 'list', companyId, params] as const,
    detail: (companyId: string, id: string) => ['budgets', 'detail', companyId, id] as const,
  },
  forecasts: {
    all: ['forecasts'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['forecasts', 'list', companyId, params] as const,
    detail: (companyId: string, id: string) => ['forecasts', 'detail', companyId, id] as const,
  },
  scenarios: {
    all: ['scenarios'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['scenarios', 'list', companyId, params] as const,
  },
  headcountPlans: {
    all: ['headcount-plans'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['headcount-plans', 'list', companyId, params] as const,
  },
  productionPlanning: {
    all: ['production-planning'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['production-planning', 'list', companyId, params] as const,
  },

  // Operations
  inventory: {
    all: ['inventory'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['inventory', 'list', companyId, params] as const,
  },
  approvals: {
    all: ['approvals'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['approvals', 'list', companyId, params] as const,
  },
  promotions: {
    all: ['promotions'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['promotions', 'list', companyId, params] as const,
  },
  rawMaterialPrices: {
    all: ['raw-material-prices'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['raw-material-prices', 'list', companyId, params] as const,
  },

  // Data & Integrations
  actuals: {
    all: ['actuals'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['actuals', 'list', companyId, params] as const,
  },
  integrations: {
    all: ['integrations'] as const,
    list: (companyId: string) => ['integrations', 'list', companyId] as const,
  },
  exchangeRates: {
    all: ['exchange-rates'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['exchange-rates', 'list', companyId, params] as const,
  },

  // Reports
  reports: {
    all: ['reports'] as const,
  },
  variance: {
    all: ['variance'] as const,
  },

  // System
  users: {
    all: ['users'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['users', 'list', companyId, params] as const,
  },
  companies: {
    all: ['companies'] as const,
    list: () => ['companies', 'list'] as const,
  },
  kpiTargets: {
    all: ['kpi-targets'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['kpi-targets', 'list', companyId, params] as const,
  },
  notificationRules: {
    all: ['notification-rules'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['notification-rules', 'list', companyId, params] as const,
  },
  auditLogs: {
    all: ['audit-logs'] as const,
    list: (companyId: string, params?: Record<string, string>) => ['audit-logs', 'list', companyId, params] as const,
  },
} as const;
