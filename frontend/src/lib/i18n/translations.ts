export type Locale = 'en' | 'ar';

export type TranslationKey =
  | 'app.name'
  | 'app.tagline'
  /* ── Navigation ─────────────────────────────────────────────────────── */
  | 'nav.dashboard'
  | 'nav.planning'
  | 'nav.budgets'
  | 'nav.forecasts'
  | 'nav.scenarios'
  | 'nav.productionPlanning'
  | 'nav.headcountPlans'
  | 'nav.reportsAnalysis'
  | 'nav.reports'
  | 'nav.varianceAnalysis'
  | 'nav.operations'
  | 'nav.inventory'
  | 'nav.approvals'
  | 'nav.promotions'
  | 'nav.rawMaterialPrices'
  | 'nav.dataIntegrations'
  | 'nav.actualImports'
  | 'nav.connections'
  | 'nav.importMappings'
  | 'nav.exchangeRates'
  | 'nav.masterData'
  | 'nav.companies'
  | 'nav.sites'
  | 'nav.units'
  | 'nav.accounts'
  | 'nav.costCenters'
  | 'nav.productCategories'
  | 'nav.suppliers'
  | 'nav.customers'
  | 'nav.products'
  | 'nav.materials'
  | 'nav.bomRecipes'
  | 'nav.systemControl'
  | 'nav.kpiTargets'
  | 'nav.notificationRules'
  | 'nav.auditLogs'
  | 'nav.settings'
  | 'nav.users'
  | 'nav.overview'
  | 'nav.modules'
  | 'nav.notifications'
  | 'nav.approve'
  /* ── Common ──────────────────────────────────────────────────────────── */
  | 'common.search'
  | 'common.save'
  | 'common.cancel'
  | 'common.delete'
  | 'common.edit'
  | 'common.create'
  | 'common.update'
  | 'common.close'
  | 'common.confirm'
  | 'common.yes'
  | 'common.no'
  | 'common.loading'
  | 'common.error'
  | 'common.success'
  | 'common.retry'
  | 'common.noData'
  | 'common.noResults'
  | 'common.actions'
  | 'common.status'
  | 'common.name'
  | 'common.email'
  | 'common.phone'
  | 'common.type'
  | 'common.active'
  | 'common.inactive'
  | 'common.all'
  | 'common.filter'
  | 'common.clear'
  | 'common.export'
  | 'common.import'
  | 'common.download'
  | 'common.upload'
  | 'common.back'
  | 'common.next'
  | 'common.previous'
  | 'common.page'
  | 'common.of'
  | 'common.showing'
  | 'common.to'
  | 'common.entries'
  | 'common.total'
  | 'common.id'
  | 'common.code'
  | 'common.description'
  | 'common.notes'
  | 'common.date'
  | 'common.from'
  | 'common.selectCompany'
  | 'common.noCompany'
  | 'common.signOut'
  | 'common.signIn'
  | 'common.password'
  | 'common.tenantId'
  | 'common.tenantIdHint'
  | 'common.emailPlaceholder'
  | 'common.passwordPlaceholder'
  | 'common.language'
  | 'common.theme'
  | 'common.light'
  | 'common.dark'
  | 'common.system'
  | 'common.currency'
  | 'common.confirmDelete'
  | 'common.confirmDeleteMessage'
  | 'common.cancelDelete'
  | 'common.createdSuccess'
  | 'common.updatedSuccess'
  | 'common.deletedSuccess'
  | 'common.deleteFailed'
  | 'common.importSuccess'
  | 'common.required'
  | 'common.invalidEmail'
  | 'common.minLength'
  | 'common.installApp'
  | 'common.installAppDescription'
  | 'common.install'
  | 'common.notNow'
  | 'common.records'
  | 'common.importFrom'
  | 'common.exportTo'
  | 'common.viewDetails'
  | 'common.remove'
  | 'common.add'
  | 'common.duplicate'
  | 'common.archive'
  | 'common.restore'
  | 'common.select'
  | 'common.optional'
  | 'common.allMonths'
  | 'common.allSites'
  | 'common.allProducts'
  | 'common.allCustomers'
  | 'common.allAccounts'
  | 'common.noActiveCompany'
  | 'common.noActiveCompanyDesc'
  | 'common.selectCompanyFromSidebar'
  | 'common.fiscalYear'
  | 'common.periodType'
  | 'common.version'
  | 'common.amount'
  | 'common.quantity'
  | 'common.unitPrice'
  | 'common.month'
  | 'common.year'
  | 'common.recordsFound'
  /* ── Status ──────────────────────────────────────────────────────────── */
  | 'status.success'
  | 'status.warning'
  | 'status.danger'
  | 'status.info'
  | 'status.active'
  | 'status.inactive'
  | 'status.pending'
  | 'status.approved'
  | 'status.rejected'
  | 'status.draft'
  | 'status.submitted'
  | 'status.validated'
  | 'status.posted'
  | 'status.locked'
  | 'status.failed'
  | 'status.completed'
  | 'status.processing'
  /* ── Account types ──────────────────────────────────────────────────── */
  | 'accountType.revenue'
  | 'accountType.expense'
  | 'accountType.asset'
  | 'accountType.liability'
  | 'accountType.equity'
  /* ── Forecast methods ───────────────────────────────────────────────── */
  | 'forecastMethod.manual'
  | 'forecastMethod.rolling'
  | 'forecastMethod.driverBased'
  | 'forecastMethod.aiAssisted'
  | 'forecastMethod.seasonalAdjusted'
  | 'forecastMethod.hybrid'
  /* ── Scenario subtypes ──────────────────────────────────────────────── */
  | 'scenarioSubtype.increaseMaterialPrices'
  | 'scenarioSubtype.currencyRateChange'
  | 'scenarioSubtype.demandDecrease'
  | 'scenarioSubtype.branchExpansion'
  /* ── Scenario default names ─────────────────────────────────────────── */
  | 'scenarioDefaultName.increaseMaterialPrices'
  | 'scenarioDefaultName.currencyRateChange'
  | 'scenarioDefaultName.demandDecrease'
  | 'scenarioDefaultName.branchExpansion'
  /* ── Period types ───────────────────────────────────────────────────── */
  | 'periodType.annual'
  | 'periodType.quarterly'
  | 'periodType.monthly'
  /* ── Connection types ───────────────────────────────────────────────── */
  | 'connectionType.oracle'
  | 'connectionType.sap'
  | 'connectionType.erp'
  | 'connectionType.pms'
  | 'connectionType.odoo'
  | 'connectionType.pos'
  | 'connectionType.woocommerce'
  | 'connectionType.restApi'
  | 'connectionType.sftp'
  | 'connectionType.custom'
  /* ── Import types ───────────────────────────────────────────────────── */
  | 'importType.sales'
  | 'importType.expenses'
  | 'importType.production'
  | 'importType.inventory'
  | 'importType.gl'
  | 'importType.cashflow'
  | 'importType.payroll'
  /* ── Sync schedules ─────────────────────────────────────────────────── */
  | 'syncSchedule.manual'
  | 'syncSchedule.hourly'
  | 'syncSchedule.daily'
  | 'syncSchedule.weekly'
  | 'syncSchedule.monthly'
  /* ── Source systems ─────────────────────────────────────────────────── */
  | 'sourceSystem.excel'
  | 'sourceSystem.oracle'
  | 'sourceSystem.sap'
  | 'sourceSystem.erp'
  | 'sourceSystem.pms'
  | 'sourceSystem.odoo'
  | 'sourceSystem.pos'
  | 'sourceSystem.woocommerce'
  | 'sourceSystem.manual'
  | 'sourceSystem.api'
  | 'sourceSystem.custom'
  /* ── Trigger types ──────────────────────────────────────────────────── */
  | 'triggerType.variancePct'
  | 'triggerType.varianceAmount'
  | 'triggerType.kpiBreach'
  | 'triggerType.budgetApproval'
  | 'triggerType.forecastApproval'
  | 'triggerType.importFailed'
  /* ── Driver types ───────────────────────────────────────────────────── */
  | 'driverType.headcount'
  | 'driverType.unitsSold'
  | 'driverType.sqFt'
  | 'driverType.customers'
  | 'driverType.transactions'
  /* ── Report types ───────────────────────────────────────────────────── */
  | 'reportType.pl'
  | 'reportType.cashflow'
  | 'reportType.grossMargin'
  | 'reportType.netProfit'
  | 'reportType.budgetVsActual'
  | 'reportType.forecastAccuracy'
  | 'reportType.productProfitability'
  | 'reportType.branchProfitability'
  | 'reportType.factoryCosting'
  | 'reportType.inventoryCoverage'
  | 'reportType.slowMovingItems'
  | 'reportType.wastageAnalysis'
  | 'reportType.customerProfitability'
  | 'reportType.productCostVariance'
  | 'reportType.productionCapacity'
  | 'reportType.cashFlowForecast'
  /* ── Report categories ──────────────────────────────────────────────── */
  | 'reportCategory.financial'
  | 'reportCategory.performance'
  | 'reportCategory.operations'
  /* ── Dashboard page ─────────────────────────────────────────────────── */
  | 'page.dashboard.title'
  | 'page.dashboard.revenue'
  | 'page.dashboard.expenses'
  | 'page.dashboard.grossProfit'
  | 'page.dashboard.netProfit'
  | 'page.dashboard.cashBalance'
  | 'page.dashboard.budgetUtilization'
  | 'page.dashboard.forecastAccuracy'
  | 'page.dashboard.topProducts'
  | 'page.dashboard.topCustomers'
  | 'page.dashboard.topBranches'
  | 'page.dashboard.revenueTrend'
  | 'page.dashboard.expensesTrend'
  | 'page.dashboard.grossProfitTrend'
  | 'page.dashboard.netProfitTrend'
  | 'page.dashboard.cashBalanceTrend'
  | 'page.dashboard.financialOverview'
  | 'page.dashboard.ytdLabel'
  | 'page.dashboard.latestLabel'
  | 'page.dashboard.actualLabel'
  | 'page.dashboard.budgetLabel'
  | 'page.dashboard.forecastLabel'
  | 'page.dashboard.netProfitDesc'
  | 'page.dashboard.budgetUtilDesc'
  | 'page.dashboard.forecastAccDesc'
  | 'page.dashboard.expensesYtd'
  | 'page.dashboard.revenueYtd'
  | 'page.dashboard.grossProfitYtd'
  | 'page.dashboard.cashBalanceLatest'
  | 'page.dashboard.trendDataEmptyTitle'
  | 'page.dashboard.trendDataEmptyDesc'
  | 'page.dashboard.noDataYet'
  | 'page.dashboard.noCompanyTitle'
  | 'page.dashboard.noCompanyDesc'
  /* ── Budgets page ───────────────────────────────────────────────────── */
  | 'page.budgets.title'
  | 'page.budgets.createTitle'
  | 'page.budgets.editTitle'
  | 'page.budgets.description'
  | 'page.budgets.detailDescription'
  | 'page.budgets.fiscalYearLabel'
  | 'page.budgets.periodTypeLabel'
  | 'page.budgets.versionLabel'
  | 'page.budgets.totalBudgetedLabel'
  | 'page.budgets.budgetLinesLabel'
  | 'page.budgets.addLine'
  | 'page.budgets.noLines'
  | 'page.budgets.addBudget'
  | 'page.budgets.importLines'
  | 'page.budgets.searchPlaceholder'
  | 'page.budgets.emptyTitle'
  | 'page.budgets.emptyDesc'
  | 'page.budgets.submitForApproval'
  | 'page.budgets.approve'
  | 'page.budgets.reject'
  | 'page.budgets.lockCycle'
  | 'page.budgets.revertToDraft'
  | 'page.budgets.cycleLocked'
  | 'page.budgets.cycleLockedDesc'
  | 'page.budgets.transitionStatus'
  | 'page.budgets.accountCode'
  | 'page.budgets.accountName'
  | 'page.budgets.rolledUpTotal'
  | 'page.budgets.directTotal'
  | 'page.budgets.site'
  | 'page.budgets.costCenter'
  | 'page.budgets.productCustomerMaterial'
  | 'page.budgets.nameLabel'
  | 'page.budgets.deleteConfirmMsg'
  | 'page.budgets.statusUpdated'
  | 'page.budgets.noLinesDetail'
  | 'page.budgets.noLinesDetailDesc'
  /* ── Forecasts page ─────────────────────────────────────────────────── */
  | 'page.forecasts.title'
  | 'page.forecasts.createTitle'
  | 'page.forecasts.editTitle'
  | 'page.forecasts.description'
  | 'page.forecasts.basePeriodLabel'
  | 'page.forecasts.methodLabel'
  | 'page.forecasts.linkedScenario'
  | 'page.forecasts.none'
  | 'page.forecasts.totalForecasted'
  | 'page.forecasts.forecastLines'
  | 'page.forecasts.addLine'
  | 'page.forecasts.noLines'
  | 'page.forecasts.addForecast'
  | 'page.forecasts.importLines'
  | 'page.forecasts.searchPlaceholder'
  | 'page.forecasts.emptyTitle'
  | 'page.forecasts.emptyDesc'
  | 'page.forecasts.generateLines'
  | 'page.forecasts.approvedDone'
  | 'page.forecasts.approvedDesc'
  | 'page.forecasts.lockedDesc'
  | 'page.forecasts.driverType'
  | 'page.forecasts.deleteConfirmMsg'
  | 'page.forecasts.statusUpdated'
  | 'page.forecasts.noLinesDetail'
  /* ── Scenarios page ─────────────────────────────────────────────────── */
  | 'page.scenarios.title'
  | 'page.scenarios.description'
  | 'page.scenarios.createTitle'
  | 'page.scenarios.editTitle'
  | 'page.scenarios.scenarioModels'
  | 'page.scenarios.simulationPreview'
  | 'page.scenarios.sensitivitySimulator'
  | 'page.scenarios.simulationSetup'
  | 'page.scenarios.baselineType'
  | 'page.scenarios.budgetCycle'
  | 'page.scenarios.forecastCycle'
  | 'page.scenarios.selectCycle'
  | 'page.scenarios.chooseCycle'
  | 'page.scenarios.scenarioModelTemplate'
  | 'page.scenarios.selectTemplate'
  | 'page.scenarios.simulationBlocked'
  | 'page.scenarios.simulationFailed'
  | 'page.scenarios.runSimulation'
  | 'page.scenarios.readyToSimulate'
  | 'page.scenarios.readyToSimulateDesc'
  | 'page.scenarios.baselineAmount'
  | 'page.scenarios.simulatedProjection'
  | 'page.scenarios.simulatedVariance'
  | 'page.scenarios.itemizedVariances'
  | 'page.scenarios.account'
  | 'page.scenarios.month'
  | 'page.scenarios.originalAmt'
  | 'page.scenarios.simulatedAmt'
  | 'page.scenarios.variance'
  | 'page.scenarios.searchPlaceholder'
  | 'page.scenarios.emptyTitle'
  | 'page.scenarios.emptyDesc'
  | 'page.scenarios.addScenario'
  | 'page.scenarios.scenarioName'
  | 'page.scenarios.scenarioType'
  | 'page.scenarios.namePlaceholder'
  | 'page.scenarios.predefinedTemplates'
  | 'page.scenarios.percentageIncrease'
  | 'page.scenarios.percentageDecrease'
  | 'page.scenarios.targetMaterials'
  | 'page.scenarios.fromCurrency'
  | 'page.scenarios.toCurrency'
  | 'page.scenarios.newRate'
  | 'page.scenarios.targetSuppliers'
  | 'page.scenarios.targetAccounts'
  | 'page.scenarios.targetProducts'
  | 'page.scenarios.siteName'
  | 'page.scenarios.annualRevenue'
  | 'page.scenarios.annualExpense'
  | 'page.scenarios.revenueAccount'
  | 'page.scenarios.expenseAccount'
  | 'page.scenarios.saveChanges'
  | 'page.scenarios.createScenario'
  | 'page.scenarios.deleteConfirmMsg'
  | 'page.scenarios.lockedTitle'
  | 'page.scenarios.lockedDesc'
  | 'page.scenarios.noCompanyTitle'
  | 'page.scenarios.noCompanyDesc'
  | 'page.scenarios.records'
  | 'page.scenarios.pleaseSelectCycle'
  | 'page.scenarios.pleaseSelectTemplate'
  | 'page.scenarios.templateNotFound'
  | 'page.scenarios.assumptionsMissing'
  | 'page.scenarios.pctInvalid'
  | 'page.scenarios.currMissing'
  | 'page.scenarios.rateInvalid'
  | 'page.scenarios.siteMissing'
  | 'page.scenarios.revenueMissing'
  | 'page.scenarios.expenseMissing'
  | 'page.scenarios.revAccMissing'
  | 'page.scenarios.expAccMissing'
  | 'page.scenarios.invalidSubtype'
  /* ── Reports page ───────────────────────────────────────────────────── */
  | 'page.reports.title'
  | 'page.reports.description'
  | 'page.reports.financialStatements'
  | 'page.reports.performanceVariances'
  | 'page.reports.operationsCosting'
  | 'page.reports.filterFiscalYear'
  | 'page.reports.filterMonth'
  | 'page.reports.filterSite'
  | 'page.reports.filterProduct'
  | 'page.reports.filterCustomer'
  | 'page.reports.recordsRetrieved'
  | 'page.reports.exportCsv'
  | 'page.reports.refresh'
  | 'page.reports.emptyTitle'
  | 'page.reports.emptyDesc'
  | 'page.reports.noCompanyTitle'
  | 'page.reports.noCompanyDesc'
  /* ── Settings page ──────────────────────────────────────────────────── */
  | 'page.settings.title'
  | 'page.settings.description'
  | 'page.settings.companyProfile'
  | 'page.settings.companyProfileDesc'
  | 'page.settings.activeSession'
  | 'page.settings.activeSessionDesc'
  | 'page.settings.subscriptionPlans'
  | 'page.settings.subscriptionPlansDesc'
  | 'page.settings.companyName'
  | 'page.settings.companyCode'
  | 'page.settings.defaultCurrency'
  | 'page.settings.fiscalYearStart'
  | 'page.settings.selectCurrency'
  | 'page.settings.companyId'
  | 'page.settings.tenantId'
  | 'page.settings.fullName'
  | 'page.settings.emailAddress'
  | 'page.settings.role'
  | 'page.settings.userId'
  | 'page.settings.activeCompanyId'
  | 'page.settings.subscriptionPlan'
  | 'page.settings.sessionDisclaimer'
  | 'page.settings.discardReload'
  | 'page.settings.saving'
  | 'page.settings.saveChanges'
  | 'page.settings.savedSuccess'
  | 'page.settings.monthly'
  | 'page.settings.yearly'
  | 'page.settings.savePercent'
  | 'page.settings.mostPopular'
  | 'page.settings.completeSuite'
  | 'page.settings.activePlan'
  | 'page.settings.upgrading'
  | 'page.settings.selectPlan'
  | 'page.settings.companies'
  | 'page.settings.users'
  | 'page.settings.branches'
  | 'page.settings.unlimited'
  | 'page.settings.dashboardLabel'
  | 'page.settings.perMonth'
  | 'page.settings.perYear'
  | 'page.settings.billedAnnually'
  /* ── Other page titles ──────────────────────────────────────────────── */
  | 'page.variance.title'
  | 'page.inventory.title'
  | 'page.approvals.title'
  | 'page.promotions.title'
  | 'page.rawMaterialPrices.title'
  | 'page.actualImports.title'
  | 'page.companies.title'
  | 'page.sites.title'
  | 'page.units.title'
  | 'page.accounts.title'
  | 'page.costCenters.title'
  | 'page.productCategories.title'
  | 'page.suppliers.title'
  | 'page.customers.title'
  | 'page.products.title'
  | 'page.materials.title'
  | 'page.bomRecipes.title'
  | 'page.kpiTargets.title'
  | 'page.notificationRules.title'
  | 'page.auditLogs.title'
  | 'page.users.title'
  | 'page.exchangeRates.title'
  | 'page.connections.title'
  | 'page.importMappings.title'
  | 'page.productionPlanning.title'
  | 'page.headcountPlans.title'
  | 'page.modules.title'
  | 'page.notifications.title'
  /* ── Auth page ──────────────────────────────────────────────────────── */
  | 'auth.signInTitle'
  | 'auth.signInSubtitle'
  | 'auth.noAccount'
  | 'auth.forgotPassword'
  | 'auth.invalidCredentials';

export const translations: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    'app.name': 'ASAA FP&A',
    'app.tagline': 'Financial Planning & Analysis',

    /* Navigation */
    'nav.dashboard': 'Dashboard',
    'nav.planning': 'Planning',
    'nav.budgets': 'Budgets',
    'nav.forecasts': 'Forecasts',
    'nav.scenarios': 'Scenarios',
    'nav.productionPlanning': 'Production Planning',
    'nav.headcountPlans': 'Headcount Plans',
    'nav.reportsAnalysis': 'Reports & Analysis',
    'nav.reports': 'Reports',
    'nav.varianceAnalysis': 'Variance Analysis',
    'nav.operations': 'Operations',
    'nav.inventory': 'Inventory',
    'nav.approvals': 'Approvals',
    'nav.promotions': 'Promotions',
    'nav.rawMaterialPrices': 'Raw Mat. Prices',
    'nav.dataIntegrations': 'Data Integrations',
    'nav.actualImports': 'Actual Imports',
    'nav.connections': 'Connections',
    'nav.importMappings': 'Import Mappings',
    'nav.exchangeRates': 'Exchange Rates',
    'nav.masterData': 'Master Data',
    'nav.companies': 'Companies',
    'nav.sites': 'Sites',
    'nav.units': 'Units',
    'nav.accounts': 'Accounts',
    'nav.costCenters': 'Cost Centers',
    'nav.productCategories': 'Product Categories',
    'nav.suppliers': 'Suppliers',
    'nav.customers': 'Customers',
    'nav.products': 'Products',
    'nav.materials': 'Materials',
    'nav.bomRecipes': 'BOM Recipes',
    'nav.systemControl': 'System Control',
    'nav.kpiTargets': 'KPI Targets',
    'nav.notificationRules': 'Notification Rules',
    'nav.auditLogs': 'Audit Logs',
    'nav.settings': 'Settings',
    'nav.users': 'Users',
    'nav.overview': 'Overview',
    'nav.modules': 'Modules',
    'nav.notifications': 'Notifications',
    'nav.approve': 'Approve',

    /* Common */
    'common.search': 'Search',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.update': 'Update',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.retry': 'Retry',
    'common.noData': 'No data available',
    'common.noResults': 'No results found',
    'common.actions': 'Actions',
    'common.status': 'Status',
    'common.name': 'Name',
    'common.email': 'Email',
    'common.phone': 'Phone',
    'common.type': 'Type',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.all': 'All',
    'common.filter': 'Filter',
    'common.clear': 'Clear',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.download': 'Download',
    'common.upload': 'Upload',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.page': 'Page',
    'common.of': 'of',
    'common.showing': 'Showing',
    'common.to': 'to',
    'common.entries': 'entries',
    'common.total': 'Total',
    'common.id': 'ID',
    'common.code': 'Code',
    'common.description': 'Description',
    'common.notes': 'Notes',
    'common.date': 'Date',
    'common.from': 'From',
    'common.selectCompany': 'Select company...',
    'common.noCompany': 'No company selected',
    'common.signOut': 'Sign out',
    'common.signIn': 'Sign in',
    'common.password': 'Password',
    'common.tenantId': 'Tenant ID',
    'common.tenantIdHint': 'Your organisation\'s numeric tenant identifier',
    'common.emailPlaceholder': 'you@company.com',
    'common.passwordPlaceholder': '••••••••',
    'common.language': 'Language',
    'common.theme': 'Theme',
    'common.light': 'Light',
    'common.dark': 'Dark',
    'common.system': 'System',
    'common.currency': 'Currency',
    'common.confirmDelete': 'Confirm Delete',
    'common.confirmDeleteMessage': 'Are you sure you want to delete this item? This action cannot be undone.',
    'common.cancelDelete': 'Cancel',
    'common.createdSuccess': 'Created successfully.',
    'common.updatedSuccess': 'Updated successfully.',
    'common.deletedSuccess': 'Deleted successfully.',
    'common.deleteFailed': 'Delete failed.',
    'common.importSuccess': 'Imported successfully.',
    'common.required': 'This field is required',
    'common.invalidEmail': 'Invalid email address',
    'common.minLength': 'Must be at least {n} characters',
    'common.installApp': 'Install App',
    'common.installAppDescription': 'Install ASAA FP&A for the best experience',
    'common.install': 'Install',
    'common.notNow': 'Not now',
    'common.records': 'records',
    'common.importFrom': 'Import from',
    'common.exportTo': 'Export to',
    'common.viewDetails': 'View Details',
    'common.remove': 'Remove',
    'common.add': 'Add',
    'common.duplicate': 'Duplicate',
    'common.archive': 'Archive',
    'common.restore': 'Restore',
    'common.select': 'Select',
    'common.optional': 'Optional',
    'common.allMonths': 'All Months',
    'common.allSites': 'All Sites',
    'common.allProducts': 'All Products',
    'common.allCustomers': 'All Customers',
    'common.allAccounts': 'All Accounts',
    'common.noActiveCompany': 'No active company',
    'common.noActiveCompanyDesc': 'Select a company from the sidebar to continue.',
    'common.selectCompanyFromSidebar': 'Please select a company from the sidebar before viewing this page.',
    'common.fiscalYear': 'Fiscal Year',
    'common.periodType': 'Period Type',
    'common.version': 'Version',
    'common.amount': 'Amount',
    'common.quantity': 'Quantity',
    'common.unitPrice': 'Unit Price',
    'common.month': 'Month',
    'common.year': 'Year',
    'common.recordsFound': '{n} records',

    /* Status */
    'status.success': 'Success',
    'status.warning': 'Warning',
    'status.danger': 'Danger',
    'status.info': 'Info',
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.pending': 'Pending',
    'status.approved': 'Approved',
    'status.rejected': 'Rejected',
    'status.draft': 'Draft',
    'status.submitted': 'Submitted',
    'status.validated': 'Validated',
    'status.posted': 'Posted',
    'status.locked': 'Locked',
    'status.failed': 'Failed',
    'status.completed': 'Completed',
    'status.processing': 'Processing',

    /* Account types */
    'accountType.revenue': 'Revenue',
    'accountType.expense': 'Expense',
    'accountType.asset': 'Asset',
    'accountType.liability': 'Liability',
    'accountType.equity': 'Equity',

    /* Forecast methods */
    'forecastMethod.manual': 'Manual',
    'forecastMethod.rolling': 'Rolling (Budget Carry)',
    'forecastMethod.driverBased': 'Driver Based (Growth)',
    'forecastMethod.aiAssisted': 'AI Statistical Engine',
    'forecastMethod.seasonalAdjusted': 'Seasonal Adjusted (Egypt Market)',
    'forecastMethod.hybrid': 'Hybrid Ensemble (Most Accurate)',

    /* Scenario subtypes */
    'scenarioSubtype.increaseMaterialPrices': 'Increase Material Prices',
    'scenarioSubtype.currencyRateChange': 'Currency Rate Change',
    'scenarioSubtype.demandDecrease': 'Demand Decrease',
    'scenarioSubtype.branchExpansion': 'Branch Expansion',

    /* Scenario default names */
    'scenarioDefaultName.increaseMaterialPrices': 'Increase Material Prices Scenario',
    'scenarioDefaultName.currencyRateChange': 'Currency Rate Change Scenario',
    'scenarioDefaultName.demandDecrease': 'Demand Contraction Scenario',
    'scenarioDefaultName.branchExpansion': 'Branch Expansion Scenario',

    /* Period types */
    'periodType.annual': 'Annual',
    'periodType.quarterly': 'Quarterly',
    'periodType.monthly': 'Monthly',

    /* Connection types */
    'connectionType.oracle': 'Oracle',
    'connectionType.sap': 'SAP',
    'connectionType.erp': 'ERP',
    'connectionType.pms': 'PMS',
    'connectionType.odoo': 'Odoo',
    'connectionType.pos': 'POS',
    'connectionType.woocommerce': 'WooCommerce',
    'connectionType.restApi': 'REST API',
    'connectionType.sftp': 'SFTP',
    'connectionType.custom': 'Custom',

    /* Import types */
    'importType.sales': 'Sales Transactions',
    'importType.expenses': 'Expenses / Ledger Transactions',
    'importType.production': 'Production Records',
    'importType.inventory': 'Inventory Snapshots',
    'importType.gl': 'General Ledger',
    'importType.cashflow': 'Cash Flow Transactions',
    'importType.payroll': 'Payroll Summaries',

    /* Sync schedules */
    'syncSchedule.manual': 'Manual',
    'syncSchedule.hourly': 'Hourly',
    'syncSchedule.daily': 'Daily',
    'syncSchedule.weekly': 'Weekly',
    'syncSchedule.monthly': 'Monthly',

    /* Source systems */
    'sourceSystem.excel': 'Excel',
    'sourceSystem.oracle': 'Oracle',
    'sourceSystem.sap': 'SAP',
    'sourceSystem.erp': 'ERP',
    'sourceSystem.pms': 'PMS',
    'sourceSystem.odoo': 'Odoo',
    'sourceSystem.pos': 'POS',
    'sourceSystem.woocommerce': 'WooCommerce',
    'sourceSystem.manual': 'Manual',
    'sourceSystem.api': 'API',
    'sourceSystem.custom': 'Custom',

    /* Trigger types */
    'triggerType.variancePct': 'Variance Percentage Threshold',
    'triggerType.varianceAmount': 'Variance Absolute Amount Threshold',
    'triggerType.kpiBreach': 'KPI Target Breach',
    'triggerType.budgetApproval': 'Budget Approval Required',
    'triggerType.forecastApproval': 'Forecast Approval Required',
    'triggerType.importFailed': 'Data Import Failed',

    /* Driver types */
    'driverType.headcount': 'Headcount',
    'driverType.unitsSold': 'Units Sold',
    'driverType.sqFt': 'Square Footage',
    'driverType.customers': 'Customers',
    'driverType.transactions': 'Transactions',

    /* Report types */
    'reportType.pl': 'Profit & Loss (P&L)',
    'reportType.cashflow': 'Cash Flow Statement',
    'reportType.grossMargin': 'Gross Margin Analysis',
    'reportType.netProfit': 'Net Profit Margin',
    'reportType.budgetVsActual': 'Budget vs Actuals',
    'reportType.forecastAccuracy': 'Forecast Accuracy',
    'reportType.productProfitability': 'Product Profitability',
    'reportType.branchProfitability': 'Branch / Site Profitability',
    'reportType.factoryCosting': 'Factory Cost Analysis',
    'reportType.inventoryCoverage': 'Inventory Coverage',
    'reportType.slowMovingItems': 'Slow Moving Stock',
    'reportType.wastageAnalysis': 'Standard vs Actual Wastage',
    'reportType.customerProfitability': 'Customer Profitability',
    'reportType.productCostVariance': 'Product Cost Variance',
    'reportType.productionCapacity': 'Production Capacity',
    'reportType.cashFlowForecast': 'Cash Flow Forecast',

    /* Report categories */
    'reportCategory.financial': 'Financial Statements',
    'reportCategory.performance': 'Performance & Variances',
    'reportCategory.operations': 'Operations & Costing',

    /* Dashboard */
    'page.dashboard.title': 'Dashboard',
    'page.dashboard.revenue': 'Total Revenue',
    'page.dashboard.expenses': 'Total Expenses',
    'page.dashboard.grossProfit': 'Gross Profit',
    'page.dashboard.netProfit': 'Net Profit',
    'page.dashboard.cashBalance': 'Cash Balance',
    'page.dashboard.budgetUtilization': 'Budget Utilization',
    'page.dashboard.forecastAccuracy': 'Forecast Accuracy',
    'page.dashboard.topProducts': 'Top Products',
    'page.dashboard.topCustomers': 'Top Customers',
    'page.dashboard.topBranches': 'Top Branches',
    'page.dashboard.revenueTrend': 'Revenue Trend',
    'page.dashboard.expensesTrend': 'Expenses Trend',
    'page.dashboard.grossProfitTrend': 'Gross Profit Trend',
    'page.dashboard.netProfitTrend': 'Net Profit Trend',
    'page.dashboard.cashBalanceTrend': 'Cash Balance Trend',
    'page.dashboard.financialOverview': 'FY {year} financial overview',
    'page.dashboard.ytdLabel': 'Actual YTD',
    'page.dashboard.latestLabel': 'Latest',
    'page.dashboard.actualLabel': 'Actual',
    'page.dashboard.budgetLabel': 'Budget',
    'page.dashboard.forecastLabel': 'Forecast',
    'page.dashboard.netProfitDesc': 'Actual YTD',
    'page.dashboard.budgetUtilDesc': 'Revenue: {rev} / Expense: {exp}',
    'page.dashboard.forecastAccDesc': 'vs. actuals',
    'page.dashboard.expensesYtd': 'Actual YTD',
    'page.dashboard.revenueYtd': 'Actual YTD',
    'page.dashboard.grossProfitYtd': 'Actual YTD',
    'page.dashboard.cashBalanceLatest': 'Latest',
    'page.dashboard.trendDataEmptyTitle': 'No trend data',
    'page.dashboard.trendDataEmptyDesc': 'Actual, budget and forecast data will appear here.',
    'page.dashboard.noDataYet': 'No data yet.',
    'page.dashboard.noCompanyTitle': 'No active company',
    'page.dashboard.noCompanyDesc': 'Select a company from the sidebar to view your dashboard.',

    /* Budgets */
    'page.budgets.title': 'Budgets',
    'page.budgets.createTitle': 'Create Budget Cycle',
    'page.budgets.editTitle': 'Edit Budget Cycle',
    'page.budgets.description': 'Create and manage company financial budget cycles.',
    'page.budgets.detailDescription': 'Fill in budget parameters and add detailed line items.',
    'page.budgets.fiscalYearLabel': 'Fiscal Year',
    'page.budgets.periodTypeLabel': 'Period Type',
    'page.budgets.versionLabel': 'Version',
    'page.budgets.totalBudgetedLabel': 'Total budgeted',
    'page.budgets.budgetLinesLabel': 'Budget Lines',
    'page.budgets.addLine': 'Add Line',
    'page.budgets.noLines': 'No budget lines added yet. Click "Add Line".',
    'page.budgets.addBudget': 'Add Budget',
    'page.budgets.importLines': 'Import Budget Lines',
    'page.budgets.searchPlaceholder': 'Search budgets…',
    'page.budgets.emptyTitle': 'No budgets yet',
    'page.budgets.emptyDesc': 'Create a new budget cycle to start financial planning.',
    'page.budgets.submitForApproval': 'Submit for Approval',
    'page.budgets.approve': 'Approve',
    'page.budgets.reject': 'Reject',
    'page.budgets.lockCycle': 'Lock Cycle',
    'page.budgets.revertToDraft': 'Revert to Draft',
    'page.budgets.cycleLocked': 'This cycle is locked and cannot be modified further.',
    'page.budgets.cycleLockedDesc': 'The approved version is final and cannot be modified.',
    'page.budgets.transitionStatus': 'Transition Status:',
    'page.budgets.accountCode': 'Account Code',
    'page.budgets.accountName': 'Account Name',
    'page.budgets.rolledUpTotal': 'Rolled Up Total',
    'page.budgets.directTotal': 'Direct Total',
    'page.budgets.site': 'Site',
    'page.budgets.costCenter': 'Cost Center',
    'page.budgets.productCustomerMaterial': 'Product / Customer / Material',
    'page.budgets.nameLabel': 'Budget Name',
    'page.budgets.deleteConfirmMsg': 'Are you sure you want to delete the budget cycle "{name}"? All associated budget lines will be deleted. This action cannot be undone.',
    'page.budgets.statusUpdated': 'Cycle status updated to {status} successfully.',
    'page.budgets.noLinesDetail': 'No lines defined',
    'page.budgets.noLinesDetailDesc': 'Edit this cycle to add budget lines.',

    /* Forecasts */
    'page.forecasts.title': 'Forecasts',
    'page.forecasts.createTitle': 'Create Forecast Cycle',
    'page.forecasts.editTitle': 'Edit Forecast Cycle',
    'page.forecasts.description': 'Create and manage forecast cycles.',
    'page.forecasts.basePeriodLabel': 'Base Period Start',
    'page.forecasts.methodLabel': 'Method',
    'page.forecasts.linkedScenario': 'Linked Scenario',
    'page.forecasts.none': 'None',
    'page.forecasts.totalForecasted': 'Total forecasted',
    'page.forecasts.forecastLines': 'Forecast Lines',
    'page.forecasts.addLine': 'Add Line',
    'page.forecasts.noLines': 'No lines added yet. Click "Add Line".',
    'page.forecasts.addForecast': 'Add Forecast',
    'page.forecasts.importLines': 'Import Forecast Lines',
    'page.forecasts.searchPlaceholder': 'Search forecasts…',
    'page.forecasts.emptyTitle': 'No forecasts yet',
    'page.forecasts.emptyDesc': 'Create a new forecast cycle to start rolling analysis.',
    'page.forecasts.generateLines': 'Generate Forecast Lines',
    'page.forecasts.approvedDone': 'Approved — Final Version',
    'page.forecasts.approvedDesc': 'The forecast has been approved by the CFO. The approved version is final and cannot be modified.',
    'page.forecasts.lockedDesc': 'The forecast is locked and cannot be modified.',
    'page.forecasts.driverType': 'Driver Type',
    'page.forecasts.deleteConfirmMsg': 'Are you sure you want to delete the forecast cycle "{name}"? All associated lines will be deleted. This action cannot be undone.',
    'page.forecasts.statusUpdated': 'Forecast status updated to {status} successfully.',
    'page.forecasts.noLinesDetail': 'No lines defined',

    /* Scenarios */
    'page.scenarios.title': 'Scenario Planning',
    'page.scenarios.description': 'Simulate business planning decisions and sensitivity analysis.',
    'page.scenarios.createTitle': 'New Scenario Model',
    'page.scenarios.editTitle': 'Edit Scenario Model',
    'page.scenarios.scenarioModels': 'Scenario Models',
    'page.scenarios.simulationPreview': 'Impact Simulation Preview',
    'page.scenarios.sensitivitySimulator': 'Sensitivity Simulator',
    'page.scenarios.simulationSetup': 'Simulation Setup',
    'page.scenarios.baselineType': 'Baseline Type',
    'page.scenarios.budgetCycle': 'Budget Cycle',
    'page.scenarios.forecastCycle': 'Forecast Cycle',
    'page.scenarios.selectCycle': 'Select Planning Cycle',
    'page.scenarios.chooseCycle': 'Choose cycle...',
    'page.scenarios.scenarioModelTemplate': 'Scenario Model Template',
    'page.scenarios.selectTemplate': 'Select template...',
    'page.scenarios.simulationBlocked': 'Simulation Blocked',
    'page.scenarios.simulationFailed': 'Simulation Failed',
    'page.scenarios.runSimulation': 'Run Impact Simulation',
    'page.scenarios.readyToSimulate': 'Ready to simulate',
    'page.scenarios.readyToSimulateDesc': 'Configure baselines and scenario models, then trigger simulation to view impact analysis.',
    'page.scenarios.baselineAmount': 'Baseline Amount',
    'page.scenarios.simulatedProjection': 'Simulated Projection',
    'page.scenarios.simulatedVariance': 'Simulated Variance',
    'page.scenarios.itemizedVariances': 'Projected Itemized Variances',
    'page.scenarios.account': 'Account',
    'page.scenarios.month': 'Month',
    'page.scenarios.originalAmt': 'Original Amt',
    'page.scenarios.simulatedAmt': 'Simulated Amt',
    'page.scenarios.variance': 'Variance',
    'page.scenarios.searchPlaceholder': 'Search templates…',
    'page.scenarios.emptyTitle': 'No scenario models yet',
    'page.scenarios.emptyDesc': 'Define a scenario model (like material costs shift) to preview how it affects your bottom line.',
    'page.scenarios.addScenario': 'Add Scenario',
    'page.scenarios.scenarioName': 'Scenario Model Name',
    'page.scenarios.scenarioType': 'Scenario Type',
    'page.scenarios.namePlaceholder': 'e.g. Material Price Shift Q4',
    'page.scenarios.predefinedTemplates': 'Predefined Scenario Templates',
    'page.scenarios.percentageIncrease': 'Percentage Price Increase (%)',
    'page.scenarios.percentageDecrease': 'Percentage Demand Decrease (%)',
    'page.scenarios.targetMaterials': 'Target Materials (Optional - empty applies to all)',
    'page.scenarios.fromCurrency': 'From Currency',
    'page.scenarios.toCurrency': 'To Currency',
    'page.scenarios.newRate': 'New Exchange Rate',
    'page.scenarios.targetSuppliers': 'Target Suppliers (Optional)',
    'page.scenarios.targetAccounts': 'Target Accounts (Optional)',
    'page.scenarios.targetProducts': 'Target Products (Optional - empty applies to all)',
    'page.scenarios.siteName': 'Simulated Branch / Site Name',
    'page.scenarios.annualRevenue': 'Annual Revenue Amount',
    'page.scenarios.annualExpense': 'Annual Expense Amount',
    'page.scenarios.revenueAccount': 'Revenue Account',
    'page.scenarios.expenseAccount': 'Expense Account',
    'page.scenarios.saveChanges': 'Save Changes',
    'page.scenarios.createScenario': 'Create Scenario',
    'page.scenarios.deleteConfirmMsg': 'Are you sure you want to delete the scenario model "{name}"? All saved settings will be deleted. This cannot be undone.',
    'page.scenarios.lockedTitle': 'Scenario Planning is Locked',
    'page.scenarios.lockedDesc': 'Scenario simulation, sensitivity analysis and impact projecting are exclusive to the Business and Enterprise tiers.',
    'page.scenarios.noCompanyTitle': 'No active company',
    'page.scenarios.noCompanyDesc': 'Please select a company from the sidebar before planning scenarios.',
    'page.scenarios.records': 'records',
    'page.scenarios.pleaseSelectCycle': 'Please select a planning cycle.',
    'page.scenarios.pleaseSelectTemplate': 'Please select a scenario template model.',
    'page.scenarios.templateNotFound': 'Selected scenario model not found.',
    'page.scenarios.assumptionsMissing': 'Scenario assumptions are missing.',
    'page.scenarios.pctInvalid': 'Percentage is missing or invalid in scenario settings.',
    'page.scenarios.currMissing': 'Exchange currencies (From/To) are missing in rate settings.',
    'page.scenarios.rateInvalid': 'New exchange rate is missing or invalid in rate settings.',
    'page.scenarios.siteMissing': 'Simulated branch/site name is missing in branch expansion settings.',
    'page.scenarios.revenueMissing': 'Annual revenue amount is missing or invalid in branch expansion settings.',
    'page.scenarios.expenseMissing': 'Annual expense amount is missing or invalid in branch expansion settings.',
    'page.scenarios.revAccMissing': 'Revenue GL Account is missing in branch expansion settings.',
    'page.scenarios.expAccMissing': 'Expense GL Account is missing in branch expansion settings.',
    'page.scenarios.invalidSubtype': 'Invalid scenario subtype: {sub}',

    /* Reports */
    'page.reports.title': 'Reports & Analytics',
    'page.reports.description': 'Run real-time intelligence reports generated from ledgers, BOMs, and forecasts.',
    'page.reports.financialStatements': 'Financial Statements',
    'page.reports.performanceVariances': 'Performance & Variances',
    'page.reports.operationsCosting': 'Operations & Costing',
    'page.reports.filterFiscalYear': 'Fiscal Year',
    'page.reports.filterMonth': 'Month',
    'page.reports.filterSite': 'Target Site',
    'page.reports.filterProduct': 'Product SKU',
    'page.reports.filterCustomer': 'Customer',
    'page.reports.recordsRetrieved': '{n} Records Retrieved',
    'page.reports.exportCsv': 'Export CSV',
    'page.reports.refresh': 'Refresh',
    'page.reports.emptyTitle': 'No report entries found',
    'page.reports.emptyDesc': 'Adjust your filters or ensure ledger actuals and forecast periods are loaded.',
    'page.reports.noCompanyTitle': 'No active company',
    'page.reports.noCompanyDesc': 'Please select a company from the sidebar before viewing reports.',

    /* Settings */
    'page.settings.title': 'Settings',
    'page.settings.description': 'Manage company configuration and session preferences.',
    'page.settings.companyProfile': 'Company Profile',
    'page.settings.companyProfileDesc': 'Active company: {name} · ID {id}',
    'page.settings.activeSession': 'Active Session',
    'page.settings.activeSessionDesc': 'Current authenticated user and tenant details — read only',
    'page.settings.subscriptionPlans': 'Subscription Plan & Billing',
    'page.settings.subscriptionPlansDesc': 'Choose the right features and scale for your organization',
    'page.settings.companyName': 'Company Name',
    'page.settings.companyCode': 'Company Code',
    'page.settings.defaultCurrency': 'Default Currency',
    'page.settings.fiscalYearStart': 'Fiscal Year Start Month',
    'page.settings.selectCurrency': '— Select currency —',
    'page.settings.companyId': 'Company ID',
    'page.settings.tenantId': 'Tenant ID',
    'page.settings.fullName': 'Full Name',
    'page.settings.emailAddress': 'Email Address',
    'page.settings.role': 'Role',
    'page.settings.userId': 'User ID',
    'page.settings.activeCompanyId': 'Active Company ID',
    'page.settings.subscriptionPlan': 'Subscription Plan',
    'page.settings.sessionDisclaimer': 'Session details are managed by the authentication system and cannot be modified here. To change your password or email, contact your tenant administrator.',
    'page.settings.discardReload': 'Discard & reload',
    'page.settings.saving': 'Saving…',
    'page.settings.saveChanges': 'Save Changes',
    'page.settings.savedSuccess': 'Company profile updated successfully.',
    'page.settings.monthly': 'Monthly',
    'page.settings.yearly': 'Yearly',
    'page.settings.savePercent': 'Save ~17%',
    'page.settings.mostPopular': 'Most Popular',
    'page.settings.completeSuite': 'Complete Suite',
    'page.settings.activePlan': 'Active Plan',
    'page.settings.upgrading': 'Upgrading...',
    'page.settings.selectPlan': 'Select {name}',
    'page.settings.companies': 'Companies',
    'page.settings.users': 'Users',
    'page.settings.branches': 'Branches',
    'page.settings.unlimited': 'Unlimited',
    'page.settings.dashboardLabel': 'Dashboard',
    'page.settings.perMonth': '/ month',
    'page.settings.perYear': '/ year',
    'page.settings.billedAnnually': '${price}/mo billed annually',

    /* Page titles */
    'page.variance.title': 'Variance Analysis',
    'page.inventory.title': 'Inventory',
    'page.approvals.title': 'Approvals',
    'page.promotions.title': 'Promotions',
    'page.rawMaterialPrices.title': 'Raw Material Prices',
    'page.actualImports.title': 'Actual Imports',
    'page.companies.title': 'Companies',
    'page.sites.title': 'Sites',
    'page.units.title': 'Units of Measurement',
    'page.accounts.title': 'Chart of Accounts',
    'page.costCenters.title': 'Cost Centers',
    'page.productCategories.title': 'Product Categories',
    'page.suppliers.title': 'Suppliers',
    'page.customers.title': 'Customers',
    'page.products.title': 'Products',
    'page.materials.title': 'Materials',
    'page.bomRecipes.title': 'BOM Recipes',
    'page.kpiTargets.title': 'KPI Targets',
    'page.notificationRules.title': 'Notification Rules',
    'page.auditLogs.title': 'Audit Logs',
    'page.users.title': 'Users',
    'page.exchangeRates.title': 'Exchange Rates',
    'page.connections.title': 'Connections',
    'page.importMappings.title': 'Import Mappings',
    'page.productionPlanning.title': 'Production Planning',
    'page.headcountPlans.title': 'Headcount Plans',
    'page.modules.title': 'Modules',
    'page.notifications.title': 'Notifications',

    /* Auth */
    'auth.signInTitle': 'Sign in to your account',
    'auth.signInSubtitle': 'Enter your credentials to access the platform',
    'auth.noAccount': 'Don\'t have an account?',
    'auth.forgotPassword': 'Forgot password?',
    'auth.invalidCredentials': 'Invalid credentials. Please check your Tenant ID, email and password.',
  },

  ar: {
    'app.name': 'ASAA FP&A',
    'app.tagline': 'التخطيط والتحليل المالي',

    /* Navigation */
    'nav.dashboard': 'لوحة التحكم',
    'nav.planning': 'التخطيط',
    'nav.budgets': 'الميزانيات',
    'nav.forecasts': 'التوقعات',
    'nav.scenarios': 'السيناريوهات',
    'nav.productionPlanning': 'تخطيط الإنتاج',
    'nav.headcountPlans': 'خطط التوظيف',
    'nav.reportsAnalysis': 'التقارير والتحليل',
    'nav.reports': 'التقارير',
    'nav.varianceAnalysis': 'تحليل الانحراف',
    'nav.operations': 'العمليات',
    'nav.inventory': 'المخزون',
    'nav.approvals': 'الموافقات',
    'nav.promotions': 'العروض الترويجية',
    'nav.rawMaterialPrices': 'أسعار المواد الخام',
    'nav.dataIntegrations': 'تكامل البيانات',
    'nav.actualImports': 'استيراد الفعلي',
    'nav.connections': 'الاتصالات',
    'nav.importMappings': 'تعيينات الاستيراد',
    'nav.exchangeRates': 'أسعار الصرف',
    'nav.masterData': 'البيانات الأساسية',
    'nav.companies': 'الشركات',
    'nav.sites': 'المواقع',
    'nav.units': 'وحدات القياس',
    'nav.accounts': 'دليل الحسابات',
    'nav.costCenters': 'مراكز التكلفة',
    'nav.productCategories': 'تصنيفات المنتجات',
    'nav.suppliers': 'الموردين',
    'nav.customers': 'العملاء',
    'nav.products': 'المنتجات',
    'nav.materials': 'المواد الخام',
    'nav.bomRecipes': 'وصفات التصنيع',
    'nav.systemControl': 'التحكم في النظام',
    'nav.kpiTargets': 'مستهدفات الأداء',
    'nav.notificationRules': 'قواعد الإشعارات',
    'nav.auditLogs': 'سجل التدقيق',
    'nav.settings': 'الإعدادات',
    'nav.users': 'المستخدمين',
    'nav.overview': 'نظرة عامة',
    'nav.modules': 'الوحدات',
    'nav.notifications': 'الإشعارات',
    'nav.approve': 'اعتماد',

    /* Common */
    'common.search': 'بحث',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.create': 'إنشاء',
    'common.update': 'تحديث',
    'common.close': 'إغلاق',
    'common.confirm': 'تأكيد',
    'common.yes': 'نعم',
    'common.no': 'لا',
    'common.loading': 'جارٍ التحميل...',
    'common.error': 'خطأ',
    'common.success': 'تم بنجاح',
    'common.retry': 'إعادة المحاولة',
    'common.noData': 'لا توجد بيانات',
    'common.noResults': 'لا توجد نتائج',
    'common.actions': 'الإجراءات',
    'common.status': 'الحالة',
    'common.name': 'الاسم',
    'common.email': 'البريد الإلكتروني',
    'common.phone': 'الهاتف',
    'common.type': 'النوع',
    'common.active': 'نشط',
    'common.inactive': 'غير نشط',
    'common.all': 'الكل',
    'common.filter': 'تصفية',
    'common.clear': 'مسح',
    'common.export': 'تصدير',
    'common.import': 'استيراد',
    'common.download': 'تحميل',
    'common.upload': 'رفع',
    'common.back': 'رجوع',
    'common.next': 'التالي',
    'common.previous': 'السابق',
    'common.page': 'صفحة',
    'common.of': 'من',
    'common.showing': 'عرض',
    'common.to': 'إلى',
    'common.entries': 'مدخل',
    'common.total': 'الإجمالي',
    'common.id': 'المعرف',
    'common.code': 'الكود',
    'common.description': 'الوصف',
    'common.notes': 'ملاحظات',
    'common.date': 'التاريخ',
    'common.from': 'من',
    'common.selectCompany': 'اختر شركة...',
    'common.noCompany': 'لم يتم اختيار شركة',
    'common.signOut': 'تسجيل الخروج',
    'common.signIn': 'تسجيل الدخول',
    'common.password': 'كلمة المرور',
    'common.tenantId': 'معرف المؤسسة',
    'common.tenantIdHint': 'معرف المؤسسة الرقمي',
    'common.emailPlaceholder': 'you@company.com',
    'common.passwordPlaceholder': '••••••••',
    'common.language': 'اللغة',
    'common.theme': 'المظهر',
    'common.light': 'فاتح',
    'common.dark': 'داكن',
    'common.system': 'النظام',
    'common.currency': 'العملة',
    'common.confirmDelete': 'تأكيد الحذف',
    'common.confirmDeleteMessage': 'هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.',
    'common.cancelDelete': 'إلغاء',
    'common.createdSuccess': 'تم الإنشاء بنجاح.',
    'common.updatedSuccess': 'تم التحديث بنجاح.',
    'common.deletedSuccess': 'تم الحذف بنجاح.',
    'common.deleteFailed': 'فشل الحذف.',
    'common.importSuccess': 'تم الاستيراد بنجاح.',
    'common.required': 'هذا الحقل مطلوب',
    'common.invalidEmail': 'البريد الإلكتروني غير صالح',
    'common.minLength': 'يجب أن يكون على الأقل {n} أحرف',
    'common.installApp': 'تثبيت التطبيق',
    'common.installAppDescription': 'قم بتثبيت ASAA FP&A للحصول على أفضل تجربة',
    'common.install': 'تثبيت',
    'common.notNow': 'ليس الآن',
    'common.records': 'سجل',
    'common.importFrom': 'استيراد من',
    'common.exportTo': 'تصدير إلى',
    'common.viewDetails': 'عرض التفاصيل',
    'common.remove': 'إزالة',
    'common.add': 'إضافة',
    'common.duplicate': 'نسخ',
    'common.archive': 'أرشفة',
    'common.restore': 'استعادة',
    'common.select': 'اختيار',
    'common.optional': 'اختياري',
    'common.allMonths': 'كل الأشهر',
    'common.allSites': 'كل المواقع',
    'common.allProducts': 'كل المنتجات',
    'common.allCustomers': 'كل العملاء',
    'common.allAccounts': 'كل الحسابات',
    'common.noActiveCompany': 'لا توجد شركة نشطة',
    'common.noActiveCompanyDesc': 'اختر شركة من الشريط الجانبي للمتابعة.',
    'common.selectCompanyFromSidebar': 'يرجى اختيار شركة من الشريط الجانبي قبل عرض هذه الصفحة.',
    'common.fiscalYear': 'السنة المالية',
    'common.periodType': 'نوع الفترة',
    'common.version': 'الإصدار',
    'common.amount': 'المبلغ',
    'common.quantity': 'الكمية',
    'common.unitPrice': 'سعر الوحدة',
    'common.month': 'الشهر',
    'common.year': 'السنة',
    'common.recordsFound': '{n} سجل',

    /* Status */
    'status.success': 'نجاح',
    'status.warning': 'تحذير',
    'status.danger': 'خطأ',
    'status.info': 'معلومات',
    'status.active': 'نشط',
    'status.inactive': 'غير نشط',
    'status.pending': 'قيد الانتظار',
    'status.approved': 'معتمد',
    'status.rejected': 'مرفوض',
    'status.draft': 'مسودة',
    'status.submitted': 'مقدم',
    'status.validated': 'تم التحقق',
    'status.posted': 'مرحل',
    'status.locked': 'مقفول',
    'status.failed': 'فشل',
    'status.completed': 'مكتمل',
    'status.processing': 'قيد المعالجة',

    /* Account types */
    'accountType.revenue': 'إيراد',
    'accountType.expense': 'مصروف',
    'accountType.asset': 'أصل',
    'accountType.liability': 'خصم',
    'accountType.equity': 'حقوق ملكية',

    /* Forecast methods */
    'forecastMethod.manual': 'يدوي',
    'forecastMethod.rolling': 'متجدد (ترحيل الميزانية)',
    'forecastMethod.driverBased': 'قائم على المحركات (نمو)',
    'forecastMethod.aiAssisted': 'محرك إحصائي بالذكاء الاصطناعي',
    'forecastMethod.seasonalAdjusted': 'معدل موسمي (السوق المصري)',
    'forecastMethod.hybrid': 'هجين (الأكثر دقة)',

    /* Scenario subtypes */
    'scenarioSubtype.increaseMaterialPrices': 'زيادة أسعار المواد',
    'scenarioSubtype.currencyRateChange': 'تغير سعر الصرف',
    'scenarioSubtype.demandDecrease': 'انخفاض الطلب',
    'scenarioSubtype.branchExpansion': 'توسيع الفرع',

    /* Scenario default names */
    'scenarioDefaultName.increaseMaterialPrices': 'سيناريو زيادة أسعار المواد',
    'scenarioDefaultName.currencyRateChange': 'سيناريو تغير سعر الصرف',
    'scenarioDefaultName.demandDecrease': 'سيناريو انكماش الطلب',
    'scenarioDefaultName.branchExpansion': 'سيناريو توسيع الفرع',

    /* Period types */
    'periodType.annual': 'سنوي',
    'periodType.quarterly': 'ربع سنوي',
    'periodType.monthly': 'شهري',

    /* Connection types */
    'connectionType.oracle': 'أوراكل',
    'connectionType.sap': 'SAP',
    'connectionType.erp': 'ERP',
    'connectionType.pms': 'PMS',
    'connectionType.odoo': 'أودو',
    'connectionType.pos': 'نقطة البيع',
    'connectionType.woocommerce': 'ووكومرس',
    'connectionType.restApi': 'REST API',
    'connectionType.sftp': 'SFTP',
    'connectionType.custom': 'مخصص',

    /* Import types */
    'importType.sales': 'معاملات المبيعات',
    'importType.expenses': 'المصروفات / قيود اليومية',
    'importType.production': 'سجلات الإنتاج',
    'importType.inventory': 'لقطات المخزون',
    'importType.gl': 'دفتر الأستاذ العام',
    'importType.cashflow': 'معاملات التدفق النقدي',
    'importType.payroll': 'ملخصات الرواتب',

    /* Sync schedules */
    'syncSchedule.manual': 'يدوي',
    'syncSchedule.hourly': 'كل ساعة',
    'syncSchedule.daily': 'يومي',
    'syncSchedule.weekly': 'أسبوعي',
    'syncSchedule.monthly': 'شهري',

    /* Source systems */
    'sourceSystem.excel': 'إكسل',
    'sourceSystem.oracle': 'أوراكل',
    'sourceSystem.sap': 'SAP',
    'sourceSystem.erp': 'ERP',
    'sourceSystem.pms': 'PMS',
    'sourceSystem.odoo': 'أودو',
    'sourceSystem.pos': 'نقطة البيع',
    'sourceSystem.woocommerce': 'ووكومرس',
    'sourceSystem.manual': 'يدوي',
    'sourceSystem.api': 'API',
    'sourceSystem.custom': 'مخصص',

    /* Trigger types */
    'triggerType.variancePct': 'حد نسبة الانحراف',
    'triggerType.varianceAmount': 'حد المبلغ المطلق للانحراف',
    'triggerType.kpiBreach': 'اختراق هدف الأداء',
    'triggerType.budgetApproval': 'اعتماد الميزانية مطلوب',
    'triggerType.forecastApproval': 'اعتماد التوقع مطلوب',
    'triggerType.importFailed': 'فشل استيراد البيانات',

    /* Driver types */
    'driverType.headcount': 'عدد الموظفين',
    'driverType.unitsSold': 'الوحدات المباعة',
    'driverType.sqFt': 'المساحة بالقدم المربع',
    'driverType.customers': 'العملاء',
    'driverType.transactions': 'المعاملات',

    /* Report types */
    'reportType.pl': 'الأرباح والخسائر (P&L)',
    'reportType.cashflow': 'قائمة التدفق النقدي',
    'reportType.grossMargin': 'تحليل هامش الربح الإجمالي',
    'reportType.netProfit': 'هامش صافي الربح',
    'reportType.budgetVsActual': 'الميزانية مقابل الفعلي',
    'reportType.forecastAccuracy': 'دقة التوقعات',
    'reportType.productProfitability': 'ربحية المنتج',
    'reportType.branchProfitability': 'ربحية الفرع / الموقع',
    'reportType.factoryCosting': 'تحليل تكلفة المصنع',
    'reportType.inventoryCoverage': 'تغطية المخزون',
    'reportType.slowMovingItems': 'المخزون بطيء الحركة',
    'reportType.wastageAnalysis': 'الهدر المعياري مقابل الفعلي',
    'reportType.customerProfitability': 'ربحية العميل',
    'reportType.productCostVariance': 'انحراف تكلفة المنتج',
    'reportType.productionCapacity': 'الطاقة الإنتاجية',
    'reportType.cashFlowForecast': 'توقعات التدفق النقدي',

    /* Report categories */
    'reportCategory.financial': 'القوائم المالية',
    'reportCategory.performance': 'الأداء والانحرافات',
    'reportCategory.operations': 'العمليات والتكاليف',

    /* Dashboard */
    'page.dashboard.title': 'لوحة التحكم',
    'page.dashboard.revenue': 'إجمالي الإيرادات',
    'page.dashboard.expenses': 'إجمالي المصروفات',
    'page.dashboard.grossProfit': 'إجمالي الربح',
    'page.dashboard.netProfit': 'صافي الربح',
    'page.dashboard.cashBalance': 'الرصيد النقدي',
    'page.dashboard.budgetUtilization': 'استخدام الميزانية',
    'page.dashboard.forecastAccuracy': 'دقة التوقعات',
    'page.dashboard.topProducts': 'أفضل المنتجات',
    'page.dashboard.topCustomers': 'أفضل العملاء',
    'page.dashboard.topBranches': 'أفضل الفروع',
    'page.dashboard.revenueTrend': 'اتجاه الإيرادات',
    'page.dashboard.expensesTrend': 'اتجاه المصروفات',
    'page.dashboard.grossProfitTrend': 'اتجاه إجمالي الربح',
    'page.dashboard.netProfitTrend': 'اتجاه صافي الربح',
    'page.dashboard.cashBalanceTrend': 'اتجاه الرصيد النقدي',
    'page.dashboard.financialOverview': 'نظرة مالية للسنة المالية {year}',
    'page.dashboard.ytdLabel': 'الفعلي منذ بداية العام',
    'page.dashboard.latestLabel': 'الأحدث',
    'page.dashboard.actualLabel': 'الفعلي',
    'page.dashboard.budgetLabel': 'الميزانية',
    'page.dashboard.forecastLabel': 'التوقع',
    'page.dashboard.netProfitDesc': 'الفعلي منذ بداية العام',
    'page.dashboard.budgetUtilDesc': 'الإيرادات: {rev} / المصروفات: {exp}',
    'page.dashboard.forecastAccDesc': 'مقارنة بالفعلي',
    'page.dashboard.expensesYtd': 'الفعلي منذ بداية العام',
    'page.dashboard.revenueYtd': 'الفعلي منذ بداية العام',
    'page.dashboard.grossProfitYtd': 'الفعلي منذ بداية العام',
    'page.dashboard.cashBalanceLatest': 'الأحدث',
    'page.dashboard.trendDataEmptyTitle': 'لا توجد بيانات اتجاه',
    'page.dashboard.trendDataEmptyDesc': 'ستظهر بيانات الفعلي والميزانية والتوقعات هنا.',
    'page.dashboard.noDataYet': 'لا توجد بيانات بعد.',
    'page.dashboard.noCompanyTitle': 'لا توجد شركة نشطة',
    'page.dashboard.noCompanyDesc': 'اختر شركة من الشريط الجانبي لعرض لوحة التحكم.',

    /* Budgets */
    'page.budgets.title': 'الميزانيات',
    'page.budgets.createTitle': 'إنشاء دورة ميزانية',
    'page.budgets.editTitle': 'تعديل دورة الميزانية',
    'page.budgets.description': 'إنشاء وإدارة دورات الميزانية المالية للشركة.',
    'page.budgets.detailDescription': 'املأ معايير الميزانية وأضف بنود التفاصيل.',
    'page.budgets.fiscalYearLabel': 'السنة المالية',
    'page.budgets.periodTypeLabel': 'نوع الفترة',
    'page.budgets.versionLabel': 'الإصدار',
    'page.budgets.totalBudgetedLabel': 'إجمالي الميزانية',
    'page.budgets.budgetLinesLabel': 'بنود الميزانية',
    'page.budgets.addLine': 'إضافة بند',
    'page.budgets.noLines': 'لم تتم إضافة بنود ميزانية بعد. انقر "إضافة بند".',
    'page.budgets.addBudget': 'إضافة ميزانية',
    'page.budgets.importLines': 'استيراد بنود الميزانية',
    'page.budgets.searchPlaceholder': 'بحث في الميزانيات...',
    'page.budgets.emptyTitle': 'لا توجد ميزانيات بعد',
    'page.budgets.emptyDesc': 'أنشئ دورة ميزانية جديدة لبدء التخطيط المالي.',
    'page.budgets.submitForApproval': 'تقديم للاعتماد',
    'page.budgets.approve': 'اعتماد',
    'page.budgets.reject': 'رفض',
    'page.budgets.lockCycle': 'قفل الدورة',
    'page.budgets.revertToDraft': 'إعادة للمسودة',
    'page.budgets.cycleLocked': 'هذه الدورة مقفولة ولا يمكن تعديلها.',
    'page.budgets.cycleLockedDesc': 'النسخة المعتمدة نهائية ولا يمكن تعديلها.',
    'page.budgets.transitionStatus': 'حالة الانتقال:',
    'page.budgets.accountCode': 'كود الحساب',
    'page.budgets.accountName': 'اسم الحساب',
    'page.budgets.rolledUpTotal': 'الإجمالي المجمع',
    'page.budgets.directTotal': 'الإجمالي المباشر',
    'page.budgets.site': 'الموقع',
    'page.budgets.costCenter': 'مركز التكلفة',
    'page.budgets.productCustomerMaterial': 'المنتج / العميل / المادة',
    'page.budgets.nameLabel': 'اسم الميزانية',
    'page.budgets.deleteConfirmMsg': 'هل أنت متأكد من حذف دورة الميزانية "{name}"؟ سيتم حذف جميع بنود الميزانية المرتبطة. لا يمكن التراجع عن هذا الإجراء.',
    'page.budgets.statusUpdated': 'تم تحديث حالة الدورة إلى {status} بنجاح.',
    'page.budgets.noLinesDetail': 'لا توجد بنود محددة',
    'page.budgets.noLinesDetailDesc': 'قم بتعديل هذه الدورة لإضافة بنود الميزانية.',

    /* Forecasts */
    'page.forecasts.title': 'التوقعات',
    'page.forecasts.createTitle': 'إنشاء دورة توقع',
    'page.forecasts.editTitle': 'تعديل دورة التوقع',
    'page.forecasts.description': 'إنشاء وإدارة دورات التوقعات.',
    'page.forecasts.basePeriodLabel': 'بداية الفترة الأساسية',
    'page.forecasts.methodLabel': 'الطريقة',
    'page.forecasts.linkedScenario': 'السيناريو المرتبط',
    'page.forecasts.none': 'لا يوجد',
    'page.forecasts.totalForecasted': 'إجمالي التوقعات',
    'page.forecasts.forecastLines': 'بنود التوقعات',
    'page.forecasts.addLine': 'إضافة بند',
    'page.forecasts.noLines': 'لم تتم إضافة بنود بعد. انقر "إضافة بند".',
    'page.forecasts.addForecast': 'إضافة توقع',
    'page.forecasts.importLines': 'استيراد بنود التوقعات',
    'page.forecasts.searchPlaceholder': 'بحث في التوقعات...',
    'page.forecasts.emptyTitle': 'لا توجد توقعات بعد',
    'page.forecasts.emptyDesc': 'أنشئ دورة توقع جديدة لبدء التحليل المتجدد.',
    'page.forecasts.generateLines': 'توليد بنود التوقعات',
    'page.forecasts.approvedDone': 'تم الاعتماد — النسخة نهائية',
    'page.forecasts.approvedDesc': 'تم اعتماد التوقع من المدير المالي. النسخة المعتمدة نهائية ولا يمكن تعديلها.',
    'page.forecasts.lockedDesc': 'التوقع مقفول ولا يمكن تعديله.',
    'page.forecasts.driverType': 'نوع المحرك',
    'page.forecasts.deleteConfirmMsg': 'هل أنت متأكد من حذف دورة التوقع "{name}"؟ سيتم حذف جميع البنود المرتبطة. لا يمكن التراجع عن هذا الإجراء.',
    'page.forecasts.statusUpdated': 'تم تحديث حالة التوقع إلى {status} بنجاح.',
    'page.forecasts.noLinesDetail': 'لا توجد بنود محددة',

    /* Scenarios */
    'page.scenarios.title': 'تخطيط السيناريوهات',
    'page.scenarios.description': 'محاكاة قرارات تخطيط الأعمال وتحليل الحساسية.',
    'page.scenarios.createTitle': 'نموذج سيناريو جديد',
    'page.scenarios.editTitle': 'تعديل نموذج السيناريو',
    'page.scenarios.scenarioModels': 'نماذج السيناريوهات',
    'page.scenarios.simulationPreview': 'معاينة محاكاة التأثير',
    'page.scenarios.sensitivitySimulator': 'محاكي الحساسية',
    'page.scenarios.simulationSetup': 'إعداد المحاكاة',
    'page.scenarios.baselineType': 'نوع الأساس',
    'page.scenarios.budgetCycle': 'دورة الميزانية',
    'page.scenarios.forecastCycle': 'دورة التوقع',
    'page.scenarios.selectCycle': 'اختر دورة التخطيط',
    'page.scenarios.chooseCycle': 'اختر دورة...',
    'page.scenarios.scenarioModelTemplate': 'قالب نموذج السيناريو',
    'page.scenarios.selectTemplate': 'اختر قالبًا...',
    'page.scenarios.simulationBlocked': 'تم منع المحاكاة',
    'page.scenarios.simulationFailed': 'فشلت المحاكاة',
    'page.scenarios.runSimulation': 'تشغيل محاكاة التأثير',
    'page.scenarios.readyToSimulate': 'جاهز للمحاكاة',
    'page.scenarios.readyToSimulateDesc': 'قم بتكوين خطوط الأساس ونماذج السيناريوهات، ثم شغّل المحاكاة لعرض تحليل التأثير.',
    'page.scenarios.baselineAmount': 'المبلغ الأساسي',
    'page.scenarios.simulatedProjection': 'الإسقاط المحاكى',
    'page.scenarios.simulatedVariance': 'الانحراف المحاكى',
    'page.scenarios.itemizedVariances': 'انحرافات البنود المتوقعة',
    'page.scenarios.account': 'الحساب',
    'page.scenarios.month': 'الشهر',
    'page.scenarios.originalAmt': 'المبلغ الأصلي',
    'page.scenarios.simulatedAmt': 'المبلغ المحاكى',
    'page.scenarios.variance': 'الانحراف',
    'page.scenarios.searchPlaceholder': 'بحث في القوالب...',
    'page.scenarios.emptyTitle': 'لا توجد نماذج سيناريوهات بعد',
    'page.scenarios.emptyDesc': 'قم بتعريف نموذج سيناريو (مثل تغير تكاليف المواد) لمعاينة تأثيره على أرباحك.',
    'page.scenarios.addScenario': 'إضافة سيناريو',
    'page.scenarios.scenarioName': 'اسم نموذج السيناريو',
    'page.scenarios.scenarioType': 'نوع السيناريو',
    'page.scenarios.namePlaceholder': 'مثال: تغير أسعار المواد الربع الرابع',
    'page.scenarios.predefinedTemplates': 'قوالب السيناريوهات الجاهزة',
    'page.scenarios.percentageIncrease': 'نسبة زيادة السعر (%)',
    'page.scenarios.percentageDecrease': 'نسبة انخفاض الطلب (%)',
    'page.scenarios.targetMaterials': 'المواد المستهدفة (اختياري - فارغ ليشمل الكل)',
    'page.scenarios.fromCurrency': 'من عملة',
    'page.scenarios.toCurrency': 'إلى عملة',
    'page.scenarios.newRate': 'سعر الصرف الجديد',
    'page.scenarios.targetSuppliers': 'الموردين المستهدفين (اختياري)',
    'page.scenarios.targetAccounts': 'الحسابات المستهدفة (اختياري)',
    'page.scenarios.targetProducts': 'المنتجات المستهدفة (اختياري - فارغ ليشمل الكل)',
    'page.scenarios.siteName': 'اسم الفرع / الموقع المحاكى',
    'page.scenarios.annualRevenue': 'مبلغ الإيراد السنوي',
    'page.scenarios.annualExpense': 'مبلغ المصروف السنوي',
    'page.scenarios.revenueAccount': 'حساب الإيراد',
    'page.scenarios.expenseAccount': 'حساب المصروف',
    'page.scenarios.saveChanges': 'حفظ التغييرات',
    'page.scenarios.createScenario': 'إنشاء السيناريو',
    'page.scenarios.deleteConfirmMsg': 'هل أنت متأكد من حذف نموذج السيناريو "{name}"؟ سيتم حذف جميع الإعدادات المحفوظة. لا يمكن التراجع عن هذا.',
    'page.scenarios.lockedTitle': 'تخطيط السيناريوهات مقفول',
    'page.scenarios.lockedDesc': 'محاكاة السيناريوهات وتحليل الحساسية وإسقاط التأثير حصرية لباقات الأعمال والمؤسسات.',
    'page.scenarios.noCompanyTitle': 'لا توجد شركة نشطة',
    'page.scenarios.noCompanyDesc': 'يرجى اختيار شركة من الشريط الجانبي قبل تخطيط السيناريوهات.',
    'page.scenarios.records': 'سجل',
    'page.scenarios.pleaseSelectCycle': 'يرجى اختيار دورة تخطيط.',
    'page.scenarios.pleaseSelectTemplate': 'يرجى اختيار قالب نموذج سيناريو.',
    'page.scenarios.templateNotFound': 'نموذج السيناريو المحدد غير موجود.',
    'page.scenarios.assumptionsMissing': 'افتراضات السيناريو مفقودة.',
    'page.scenarios.pctInvalid': 'النسبة المئوية مفقودة أو غير صالحة في إعدادات السيناريو.',
    'page.scenarios.currMissing': 'عملات الصرف (من/إلى) مفقودة في إعدادات السعر.',
    'page.scenarios.rateInvalid': 'سعر الصرف الجديد مفقود أو غير صالح في إعدادات السعر.',
    'page.scenarios.siteMissing': 'اسم الفرع/الموقع المحاكى مفقود في إعدادات توسيع الفرع.',
    'page.scenarios.revenueMissing': 'مبلغ الإيراد السنوي مفقود أو غير صالح في إعدادات توسيع الفرع.',
    'page.scenarios.expenseMissing': 'مبلغ المصروف السنوي مفقود أو غير صالح في إعدادات توسيع الفرع.',
    'page.scenarios.revAccMissing': 'حساب الإيراد في دفتر الأستاذ العام مفقود في إعدادات توسيع الفرع.',
    'page.scenarios.expAccMissing': 'حساب المصروف في دفتر الأستاذ العام مفقود في إعدادات توسيع الفرع.',
    'page.scenarios.invalidSubtype': 'نوع فرعي غير صالح للسيناريو: {sub}',

    /* Reports */
    'page.reports.title': 'التقارير والتحليلات',
    'page.reports.description': 'تشغيل تقارير ذكية في الوقت الفعلي من دفاتر الأستاذ وقوائم التصنيع والتوقعات.',
    'page.reports.financialStatements': 'القوائم المالية',
    'page.reports.performanceVariances': 'الأداء والانحرافات',
    'page.reports.operationsCosting': 'العمليات والتكاليف',
    'page.reports.filterFiscalYear': 'السنة المالية',
    'page.reports.filterMonth': 'الشهر',
    'page.reports.filterSite': 'الموقع المستهدف',
    'page.reports.filterProduct': 'رمز المنتج',
    'page.reports.filterCustomer': 'العميل',
    'page.reports.recordsRetrieved': '{n} سجل مسترد',
    'page.reports.exportCsv': 'تصدير CSV',
    'page.reports.refresh': 'تحديث',
    'page.reports.emptyTitle': 'لم يتم العثور على بنود تقرير',
    'page.reports.emptyDesc': 'قم بتعديل عوامل التصفية أو تأكد من تحميل الفعليات و فترات التوقعات.',
    'page.reports.noCompanyTitle': 'لا توجد شركة نشطة',
    'page.reports.noCompanyDesc': 'يرجى اختيار شركة من الشريط الجانبي قبل عرض التقارير.',

    /* Settings */
    'page.settings.title': 'الإعدادات',
    'page.settings.description': 'إدارة تكوين الشركة وتفضيلات الجلسة.',
    'page.settings.companyProfile': 'ملف الشركة',
    'page.settings.companyProfileDesc': 'الشركة النشطة: {name} · المعرف {id}',
    'page.settings.activeSession': 'الجلسة النشطة',
    'page.settings.activeSessionDesc': 'تفاصيل المستخدم والمؤسسة الحالية — للقراءة فقط',
    'page.settings.subscriptionPlans': 'خطة الاشتراك والفواتير',
    'page.settings.subscriptionPlansDesc': 'اختر الميزات والحجم المناسب لمؤسستك',
    'page.settings.companyName': 'اسم الشركة',
    'page.settings.companyCode': 'كود الشركة',
    'page.settings.defaultCurrency': 'العملة الافتراضية',
    'page.settings.fiscalYearStart': 'شهر بداية السنة المالية',
    'page.settings.selectCurrency': '— اختر العملة —',
    'page.settings.companyId': 'معرف الشركة',
    'page.settings.tenantId': 'معرف المؤسسة',
    'page.settings.fullName': 'الاسم الكامل',
    'page.settings.emailAddress': 'البريد الإلكتروني',
    'page.settings.role': 'الدور',
    'page.settings.userId': 'معرف المستخدم',
    'page.settings.activeCompanyId': 'معرف الشركة النشطة',
    'page.settings.subscriptionPlan': 'خطة الاشتراك',
    'page.settings.sessionDisclaimer': 'تتم إدارة تفاصيل الجلسة بواسطة نظام المصادقة ولا يمكن تعديلها هنا. لتغيير كلمة المرور أو البريد الإلكتروني، اتصل بمسؤول المؤسسة.',
    'page.settings.discardReload': 'تجاهل وإعادة تحميل',
    'page.settings.saving': 'جارٍ الحفظ...',
    'page.settings.saveChanges': 'حفظ التغييرات',
    'page.settings.savedSuccess': 'تم تحديث ملف الشركة بنجاح.',
    'page.settings.monthly': 'شهري',
    'page.settings.yearly': 'سنوي',
    'page.settings.savePercent': 'وفر ~17%',
    'page.settings.mostPopular': 'الأكثر شيوعًا',
    'page.settings.completeSuite': 'الباقة المتكاملة',
    'page.settings.activePlan': 'الخطة النشطة',
    'page.settings.upgrading': 'جارٍ الترقية...',
    'page.settings.selectPlan': 'اختر {name}',
    'page.settings.companies': 'الشركات',
    'page.settings.users': 'المستخدمين',
    'page.settings.branches': 'الفروع',
    'page.settings.unlimited': 'غير محدود',
    'page.settings.dashboardLabel': 'لوحة التحكم',
    'page.settings.perMonth': '/ شهريًا',
    'page.settings.perYear': '/ سنويًا',
    'page.settings.billedAnnually': '${price}/شهر مدفوع سنويًا',

    /* Page titles */
    'page.variance.title': 'تحليل الانحراف',
    'page.inventory.title': 'المخزون',
    'page.approvals.title': 'الموافقات',
    'page.promotions.title': 'العروض الترويجية',
    'page.rawMaterialPrices.title': 'أسعار المواد الخام',
    'page.actualImports.title': 'استيراد الفعلي',
    'page.companies.title': 'الشركات',
    'page.sites.title': 'المواقع',
    'page.units.title': 'وحدات القياس',
    'page.accounts.title': 'دليل الحسابات',
    'page.costCenters.title': 'مراكز التكلفة',
    'page.productCategories.title': 'تصنيفات المنتجات',
    'page.suppliers.title': 'الموردين',
    'page.customers.title': 'العملاء',
    'page.products.title': 'المنتجات',
    'page.materials.title': 'المواد الخام',
    'page.bomRecipes.title': 'وصفات التصنيع',
    'page.kpiTargets.title': 'مستهدفات الأداء',
    'page.notificationRules.title': 'قواعد الإشعارات',
    'page.auditLogs.title': 'سجل التدقيق',
    'page.users.title': 'المستخدمين',
    'page.exchangeRates.title': 'أسعار الصرف',
    'page.connections.title': 'الاتصالات',
    'page.importMappings.title': 'تعيينات الاستيراد',
    'page.productionPlanning.title': 'تخطيط الإنتاج',
    'page.headcountPlans.title': 'خطط التوظيف',
    'page.modules.title': 'الوحدات',
    'page.notifications.title': 'الإشعارات',

    /* Auth */
    'auth.signInTitle': 'تسجيل الدخول إلى حسابك',
    'auth.signInSubtitle': 'أدخل بيانات الاعتماد الخاصة بك للوصول إلى المنصة',
    'auth.noAccount': 'ليس لديك حساب؟',
    'auth.forgotPassword': 'نسيت كلمة المرور؟',
    'auth.invalidCredentials': 'بيانات الاعتماد غير صالحة. يرجى التحقق من معرف المؤسسة والبريد الإلكتروني وكلمة المرور.',
  },
};
