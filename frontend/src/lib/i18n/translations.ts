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
  | 'common.saveChanges'
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
  | 'common.saving'
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
  | 'common.notifications'
  | 'common.unread'
  | 'common.noUnreadAlerts'
  | 'common.everythingRunning'
  | 'common.markAsRead'
  | 'common.viewAllAlerts'
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
  | 'common.unknown'
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
  | 'common.days'
  | 'common.items'
  | 'common.period'
  | 'common.region'
  | 'common.address'
  | 'common.startDate'
  | 'common.endDate'
  | 'common.budget'
  | 'common.cost'
  | 'common.revenue'
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
  /* ── Entity types ────────────────────────────────────────────────────── */
  | 'entityType.user'
  | 'entityType.company'
  | 'entityType.tenant'
  | 'entityType.bomRecipe'
  | 'entityType.budgetCycle'
  | 'entityType.forecastCycle'
  | 'entityType.scenario'
  | 'entityType.actualImport'
  | 'entityType.account'
  | 'entityType.site'
  /* ── Actions ──────────────────────────────────────────────────────────── */
  | 'action.login'
  | 'action.update'
  | 'action.delete'
  | 'action.create'
  | 'action.statusChange'
  /* ── Site types ───────────────────────────────────────────────────────── */
  | 'siteType.factory'
  | 'siteType.branch'
  | 'siteType.warehouse'
  | 'siteType.office'
  | 'siteType.other'
  /* ── Source values ────────────────────────────────────────────────────── */
  | 'source.manual'
  | 'source.api'
  | 'source.import'
  /* ── Employment types ─────────────────────────────────────────────────── */
  | 'employmentType.fullTime'
  | 'employmentType.partTime'
  | 'employmentType.contract'
  | 'employmentType.seasonal'
  /* ── Unit names ───────────────────────────────────────────────────────── */
  | 'unit.kilogram'
  | 'unit.liter'
  | 'unit.metricTon'
  | 'unit.piece'
  /* ── Known names ──────────────────────────────────────────────────────── */
  | 'company.nileFreshRetailChain'
  | 'company.iDiibiManufacturingCo'
  | 'company.foodCompany'
  | 'costCenter.administration'
  | 'costCenter.productionDept'
  | 'costCenter.salesAndMarketing'
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
  /* ── AI Scenario Planner ────────────────────────────────────────────── */
  | 'page.scenarios.aiPlanner'
  | 'page.scenarios.generateAiScenario'
  | 'page.scenarios.aiSuggestionsUnavailable'
  | 'page.scenarios.applyToScenario'
  | 'page.scenarios.expectedImpact'
  | 'page.scenarios.recommendedActions'
  | 'page.scenarios.confidence'
  | 'page.scenarios.aiGenerating'
  | 'page.scenarios.aiGenerateFailed'
  | 'page.scenarios.assumptions'
  | 'page.scenarios.simulationInputs'
  /* ── AI Scenario type badges ──────────────────────────────────────────── */
  | 'page.scenarios.typeMaterialCost'
  | 'page.scenarios.typeCurrency'
  | 'page.scenarios.typeDemand'
  | 'page.scenarios.typeExpansion'
  | 'page.scenarios.typeMixed'
  /* ── AI Scenario impact labels ────────────────────────────────────────── */
  | 'page.scenarios.impactRevenue'
  | 'page.scenarios.impactCosts'
  | 'page.scenarios.impactGrossMargin'
  | 'page.scenarios.impactNetProfit'
  | 'page.scenarios.impactCashFlow'
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
  | 'page.approvals.description'
  | 'page.approvals.all'
  | 'page.approvals.pending'
  | 'page.approvals.approved'
  | 'page.approvals.rejected'
  | 'page.approvals.refresh'
  | 'page.approvals.entityType'
  | 'page.approvals.entityId'
  | 'page.approvals.status'
  | 'page.approvals.requestedBy'
  | 'page.approvals.createdAt'
  | 'page.approvals.noApprovals'
  | 'page.approvals.noApprovalsDesc'
  | 'page.approvals.noFilteredResults'
  | 'page.approvals.confirmApproval'
  | 'page.approvals.rejectRequest'
  | 'page.approvals.confirmApprovalDesc'
  | 'page.approvals.rejectRequestDesc'
  | 'page.approvals.cancel'
  | 'page.approvals.approve'
  | 'page.approvals.reject'
  | 'page.approvals.reasonRequired'
  | 'page.approvals.rejectPlaceholder'
  | 'page.approvals.commentOptional'
  | 'page.approvals.commentPlaceholder'
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
  | 'page.notifications.inboxTab'
  | 'page.notifications.rulesTab'
  | 'page.notifications.description'
  | 'page.notifications.emptyTitle'
  | 'page.notifications.emptyDescription'
  /* ── Actual Imports page ──────────────────────────────────────────────── */
  | 'page.actualImports.description'
  | 'page.actualImports.importButton'
  | 'page.actualImports.searchPlaceholder'
  | 'page.actualImports.colTypeSource'
  | 'page.actualImports.colPeriodCover'
  | 'page.actualImports.colUploadedAt'
  | 'page.actualImports.emptyTitle'
  | 'page.actualImports.emptyDesc'
  | 'page.actualImports.detailTitle'
  | 'page.actualImports.cardImportTypeSource'
  | 'page.actualImports.cardImportPeriod'
  | 'page.actualImports.cardUploadedDate'
  | 'page.actualImports.cardLinesImported'
  | 'page.actualImports.verifyFinalize'
  | 'page.actualImports.runValidation'
  | 'page.actualImports.postLedgerLines'
  | 'page.actualImports.linesPosted'
  | 'page.actualImports.validationErrorLog'
  | 'page.actualImports.importedLines'
  | 'page.actualImports.noLines'
  | 'page.actualImports.noLinesDesc'
  | 'page.actualImports.lineDate'
  | 'page.actualImports.lineAccount'
  | 'page.actualImports.lineSite'
  | 'page.actualImports.lineCC'
  | 'page.actualImports.lineDimension'
  | 'page.actualImports.lineRefNo'
  | 'page.actualImports.lineQty'
  | 'page.actualImports.linePrice'
  | 'page.actualImports.lineAmount'
  | 'page.actualImports.codePrefix'
  | 'page.actualImports.wizardTitle'
  | 'page.actualImports.wizardDesc'
  | 'page.actualImports.step1Label'
  | 'page.actualImports.step2Label'
  | 'page.actualImports.step3Label'
  | 'page.actualImports.sourceSystem'
  | 'page.actualImports.importType'
  | 'page.actualImports.periodFrom'
  | 'page.actualImports.periodTo'
  | 'page.actualImports.mappingTemplate'
  | 'page.actualImports.selectTemplate'
  | 'page.actualImports.nextPasteData'
  | 'page.actualImports.orUploadCsv'
  | 'page.actualImports.pastedGridCells'
  | 'page.actualImports.csvPlaceholder'
  | 'page.actualImports.backSetup'
  | 'page.actualImports.nextPreview'
  | 'page.actualImports.previewRow'
  | 'page.actualImports.previewAccountId'
  | 'page.actualImports.previewAmount'
  | 'page.actualImports.previewDate'
  | 'page.actualImports.previewStatus'
  | 'page.actualImports.analyzingSchema'
  | 'page.actualImports.resolved'
  | 'page.actualImports.noPreviewResolved'
  | 'page.actualImports.uploadValidate'
  | 'page.actualImports.backPasteData'
  | 'page.actualImports.previewResolution'
  | 'page.actualImports.deleteConfirm'
  | 'page.actualImports.backToList'
  | 'page.actualImports.retrieving'
  | 'page.actualImports.fetchFailed'
  | 'page.actualImports.validateFailed'
  | 'page.actualImports.validateSuccess'
  | 'page.actualImports.postSuccess'
  | 'page.actualImports.deleteSuccess'
  | 'page.actualImports.importCreated'
  | 'page.actualImports.fileLoaded'
  | 'page.actualImports.noCompanyDesc'
  | 'page.actualImports.pasteValidationError'
  /* ── Audit Logs page ──────────────────────────────────────────────────── */
  | 'page.auditLogs.description'
  | 'page.auditLogs.searchFilter'
  | 'page.auditLogs.searchPlaceholder'
  | 'page.auditLogs.entityType'
  | 'page.auditLogs.action'
  | 'page.auditLogs.allEntities'
  | 'page.auditLogs.allActions'
  | 'page.auditLogs.recordsTracked'
  | 'page.auditLogs.refreshLogs'
  | 'page.auditLogs.emptyTitle'
  | 'page.auditLogs.emptyDesc'
  | 'page.auditLogs.colTimestamp'
  | 'page.auditLogs.colOperator'
  | 'page.auditLogs.colAction'
  | 'page.auditLogs.colEntityType'
  | 'page.auditLogs.colEntityId'
  | 'page.auditLogs.colIpAddress'
  | 'page.auditLogs.viewDiff'
  | 'page.auditLogs.modalTitle'
  | 'page.auditLogs.logRecordId'
  | 'page.auditLogs.operator'
  | 'page.auditLogs.ipAddress'
  | 'page.auditLogs.timestamp'
  | 'page.auditLogs.userLabel'
  | 'page.auditLogs.system'
  | 'page.auditLogs.oldValues'
  | 'page.auditLogs.newValues'
  | 'page.auditLogs.noOldValues'
  | 'page.auditLogs.noNewValues'
  | 'page.auditLogs.closeDetail'
  | 'page.auditLogs.noCompanyDesc'
  | 'page.auditLogs.fetchFailed'
  | 'page.auditLogs.fetching'
  | 'page.auditLogs.noCompanyTitle'
  /* ── Import Modal component ────────────────────────────────────────────── */
  | 'component.importModal.title'
  | 'component.importModal.howItWorks'
  | 'component.importModal.instruction1'
  | 'component.importModal.instruction2'
  | 'component.importModal.instruction3'
  | 'component.importModal.instruction4'
  | 'component.importModal.instruction5'
  | 'component.importModal.downloadTemplate'
  | 'component.importModal.uploadFile'
  | 'component.importModal.dragDrop'
  | 'component.importModal.validatePreview'
  | 'component.importModal.validCount'
  | 'component.importModal.errorCount'
  | 'component.importModal.clearReUpload'
  | 'component.importModal.status'
  | 'component.importModal.importRows'
  | 'component.importModal.previewFailed'
  | 'component.importModal.importFailed'
  | 'component.importModal.downloadFailed'
  | 'component.importModal.noValidRows'
  | 'component.importModal.importSuccess'
  | 'component.importModal.close'
  | 'component.importModal.fileName'
  | 'component.importModal.noCommit'
  | 'component.importModal.rowFail'
  /* ── Auth page ──────────────────────────────────────────────────────── */
  | 'auth.signInTitle'
  | 'auth.signInSubtitle'
  | 'auth.noAccount'
  | 'auth.forgotPassword'
  | 'auth.invalidCredentials'
  /* ── Companies page ──────────────────────────────────────────────────── */
  | 'page.companies.description'
  | 'page.companies.addCompany'
  | 'page.companies.selectCompanyCallout'
  | 'page.companies.selectCompanyCalloutDesc'
  | 'page.companies.emptyTitle'
  | 'page.companies.emptyDescription'
  | 'page.companies.loading'
  | 'page.companies.fiscalYearStart'
  | 'page.companies.editTitle'
  | 'page.companies.createTitle'
  | 'page.companies.companyName'
  | 'page.companies.fiscalYearMonth'
  | 'page.companies.createCompany'
  | 'page.companies.saveChanges'
  | 'page.companies.deleteConfirmMsg'
  | 'page.companies.deletedSuccess'
  | 'page.companies.deleteFailed'
  | 'page.companies.unexpectedDeleteError'
  /* ── Exchange rates page ─────────────────────────────────────────────── */
  | 'page.exchangeRates.description'
  | 'page.exchangeRates.fromCurrency'
  | 'page.exchangeRates.toCurrency'
  | 'page.exchangeRates.exchangeRate'
  | 'page.exchangeRates.effectiveDate'
  | 'page.exchangeRates.source'
  | 'page.exchangeRates.addRate'
  | 'page.exchangeRates.syncUsd'
  | 'page.exchangeRates.syncSuccess'
  | 'page.exchangeRates.syncSuccessScenario'
  | 'page.exchangeRates.syncFailed'
  | 'page.exchangeRates.emptyTitle'
  | 'page.exchangeRates.emptyDesc'
  | 'page.exchangeRates.saveChanges'
  /* ── Raw material prices page ────────────────────────────────────────── */
  | 'page.rawMaterialPrices.description'
  | 'page.rawMaterialPrices.materialName'
  | 'page.rawMaterialPrices.price'
  | 'page.rawMaterialPrices.priceDate'
  | 'page.rawMaterialPrices.source'
  | 'page.rawMaterialPrices.material'
  | 'page.rawMaterialPrices.selectMaterial'
  | 'page.rawMaterialPrices.addPrice'
  | 'page.rawMaterialPrices.emptyTitle'
  | 'page.rawMaterialPrices.emptyDesc'
  | 'page.rawMaterialPrices.saveChanges'
  /* ── Sites page ──────────────────────────────────────────────────────── */
  | 'page.sites.description'
  | 'page.sites.siteName'
  | 'page.sites.type'
  | 'page.sites.status'
  | 'page.sites.region'
  | 'page.sites.address'
  | 'page.sites.create'
  | 'page.sites.emptyTitle'
  | 'page.sites.emptyDesc'
  | 'page.sites.saveChanges'
  /* ── Units page ──────────────────────────────────────────────────────── */
  | 'page.units.description'
  | 'page.units.unitName'
  | 'page.units.symbol'
  | 'page.units.create'
  | 'page.units.emptyTitle'
  | 'page.units.emptyDesc'
  | 'page.units.saveChanges'
  /* ── Accounts page ───────────────────────────────────────────────────── */
  | 'page.accounts.description'
  | 'page.accounts.accountCode'
  | 'page.accounts.accountName'
  | 'page.accounts.accountType'
  | 'page.accounts.parentId'
  | 'page.accounts.create'
  | 'page.accounts.emptyTitle'
  | 'page.accounts.emptyDesc'
  | 'page.accounts.saveChanges'
  /* ── Cost centers page ───────────────────────────────────────────────── */
  | 'page.costCenters.description'
  | 'page.costCenters.siteId'
  | 'page.costCenters.siteIdOptional'
  | 'page.costCenters.parentId'
  | 'page.costCenters.create'
  | 'page.costCenters.emptyTitle'
  | 'page.costCenters.emptyDesc'
  | 'page.costCenters.saveChanges'
  /* ── Product categories page ─────────────────────────────────────────── */
  | 'page.productCategories.description'
  | 'page.productCategories.categoryName'
  | 'page.productCategories.parentId'
  | 'page.productCategories.create'
  | 'page.productCategories.emptyTitle'
  | 'page.productCategories.emptyDesc'
  | 'page.productCategories.saveChanges'
  /* ── Suppliers page ──────────────────────────────────────────────────── */
  | 'page.suppliers.description'
  | 'page.suppliers.supplierCode'
  | 'page.suppliers.supplierName'
  | 'page.suppliers.contactEmail'
  | 'page.suppliers.contactPhone'
  | 'page.suppliers.create'
  | 'page.suppliers.emptyTitle'
  | 'page.suppliers.emptyDesc'
  | 'page.suppliers.saveChanges'
  /* ── Page: Production Planning ───────────────────────────────────────── */
  | 'page.productionPlanning.addProduct'
  | 'page.productionPlanning.allProductionCosts'
  | 'page.productionPlanning.capacityThreshold'
  | 'page.productionPlanning.capacityUtilization'
  | 'page.productionPlanning.description'
  | 'page.productionPlanning.explosionResults'
  | 'page.productionPlanning.fiscalYear'
  | 'page.productionPlanning.grandTotal'
  | 'page.productionPlanning.laborCost'
  | 'page.productionPlanning.lockedDescription'
  | 'page.productionPlanning.lockedTitle'
  | 'page.productionPlanning.material'
  | 'page.productionPlanning.materialCost'
  | 'page.productionPlanning.materialWastage'
  | 'page.productionPlanning.materialsTab'
  | 'page.productionPlanning.noMaterialsFound'
  | 'page.productionPlanning.noProductsMatch'
  | 'page.productionPlanning.overheadCost'
  | 'page.productionPlanning.product'
  | 'page.productionPlanning.productsTab'
  | 'page.productionPlanning.qty'
  | 'page.productionPlanning.quantity'
  | 'page.productionPlanning.removeLine'
  | 'page.productionPlanning.requiredQty'
  | 'page.productionPlanning.runBomExplosion'
  | 'page.productionPlanning.salesPlanLines'
  | 'page.productionPlanning.saveAsPlan'
  | 'page.productionPlanning.savePlanModalTitle'
  | 'page.productionPlanning.selectProduct'
  | 'page.productionPlanning.selectSite'
  | 'page.productionPlanning.sku'
  | 'page.productionPlanning.targetFactorySite'
  | 'page.productionPlanning.targetMonth'
  | 'page.productionPlanning.totalCost'
  | 'page.productionPlanning.totalQty'
  | 'page.productionPlanning.totalWastage'
  | 'page.productionPlanning.totals'
  | 'page.productionPlanning.unitPrice'
  | 'page.productionPlanning.unitsPlanned'
  | 'page.productionPlanning.version'
  | 'page.productionPlanning.wastageCost'
  | 'page.productionPlanning.wastageQty'
  /* ── Page: Headcount Plans ──────────────────────────────────────────── */
  | 'page.headcount.addNewPosition'
  | 'page.headcount.addPosition'
  | 'page.headcount.allSites'
  | 'page.headcount.basic'
  | 'page.headcount.costByDepartment'
  | 'page.headcount.costCenterOptional'
  | 'page.headcount.count'
  | 'page.headcount.deleteConfirmMsg'
  | 'page.headcount.department'
  | 'page.headcount.departmentsConfigured'
  | 'page.headcount.description'
  | 'page.headcount.editPosition'
  | 'page.headcount.employmentType'
  | 'page.headcount.headcount'
  | 'page.headcount.jobTitle'
  | 'page.headcount.month'
  | 'page.headcount.monthlyAllowances'
  | 'page.headcount.monthlyBasicSalary'
  | 'page.headcount.monthlyDistribution'
  | 'page.headcount.noCycleSelected'
  | 'page.headcount.noCycleSelectedDesc'
  | 'page.headcount.none'
  | 'page.headcount.planningMonth'
  | 'page.headcount.positionAdded'
  | 'page.headcount.positionDeleted'
  | 'page.headcount.positionUpdated'
  | 'page.headcount.selectBudgetCycle'
  | 'page.headcount.siteOptional'
  | 'page.headcount.socialInsurance'
  | 'page.headcount.title'
  | 'page.headcount.totalCost'
  | 'page.headcount.totalPositions'
  | 'page.headcount.totalWorkforceCost'
  | 'page.headcount.type'
  | 'page.headcount.workforceBudgetTable'
  /* ── Page: Inventory ────────────────────────────────────────────────── */
  | 'page.inventory.365plusDays'
  | 'page.inventory.avgDailyOutflow'
  | 'page.inventory.avgStockCoverage'
  | 'page.inventory.coverageAnalysis'
  | 'page.inventory.coverageDays'
  | 'page.inventory.critical'
  | 'page.inventory.date'
  | 'page.inventory.description'
  | 'page.inventory.finishedGoodProduct'
  | 'page.inventory.itemName'
  | 'page.inventory.itemType'
  | 'page.inventory.lowStockAlerts'
  | 'page.inventory.material'
  | 'page.inventory.nDays'
  | 'page.inventory.nItems'
  | 'page.inventory.noCoverageData'
  | 'page.inventory.noCoverageDataDesc'
  | 'page.inventory.noSlowMoving'
  | 'page.inventory.noSlowMovingDesc'
  | 'page.inventory.noSnapshots'
  | 'page.inventory.noSnapshotsDesc'
  | 'page.inventory.product'
  | 'page.inventory.qtyOnHand'
  | 'page.inventory.qtyRecorded'
  | 'page.inventory.rawMaterialIngredient'
  | 'page.inventory.record'
  | 'page.inventory.recordSnapshot'
  | 'page.inventory.riskLevel'
  | 'page.inventory.siteCol'
  | 'page.inventory.siteWarehouse'
  | 'page.inventory.skuCode'
  | 'page.inventory.slowMovingWarning'
  | 'page.inventory.snapshotDate'
  | 'page.inventory.snapshotFailed'
  | 'page.inventory.snapshotRecorded'
  | 'page.inventory.snapshotsLog'
  | 'page.inventory.totalItemsInStock'
  | 'page.inventory.totalValuation'
  | 'page.inventory.type'
  | 'page.inventory.valuation'
  | 'page.inventory.value'
  | 'page.inventory.warehouseSite'
  | 'page.inventory.warning'
  /* ── Page: Promotions ───────────────────────────────────────────────── */
  | 'page.promotions.active'
  | 'page.promotions.actualCost'
  | 'page.promotions.allProducts'
  | 'page.promotions.budget'
  | 'page.promotions.deleteConfirmMsg'
  | 'page.promotions.description'
  | 'page.promotions.discount'
  | 'page.promotions.discountAmount'
  | 'page.promotions.discountPct'
  | 'page.promotions.editPromotion'
  | 'page.promotions.endDate'
  | 'page.promotions.inactive'
  | 'page.promotions.incrementalRevenue'
  | 'page.promotions.name'
  | 'page.promotions.newPromotion'
  | 'page.promotions.noPromotions'
  | 'page.promotions.noPromotionsDesc'
  | 'page.promotions.period'
  | 'page.promotions.product'
  | 'page.promotions.promotionCreated'
  | 'page.promotions.promotionDeleteFailed'
  | 'page.promotions.promotionDeleted'
  | 'page.promotions.promotionUpdated'
  | 'page.promotions.revenueImpact'
  | 'page.promotions.roi'
  | 'page.promotions.search'
  | 'page.promotions.startDate'
  | 'page.promotions.status'

  /* ── Page: BOM Recipes ───────────────────────────────────────────────── */
  | 'page.bomRecipes.description'
  | 'page.bomRecipes.emptyDescription'
  | 'page.bomRecipes.emptyTitle'
  | 'page.bomRecipes.lockedDescription'
  | 'page.bomRecipes.lockedTitle'

  /* ── Page: Customers ──────────────────────────────────────────────────── */
  | 'page.customers.description'
  | 'page.customers.emptyDescription'
  | 'page.customers.emptyTitle'

  /* ── Page: Integrations ───────────────────────────────────────────────── */
  | 'page.integrations.title'
  | 'page.integrations.description'
  | 'page.integrations.connectionsHeader'
  | 'page.integrations.mappingsHeader'
  | 'page.integrations.connectionsDescription'
  | 'page.integrations.mappingsDescription'
  | 'page.integrations.addConnection'
  | 'page.integrations.addMapping'
  | 'page.integrations.selectConnection'
  | 'page.integrations.selectMapping'
  | 'page.integrations.mappingName'
  | 'page.integrations.sourceSystem'
  | 'page.integrations.dataType'
  | 'page.integrations.isDefault'
  | 'page.integrations.status'
  | 'page.integrations.connectionAdapter'
  | 'page.integrations.testConnection'
  | 'page.integrations.connectionSuccessful'
  | 'page.integrations.connectionFailed'
  | 'page.integrations.importMappingTemplate'
  | 'page.integrations.manualDataSync'
  | 'page.integrations.triggerManualSync'
  | 'page.integrations.triggerSynchronization'
  | 'page.integrations.syncDescription'
  | 'page.integrations.syncPeriodFrom'
  | 'page.integrations.syncPeriodTo'
  | 'page.integrations.recordsSynced'
  | 'page.integrations.syncCompleted'
  | 'page.integrations.syncFailed'
  | 'page.integrations.lockedTitle'
  | 'page.integrations.lockedDescription'
  | 'page.integrations.noConnectionsTitle'
  | 'page.integrations.noConnectionsDescription'
  | 'page.integrations.noMappingsTitle'
  | 'page.integrations.noMappingsDescription'
  | 'page.integrations.loadingConnections'
  | 'page.integrations.loadingMappings'

  /* ── Page: KPI Targets ───────────────────────────────────────────────── */
  | 'page.kpiTargets.description'
  | 'page.kpiTargets.emptyDescription'
  | 'page.kpiTargets.emptyTitle'

  /* ── Page: Materials ──────────────────────────────────────────────────── */
  | 'page.materials.description'
  | 'page.materials.emptyDescription'
  | 'page.materials.emptyTitle'

  /* ── Page: Notification Rules ─────────────────────────────────────────── */
  | 'page.notificationRules.ruleName'
  | 'page.notificationRules.triggerType'
  | 'page.notificationRules.threshold'
  | 'page.notificationRules.channel'
  | 'page.notificationRules.triggerEvent'
  | 'page.notificationRules.thresholdPct'
  | 'page.notificationRules.thresholdAmount'
  | 'page.notificationRules.accountScope'
  | 'page.notificationRules.siteScope'
  | 'page.notificationRules.createRule'
  | 'page.notificationRules.description'
  | 'page.notificationRules.emptyDescription'
  | 'page.notificationRules.emptyTitle'

  /* ── Page: Product Categories ─────────────────────────────────────────── */
  | 'page.productCategories.emptyDescription'

  /* ── Page: Products ───────────────────────────────────────────────────── */
  | 'page.products.description'
  | 'page.products.emptyDescription'
  | 'page.products.emptyTitle'

  /* ── Page: Suppliers ──────────────────────────────────────────────────── */
  | 'page.suppliers.emptyDescription'

  /* ── Page: Users ──────────────────────────────────────────────────────── */
  | 'page.users.description'
  | 'page.users.emptyDescription'
  | 'page.users.emptyTitle'

  /* ── Page: Variance ───────────────────────────────────────────────────── */
  | 'page.variance.description'
  | 'page.variance.budgetVsActual'
  | 'page.variance.budgetVsForecast'
  | 'page.variance.actualVsForecast'
  | 'page.variance.threeWay'
  | 'page.variance.filterAnalysis'
  | 'page.variance.fiscalYear'
  | 'page.variance.periodMonth'
  | 'page.variance.account'
  | 'page.variance.site'
  | 'page.variance.product'
  | 'page.variance.customer'
  | 'page.variance.allMonths'
  | 'page.variance.allAccounts'
  | 'page.variance.allSites'
  | 'page.variance.allProducts'
  | 'page.variance.allCustomers'
  | 'page.variance.search'
  | 'page.variance.refresh'
  | 'page.variance.period'
  | 'page.variance.productCustomer'
  | 'page.variance.budget'
  | 'page.variance.actual'
  | 'page.variance.forecast'
  | 'page.variance.actVsBud'
  | 'page.variance.forVsBud'
  | 'page.variance.forVsAct'
  | 'page.variance.noData'
  | 'page.variance.noDataDesc'
  | 'page.variance.varianceActBud'
  | 'page.variance.varianceForBud'
  | 'page.variance.varianceForAct'

  | 'common.role'
  | 'common.selectRole'
  | 'page.bomRecipes.addLine'
  | 'page.bomRecipes.bomLinesSection'
  | 'page.bomRecipes.createRecipe'
  | 'page.bomRecipes.itemsUnit'
  | 'page.bomRecipes.laborCost'
  | 'page.bomRecipes.linePrefix'
  | 'page.bomRecipes.linesHeader'
  | 'page.bomRecipes.loadMetaError'
  | 'page.bomRecipes.material'
  | 'page.bomRecipes.noLinesError'
  | 'page.bomRecipes.noLinesText'
  | 'page.bomRecipes.noMaterialError'
  | 'page.bomRecipes.noProductError'
  | 'page.bomRecipes.outputQty'
  | 'page.bomRecipes.overheadCost'
  | 'page.bomRecipes.product'
  | 'page.bomRecipes.qtyError'
  | 'page.bomRecipes.qtyPerOutput'
  | 'page.bomRecipes.removeLine'
  | 'page.bomRecipes.selectMaterial'
  | 'page.bomRecipes.selectProduct'
  | 'page.bomRecipes.unitCost'
  | 'page.bomRecipes.version'
  | 'page.bomRecipes.wastagePct'
  | 'page.customers.contactEmail'
  | 'page.customers.contactPhone'
  | 'page.customers.createCustomer'
  | 'page.customers.customerCode'
  | 'page.customers.customerName'
  | 'page.kpiTargets.kpiName'
  | 'page.materials.createMaterial'
  | 'page.materials.materialCode'
  | 'page.materials.materialName'
  | 'page.materials.purchasePrice'
  | 'page.materials.safetyStock'
  | 'page.materials.supplierId'
  | 'page.materials.unitId'
  | 'page.productCategories.createCategory'
  | 'page.productCategories.parentIdOptional'
  | 'page.productCategories.parentIdPlaceholder'
  | 'page.products.categoryId'
  | 'page.products.createProduct'
  | 'page.products.productName'
  | 'page.products.salePrice'
  | 'page.products.sku'
  | 'page.products.standardCost'
  | 'page.products.unitId'
  | 'page.suppliers.createSupplier'
  | 'page.users.createUser'
  | 'page.users.lastLogin'
  | 'page.users.namePlaceholder'
  | 'page.users.passwordPlaceholder'
  | 'page.kpiTargets.annual'
  | 'page.kpiTargets.category'
  | 'page.kpiTargets.createTarget'
  | 'page.kpiTargets.fiscalYear'
  | 'page.kpiTargets.monthOptional'
  | 'page.kpiTargets.siteScope'
  | 'page.kpiTargets.targetValue'
  | 'page.kpiTargets.unit'
  | 'kpiCategory.financial'
  | 'kpiCategory.hr'
  | 'kpiCategory.operational'
  | 'kpiCategory.production'
  | 'kpiCategory.sales'
  | 'common.pending'
  | 'common.approved'
  | 'common.rejected'
  | 'common.draft'
  | 'common.submitted'
  | 'common.completed'
  | 'common.cancelled'
  | 'common.submit'
  | 'common.login'
  | 'common.logout'
  | 'common.approve'
  | 'common.reject'
  | 'common.permission'
  | 'page.notificationRules.changeable'
  /* ── Error messages ──────────────────────────────────────────────────── */
  | 'error.dashboardLoadFailed'
  | 'error.networkError'
  | 'error.sessionExpired'
  | 'error.requestFailed'
  | 'error.operationFailed'
  | 'error.unexpectedError'
  | 'error.loadFailed'
  | 'error.saveFailed'
  | 'error.notFound'
  | 'error.serverError'
  | 'error.markReadFailed'
  | 'error.deleteFailed'
  | 'error.fetchFailed'
  | 'error.notificationsFetchFailed'
  | 'error.rulesFetchFailed'
  | 'error.ruleSaveFailed'
  | 'error.ruleDeleteFailed'
  /* ── Notification translations ───────────────────────────────────────── */
  | 'notification.budgetThresholdExceeded'
  | 'notification.spendingAlert'
  | 'notification.approvalRequired'
  | 'notification.newReportAvailable'
  | 'notification.budgetThresholdBody'
  | 'notification.spendingBody'
  | 'notification.approvalBody'
  | 'notification.newReportBody'
  | 'notification.usdRateIncrease'
  | 'notification.scenarioTriggered'
  /* ── Auth keys ──────────────────────────────────────────────────────── */
  | 'auth.apiNotFound'
  | 'auth.connectionFailed'
  | 'auth.protectedBy'
  /* ── Production Planning keys ───────────────────────────────────────── */
  | 'page.productionPlanning.savedSuccess'
  | 'page.productionPlanning.saveFailed'
  | 'page.productionPlanning.loadProductsFailed'
  | 'page.productionPlanning.quantityGreaterThanZero'
  | 'page.productionPlanning.bomExplosionComplete'
  | 'page.productionPlanning.bomExplosionFailed'
  /* ── Integrations keys ──────────────────────────────────────────────── */
  | 'page.integrations.fetchConnectionsFailed'
  | 'page.integrations.fetchMappingsFailed'
  | 'page.integrations.oauthSuccess'
  | 'page.integrations.testSucceeded'
  | 'page.integrations.testFailed'
  | 'page.integrations.testRequestFailed'
  | 'page.integrations.connectionDeleted'
  | 'page.integrations.deleteConnectionFailed'
  | 'page.integrations.mappingDeleted'
  | 'page.integrations.deleteMappingFailed'
  | 'page.integrations.syncComplete'
  | 'page.integrations.syncFailedManual'
  | 'page.integrations.mappingNotFound'
  | 'page.integrations.previewSuccess'
  | 'page.integrations.previewFailed'
  | 'page.integrations.connectionUpdated'
  | 'page.integrations.connectionCreated'
  | 'page.integrations.saveConnectionFailed'
  | 'page.integrations.mappingUpdated'
  | 'page.integrations.mappingCreated'
  | 'page.integrations.saveMappingFailed'
  | 'page.integrations.fieldRequired'
  /* ── Forecasts keys ─────────────────────────────────────────────────── */
  | 'page.forecasts.fetchFailed'
  | 'page.forecasts.detailsFailed'
  | 'page.forecasts.statusUpdateFailed'
  | 'page.forecasts.generateLinesFailed'
  | 'page.forecasts.deleteFailed'
  | 'page.forecasts.updatedSuccess'
  | 'page.forecasts.createdSuccess'
  | 'page.forecasts.saveFailed'
  /* ── Budgets keys ───────────────────────────────────────────────────── */
  | 'page.budgets.fetchFailed'
  | 'page.budgets.detailsFailed'
  | 'page.budgets.statusUpdateFailed'
  | 'page.budgets.deleteFailed'
  | 'page.budgets.saveFailed'
  /* ── Reports keys ───────────────────────────────────────────────────── */
  | 'page.reports.fetchFailed'
  | 'page.reports.exportFailed'
  /* ── Settings keys ──────────────────────────────────────────────────── */
  | 'page.settings.loadPlansFailed'
  | 'page.settings.upgradeSuccess'
  | 'page.settings.upgradeFailed'
  | 'page.settings.loadCompanyFailed'
  | 'page.settings.saveCompanyFailed'
  /* ── Variance keys ──────────────────────────────────────────────────── */
  | 'page.variance.fetchFailed'
  /* ── Approvals keys ─────────────────────────────────────────────────── */
  | 'page.approvals.loadFailed'
  /* ── Promotions keys ────────────────────────────────────────────────── */
  | 'page.promotions.loadFailed'
  /* ── Scenarios keys ─────────────────────────────────────────────────── */
  | 'page.scenarios.fetchFailed'
  /* ── Headcount Plans keys ───────────────────────────────────────────── */
  | 'page.headcountPlans.fetchFailed'
  /* ── Inventory keys ─────────────────────────────────────────────────── */
  | 'page.inventory.fetchFailed'
  /* ── Backend error code translations ─────────────────────────────────── */
  | 'backend.ORACLE_TABLE_NOT_FOUND'
  | 'backend.ORACLE_INVALID_COLUMN'
  | 'backend.ORACLE_INVALID_CREDENTIALS'
  | 'backend.ORACLE_CONNECTION_FAILED'
  | 'backend.ORACLE_CLIENT_NOT_CONFIGURED'
  | 'backend.ORACLE_UNKNOWN'
  | 'backend.MAPPING_VALIDATION_FAILED'
  | 'backend.MAPPING_NOT_FOUND'
  | 'backend.SYNC_FAILED'
  | 'backend.SYNC_NO_ROWS'
  | 'backend.PREVIEW_FAILED'
  | 'backend.PREVIEW_INVALID_TABLE'
  | 'backend.PREVIEW_INVALID_COLUMN'
  | 'backend.CONNECTION_NOT_FOUND'
  | 'backend.CONNECTION_TEST_FAILED'
  | 'backend.AI_UNAVAILABLE'
  | 'backend.AI_INVALID_RESPONSE'
  | 'backend.AI_GENERATION_FAILED'
  | 'backend.AI_PROVIDER_OVERLOADED'
  | 'backend.AUTH_INVALID_CREDENTIALS'
  | 'backend.AUTH_USER_INACTIVE'
  | 'backend.AUTH_TOKEN_EXPIRED'
  | 'backend.AUTH_TENANT_REQUIRED'
  | 'backend.AUTH_TENANT_INVALID'
  | 'backend.NOT_FOUND'
  | 'backend.VALIDATION_FAILED'
  | 'backend.COMPANY_NOT_FOUND'
  | 'backend.DEFAULT';

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
    'common.saveChanges': 'Save Changes',
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
    'common.notifications': 'Notifications',
    'common.unread': 'unread',
    'common.noUnreadAlerts': 'No unread alerts',
    'common.everythingRunning': 'Everything is running smoothly.',
    'common.markAsRead': 'Mark as Read',
    'common.viewAllAlerts': 'View All Alerts',
    'common.confirmDelete': 'Confirm Delete',
    'common.confirmDeleteMessage': 'Are you sure you want to delete this item? This action cannot be undone.',
    'common.cancelDelete': 'Cancel',
    'common.createdSuccess': 'Created successfully.',
    'common.unknown': 'Unknown',
    'common.updatedSuccess': 'Updated successfully.',
    'common.deletedSuccess': 'Deleted successfully.',
    'common.saving': 'Saving...',
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
    'common.days': 'Days',
    'common.items': 'Items',
    'common.period': 'Period',
    'common.region': 'Region',
    'common.address': 'Address',
    'common.startDate': 'Start Date',
    'common.endDate': 'End Date',
    'common.budget': 'Budget',
    'common.cost': 'Cost',
    'common.revenue': 'Revenue',

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

    /* Entity types */
    'entityType.user': 'User',
    'entityType.company': 'Company',
    'entityType.tenant': 'Tenant',
    'entityType.bomRecipe': 'BOM Recipe',
    'entityType.budgetCycle': 'Budget Cycle',
    'entityType.forecastCycle': 'Forecast Cycle',
    'entityType.scenario': 'Scenario',
    'entityType.actualImport': 'Actual Import',
    'entityType.account': 'Account',
    'entityType.site': 'Site',

    /* Actions */
    'action.login': 'Login',
    'action.update': 'Update',
    'action.delete': 'Delete',
    'action.create': 'Create',
    'action.statusChange': 'Status Change',

    /* Site types */
    'siteType.factory': 'Factory',
    'siteType.branch': 'Branch',
    'siteType.warehouse': 'Warehouse',
    'siteType.office': 'Office',
    'siteType.other': 'Other',

    /* Source values */
    'source.manual': 'Manual',
    'source.api': 'API',
    'source.import': 'Imported',

    /* Employment types */
    'employmentType.fullTime': 'Full Time',
    'employmentType.partTime': 'Part Time',
    'employmentType.contract': 'Contract',
    'employmentType.seasonal': 'Seasonal',

    /* Unit names */
    'unit.kilogram': 'Kilogram',
    'unit.liter': 'Liter',
    'unit.metricTon': 'Metric Ton',
    'unit.piece': 'Piece',

    /* Known names */
    'company.nileFreshRetailChain': 'Nile Fresh Retail Chain',
    'company.iDiibiManufacturingCo': 'iDiibi Manufacturing Co',
    'company.foodCompany': 'Food Company',
    'costCenter.administration': 'Administration',
    'costCenter.productionDept': 'Production Dept',
    'costCenter.salesAndMarketing': 'Sales & Marketing',

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

    /* AI Scenario Planner */
    'page.scenarios.aiPlanner': 'AI Scenario Planner',
    'page.scenarios.generateAiScenario': 'Generate AI Scenario',
    'page.scenarios.aiSuggestionsUnavailable': 'AI suggestions unavailable. Please configure GEMINI_API_KEY.',
    'page.scenarios.applyToScenario': 'Apply to Scenario',
    'page.scenarios.expectedImpact': 'Expected Impact',
    'page.scenarios.recommendedActions': 'Recommended Actions',
    'page.scenarios.confidence': 'Confidence',
    'page.scenarios.aiGenerating': 'Generating AI scenarios...',
    'page.scenarios.aiGenerateFailed': 'Failed to generate AI scenarios.',
    'page.scenarios.assumptions': 'Assumptions',
    'page.scenarios.simulationInputs': 'Simulation Inputs',
    /* AI Scenario type badges */
    'page.scenarios.typeMaterialCost': 'Material Cost',
    'page.scenarios.typeCurrency': 'Currency',
    'page.scenarios.typeDemand': 'Demand',
    'page.scenarios.typeExpansion': 'Expansion',
    'page.scenarios.typeMixed': 'Mixed',
    /* AI Scenario impact labels */
    'page.scenarios.impactRevenue': 'Revenue',
    'page.scenarios.impactCosts': 'Costs',
    'page.scenarios.impactGrossMargin': 'Gross Margin',
    'page.scenarios.impactNetProfit': 'Net Profit',
    'page.scenarios.impactCashFlow': 'Cash Flow',

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
    'page.approvals.description': 'Review and manage approval requests',
    'page.approvals.all': 'All',
    'page.approvals.pending': 'Pending',
    'page.approvals.approved': 'Approved',
    'page.approvals.rejected': 'Rejected',
    'page.approvals.refresh': 'Refresh',
    'page.approvals.entityType': 'Entity Type',
    'page.approvals.entityId': 'Entity ID',
    'page.approvals.status': 'Status',
    'page.approvals.requestedBy': 'Requested By',
    'page.approvals.createdAt': 'Created At',
    'page.approvals.noApprovals': 'No approvals found',
    'page.approvals.noApprovalsDesc': 'No approval requests have been created yet.',
    'page.approvals.noFilteredResults': 'No {status} approval requests.',
    'page.approvals.confirmApproval': 'Confirm Approval',
    'page.approvals.rejectRequest': 'Reject Request',
    'page.approvals.confirmApprovalDesc': 'Approve the {entityType} request (ID: {entityId})?',
    'page.approvals.rejectRequestDesc': 'Provide a reason for rejecting the {entityType} request (ID: {entityId}).',
    'page.approvals.cancel': 'Cancel',
    'page.approvals.approve': 'Approve',
    'page.approvals.reject': 'Reject',
    'page.approvals.reasonRequired': 'Reason (required)',
    'page.approvals.rejectPlaceholder': 'Explain why this request is being rejected...',
    'page.approvals.commentOptional': 'Comment (optional)',
    'page.approvals.commentPlaceholder': 'Add a note...',
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
    'page.notifications.inboxTab': 'Notifications Inbox',
    'page.notifications.rulesTab': 'Alert Rules',
    'page.notifications.description': 'System notifications and compliance warnings.',
    'page.notifications.emptyTitle': 'Inbox is clean!',
    'page.notifications.emptyDescription': 'No new notifications. Everything matches standard tolerances.',

    /* Actual Imports */
    'page.actualImports.description': 'Import accounting transactions from ERP or spreadsheets.',
    'page.actualImports.importButton': 'Import actuals',
    'page.actualImports.searchPlaceholder': 'Search imports…',
    'page.actualImports.colTypeSource': 'Type / Source',
    'page.actualImports.colPeriodCover': 'Period Cover',
    'page.actualImports.colUploadedAt': 'Uploaded At',
    'page.actualImports.emptyTitle': 'No data imported',
    'page.actualImports.emptyDesc': 'Begin by pasting transaction rows to map actual expenditures and sales.',
    'page.actualImports.detailTitle': 'Import #{id}',
    'page.actualImports.cardImportTypeSource': 'Import Type / Source',
    'page.actualImports.cardImportPeriod': 'Import Period',
    'page.actualImports.cardUploadedDate': 'Uploaded Date',
    'page.actualImports.cardLinesImported': 'Lines Imported',
    'page.actualImports.verifyFinalize': 'Verify & Finalize:',
    'page.actualImports.runValidation': 'Run Validation check',
    'page.actualImports.postLedgerLines': 'Post Ledger Lines',
    'page.actualImports.linesPosted': 'Lines posted to ledger. Transaction locked.',
    'page.actualImports.validationErrorLog': 'Validation Failure Log',
    'page.actualImports.importedLines': 'Imported Actual Lines',
    'page.actualImports.noLines': 'No lines loaded',
    'page.actualImports.noLinesDesc': 'No valid items loaded in this import cycle.',
    'page.actualImports.lineDate': 'Date',
    'page.actualImports.lineAccount': 'Account',
    'page.actualImports.lineSite': 'Site',
    'page.actualImports.lineCC': 'CC',
    'page.actualImports.lineDimension': 'Dimension',
    'page.actualImports.lineRefNo': 'Ref No',
    'page.actualImports.lineQty': 'Qty',
    'page.actualImports.linePrice': 'Price',
    'page.actualImports.lineAmount': 'Amount',
    'page.actualImports.codePrefix': 'Code: {code}',
    'page.actualImports.wizardTitle': 'Import Actual Ledger Data',
    'page.actualImports.wizardDesc': 'Configure actual ledger import and paste spreadsheet cells.',
    'page.actualImports.step1Label': 'Setup Source',
    'page.actualImports.step2Label': 'Paste Ledger Data',
    'page.actualImports.step3Label': 'Preview & Upload',
    'page.actualImports.sourceSystem': 'Source System',
    'page.actualImports.importType': 'Import Type',
    'page.actualImports.periodFrom': 'Period From',
    'page.actualImports.periodTo': 'Period To',
    'page.actualImports.mappingTemplate': 'Mapping Template',
    'page.actualImports.selectTemplate': 'Select template...',
    'page.actualImports.nextPasteData': 'Next: Paste Data',
    'page.actualImports.orUploadCsv': 'Or Upload CSV File Directly',
    'page.actualImports.pastedGridCells': 'Pasted Grid Cells (Tab/Comma separated, including headers)',
    'page.actualImports.csvPlaceholder': 'e.g.\nAccount Code,Amount,Date,Reference\n6010,4500,2025-01-12,REF-001',
    'page.actualImports.backSetup': 'Back: Setup',
    'page.actualImports.nextPreview': 'Next: Preview Mapping',
    'page.actualImports.previewRow': 'Row',
    'page.actualImports.previewAccountId': 'Account ID',
    'page.actualImports.previewAmount': 'Amount',
    'page.actualImports.previewDate': 'Date',
    'page.actualImports.previewStatus': 'Status / Error Logs',
    'page.actualImports.analyzingSchema': 'Analyzing schema and mapping translations...',
    'page.actualImports.resolved': 'Resolved',
    'page.actualImports.noPreviewResolved': 'No preview lines resolved. Check mapping template.',
    'page.actualImports.uploadValidate': 'Upload & Validate',
    'page.actualImports.backPasteData': 'Back: Paste Data',
    'page.actualImports.previewResolution': 'Preview Resolution ({valid} / {total} Valid)',
    'page.actualImports.deleteConfirm': 'Are you sure you want to delete this import? Pasted lines will be removed. This cannot be undone.',
    'page.actualImports.backToList': 'Back to List',
    'page.actualImports.retrieving': 'Retrieving actual imports...',
    'page.actualImports.fetchFailed': 'Failed to fetch actual imports.',
    'page.actualImports.validateFailed': 'Validation failed.',
    'page.actualImports.validateSuccess': 'Validation completed successfully.',
    'page.actualImports.postSuccess': 'Ledger lines posted successfully.',
    'page.actualImports.deleteSuccess': 'Actuals import deleted successfully.',
    'page.actualImports.importCreated': 'Actuals import created successfully.',
    'page.actualImports.fileLoaded': 'Loaded {name} successfully.',
    'page.actualImports.noCompanyDesc': 'Please select a company from the sidebar before importing actual data.',
    'page.actualImports.pasteValidationError': 'Ensure you paste valid spreadsheet rows.',

    /* Audit Logs */
    'page.auditLogs.description': 'Read-only compliance logging of all model calculations, scenario saves, and manual ledger adjustments',
    'page.auditLogs.searchFilter': 'Search Description / User ID',
    'page.auditLogs.searchPlaceholder': 'Search by keywords...',
    'page.auditLogs.entityType': 'Entity Type',
    'page.auditLogs.action': 'Action',
    'page.auditLogs.allEntities': 'All Entities',
    'page.auditLogs.allActions': 'All Actions',
    'page.auditLogs.recordsTracked': '{n} Records Tracked',
    'page.auditLogs.refreshLogs': 'Refresh logs',
    'page.auditLogs.emptyTitle': 'No logs retrieved',
    'page.auditLogs.emptyDesc': 'Adjust your search keywords or entity filters.',
    'page.auditLogs.colTimestamp': 'Timestamp',
    'page.auditLogs.colOperator': 'Operator',
    'page.auditLogs.colAction': 'Action',
    'page.auditLogs.colEntityType': 'Entity Type',
    'page.auditLogs.colEntityId': 'Entity ID',
    'page.auditLogs.colIpAddress': 'IP Address',
    'page.auditLogs.viewDiff': 'View Diff',
    'page.auditLogs.modalTitle': 'Audit Log Detail View',
    'page.auditLogs.logRecordId': 'Log Record ID',
    'page.auditLogs.operator': 'Operator',
    'page.auditLogs.ipAddress': 'IP Address',
    'page.auditLogs.timestamp': 'Timestamp',
    'page.auditLogs.userLabel': 'User #{id}',
    'page.auditLogs.system': 'System',
    'page.auditLogs.oldValues': 'Before Change (Old Values)',
    'page.auditLogs.newValues': 'After Change (New Values)',
    'page.auditLogs.noOldValues': 'No attributes recorded (Create operation)',
    'page.auditLogs.noNewValues': 'No attributes recorded (Delete operation)',
    'page.auditLogs.closeDetail': 'Close Detail',
    'page.auditLogs.noCompanyDesc': 'Please select a company from the sidebar before viewing audit logs.',
    'page.auditLogs.fetchFailed': 'Failed to retrieve audit log records.',
    'page.auditLogs.fetching': 'Fetching audit logs history...',
    'page.auditLogs.noCompanyTitle': 'No active company',

    /* Import Modal */
    'component.importModal.title': 'Import {module}',
    'component.importModal.howItWorks': 'How it works',
    'component.importModal.instruction1': 'Download the sample CSV template below',
    'component.importModal.instruction2': 'Fill in your data following the column headers',
    'component.importModal.instruction3': 'Upload the completed file',
    'component.importModal.instruction4': 'Preview and validate — fix any errors shown',
    'component.importModal.instruction5': 'Click "Import Valid Rows" to commit',
    'component.importModal.downloadTemplate': 'Download Sample Template',
    'component.importModal.uploadFile': 'Upload CSV or Excel file',
    'component.importModal.dragDrop': 'Drag & drop or click to select a .csv or .xlsx file',
    'component.importModal.validatePreview': 'Validate & Preview',
    'component.importModal.validCount': '{n} valid',
    'component.importModal.errorCount': '{n} with errors',
    'component.importModal.clearReUpload': 'Clear & re-upload',
    'component.importModal.status': 'Status',
    'component.importModal.importRows': 'Import {n} Valid Row{s}',
    'component.importModal.previewFailed': 'Preview failed.',
    'component.importModal.importFailed': 'Import failed.',
    'component.importModal.downloadFailed': 'Failed to download template.',
    'component.importModal.noValidRows': 'No valid rows to import.',
    'component.importModal.importSuccess': 'Imported {count} record{plural} successfully.{failMsg}',
    'component.importModal.noCommit': 'Import completed, but no records were committed.',
    'component.importModal.rowFail': '{n} row(s) failed.',
    'component.importModal.close': 'Close',
    'component.importModal.fileName': 'Loaded {name} successfully.',

    /* Auth */
    'auth.signInTitle': 'Sign in to your account',
    'auth.signInSubtitle': 'Enter your credentials to access the platform',
    'auth.noAccount': 'Don\'t have an account?',
    'auth.forgotPassword': 'Forgot password?',
    'auth.invalidCredentials': 'Invalid credentials. Please check your Tenant ID, email and password.',

    /* Companies page */
    'page.companies.description': 'Manage companies in your tenant',
    'page.companies.addCompany': 'Add Company',
    'page.companies.selectCompanyCallout': 'Select a company',
    'page.companies.selectCompanyCalloutDesc': 'Click the {action} button next to the company you want to work with.',
    'page.companies.emptyTitle': 'No companies yet',
    'page.companies.emptyDescription': 'Add your first company to get started.',
    'page.companies.loading': 'Loading companies…',
    'page.companies.fiscalYearStart': 'Fiscal Year Start',
    'page.companies.editTitle': 'Edit Company',
    'page.companies.createTitle': 'New Company',
    'page.companies.companyName': 'Company Name',
    'page.companies.fiscalYearMonth': 'Fiscal Year Start (month)',
    'page.companies.createCompany': 'Create Company',
    'page.companies.saveChanges': 'Save Changes',
    'page.companies.deleteConfirmMsg': 'This action cannot be undone. Are you sure you want to delete this company?',
    'page.companies.deletedSuccess': 'Company deleted successfully.',
    'page.companies.deleteFailed': 'Failed to delete company.',
    'page.companies.unexpectedDeleteError': 'An unexpected error occurred while deleting the company.',

    /* Exchange rates page */
    'page.exchangeRates.description': 'Manage exchange rates for currency conversion and reporting',
    'page.exchangeRates.fromCurrency': 'From Currency',
    'page.exchangeRates.toCurrency': 'To Currency',
    'page.exchangeRates.exchangeRate': 'Exchange Rate',
    'page.exchangeRates.effectiveDate': 'Effective Date',
    'page.exchangeRates.source': 'Source',
    'page.exchangeRates.addRate': 'Add Rate',
    'page.exchangeRates.syncUsd': 'Sync USD Rate (API)',
    'page.exchangeRates.syncSuccess': 'USD rate synced successfully at {rate} EGP.',
    'page.exchangeRates.syncSuccessScenario': 'USD rate synced successfully at {rate} EGP. A simulation scenario has been automatically created!',
    'page.exchangeRates.syncFailed': 'Failed to sync USD rate.',
    'page.exchangeRates.emptyTitle': 'No exchange rates set',
    'page.exchangeRates.emptyDesc': 'Add exchange rates to support multi-currency financial forecasts.',
    'page.exchangeRates.saveChanges': 'Save Changes',

    /* Raw material prices page */
    'page.rawMaterialPrices.description': 'Track purchase prices of raw materials over time',
    'page.rawMaterialPrices.materialName': 'Material Name',
    'page.rawMaterialPrices.price': 'Price',
    'page.rawMaterialPrices.priceDate': 'Price Date',
    'page.rawMaterialPrices.source': 'Source',
    'page.rawMaterialPrices.material': 'Material',
    'page.rawMaterialPrices.selectMaterial': 'Select material...',
    'page.rawMaterialPrices.addPrice': 'Add Price',
    'page.rawMaterialPrices.emptyTitle': 'No raw material prices recorded',
    'page.rawMaterialPrices.emptyDesc': 'Add price records to track raw material cost trends.',
    'page.rawMaterialPrices.saveChanges': 'Save Changes',

    /* Sites page */
    'page.sites.description': 'Manage branches, factories, warehouses, and offices',
    'page.sites.siteName': 'Site Name',
    'page.sites.type': 'Type',
    'page.sites.status': 'Status',
    'page.sites.region': 'Region',
    'page.sites.address': 'Address',
    'page.sites.create': 'Create Site',
    'page.sites.emptyTitle': 'No sites yet',
    'page.sites.emptyDesc': 'Add your first site to get started.',
    'page.sites.saveChanges': 'Save Changes',

    /* Units page */
    'page.units.description': 'Units of measurement used across products and materials',
    'page.units.unitName': 'Unit Name',
    'page.units.symbol': 'Symbol',
    'page.units.create': 'Create Unit',
    'page.units.emptyTitle': 'No units yet',
    'page.units.emptyDesc': 'Add measurement units such as kg, litre, or piece.',
    'page.units.saveChanges': 'Save Changes',

    /* Accounts page */
    'page.accounts.description': 'Chart of accounts for financial planning',
    'page.accounts.accountCode': 'Account Code',
    'page.accounts.accountName': 'Account Name',
    'page.accounts.accountType': 'Account Type',
    'page.accounts.parentId': 'Parent Account ID (optional)',
    'page.accounts.create': 'Create Account',
    'page.accounts.emptyTitle': 'No accounts yet',
    'page.accounts.emptyDesc': 'Set up your chart of accounts to start budgeting.',
    'page.accounts.saveChanges': 'Save Changes',

    /* Cost centers page */
    'page.costCenters.description': 'Organizational cost centers for financial allocation',
    'page.costCenters.siteId': 'Site ID',
    'page.costCenters.siteIdOptional': 'Site ID (optional)',
    'page.costCenters.parentId': 'Parent Cost Center ID (optional)',
    'page.costCenters.create': 'Create Cost Center',
    'page.costCenters.emptyTitle': 'No cost centers yet',
    'page.costCenters.emptyDesc': 'Add cost centers to allocate budgets and expenses.',
    'page.costCenters.saveChanges': 'Save Changes',

    /* Product categories page */
    'page.productCategories.description': 'Hierarchical product categorization',
    'page.productCategories.categoryName': 'Category Name',
    'page.productCategories.parentId': 'Parent Category ID (optional)',
    'page.productCategories.create': 'Create Category',
    'page.productCategories.emptyTitle': 'No categories yet',
    'page.productCategories.emptyDesc': 'Add categories to organize your products.',
    'page.productCategories.saveChanges': 'Save Changes',

    /* Suppliers page */
    'page.suppliers.description': 'Manage your material and service suppliers',
    'page.suppliers.supplierCode': 'Supplier Code',
    'page.suppliers.supplierName': 'Supplier Name',
    'page.suppliers.contactEmail': 'Contact Email',
    'page.suppliers.contactPhone': 'Contact Phone',
    'page.suppliers.create': 'Create Supplier',
    'page.suppliers.emptyTitle': 'No suppliers yet',
    'page.suppliers.emptyDesc': 'Add suppliers to link to your materials and purchase orders.',
    'page.suppliers.saveChanges': 'Save Changes',

    /* Production Planning */
    'page.productionPlanning.description': 'Plan production by exploding sales plan lines into BOM requirements.',
    'page.productionPlanning.lockedTitle': 'Production Planning Locked',
    'page.productionPlanning.lockedDescription': 'Production planning & BOM explosion is available on the Business and Enterprise tiers.',
    'page.productionPlanning.salesPlanLines': 'Sales Plan Lines',
    'page.productionPlanning.addProduct': 'Add Product',
    'page.productionPlanning.product': 'Product',
    'page.productionPlanning.quantity': 'Quantity',
    'page.productionPlanning.selectProduct': 'Select product…',
    'page.productionPlanning.removeLine': 'Remove line',
    'page.productionPlanning.runBomExplosion': 'Run BOM Explosion',
    'page.productionPlanning.explosionResults': 'Explosion Results',
    'page.productionPlanning.saveAsPlan': 'Save as Production Plan',
    'page.productionPlanning.grandTotal': 'Grand Total',
    'page.productionPlanning.allProductionCosts': 'All production costs',
    'page.productionPlanning.materialCost': 'Material Cost',
    'page.productionPlanning.laborCost': 'Labor Cost',
    'page.productionPlanning.overheadCost': 'Overhead Cost',
    'page.productionPlanning.totalWastage': 'Total Wastage',
    'page.productionPlanning.materialWastage': 'Material + recipe wastage',
    'page.productionPlanning.totalQty': 'Total Qty',
    'page.productionPlanning.unitsPlanned': 'Units planned',
    'page.productionPlanning.capacityUtilization': 'Capacity Utilization',
    'page.productionPlanning.capacityThreshold': 'Based on 50,000 unit capacity threshold',
    'page.productionPlanning.productsTab': 'Products',
    'page.productionPlanning.materialsTab': 'Materials',
    'page.productionPlanning.noProductsMatch': 'No products matched active BOM recipes.',
    'page.productionPlanning.noMaterialsFound': 'No material requirements found.',
    'page.productionPlanning.totalCost': 'Total Cost',
    'page.productionPlanning.wastageCost': 'Wastage Cost',
    'page.productionPlanning.material': 'Material',
    'page.productionPlanning.requiredQty': 'Required Qty',
    'page.productionPlanning.wastageQty': 'Wastage Qty',
    'page.productionPlanning.unitPrice': 'Unit Price',
    'page.productionPlanning.totals': 'Totals',
    'page.productionPlanning.savePlanModalTitle': 'Save Production Plan',
    'page.productionPlanning.targetFactorySite': 'Target Factory/Site',
    'page.productionPlanning.selectSite': 'Select Site…',
    'page.productionPlanning.fiscalYear': 'Fiscal Year',
    'page.productionPlanning.targetMonth': 'Target Month',
    'page.productionPlanning.sku': 'SKU',
    'page.productionPlanning.version': 'Version',
    'page.productionPlanning.qty': 'Qty',

    /* Headcount Plans */
    'page.headcount.title': 'Headcount Planning',
    'page.headcount.description': 'Forecast workforce levels and plan headcount across departments.',
    'page.headcount.selectBudgetCycle': 'Select Budget Cycle…',
    'page.headcount.addPosition': 'Add Position',
    'page.headcount.totalPositions': 'Total Positions',
    'page.headcount.totalWorkforceCost': 'Total Workforce Cost',
    'page.headcount.departmentsConfigured': 'Departments Configured',
    'page.headcount.workforceBudgetTable': 'Workforce Budget Table',
    'page.headcount.costByDepartment': 'Cost by Department',
    'page.headcount.monthlyDistribution': 'Monthly Distribution',
    'page.headcount.month': 'Month',
    'page.headcount.noCycleSelected': 'No cycle selected',
    'page.headcount.noCycleSelectedDesc': 'Select a budget cycle from the top menu to view headcount plans.',
    'page.headcount.editPosition': 'Edit Workforce Position',
    'page.headcount.addNewPosition': 'Add New Workforce Position',
    'page.headcount.jobTitle': 'Job Title',
    'page.headcount.department': 'Department',
    'page.headcount.employmentType': 'Employment Type',
    'page.headcount.planningMonth': 'Planning Month (1-12)',
    'page.headcount.headcount': 'Headcount',
    'page.headcount.monthlyBasicSalary': 'Monthly Basic Salary',
    'page.headcount.monthlyAllowances': 'Monthly Allowances',
    'page.headcount.socialInsurance': 'Social Insurance Cost',
    'page.headcount.siteOptional': 'Site (Optional)',
    'page.headcount.costCenterOptional': 'Cost Center (Optional)',
    'page.headcount.none': 'None',
    'page.headcount.positionUpdated': 'Position updated successfully.',
    'page.headcount.positionAdded': 'Position added successfully.',
    'page.headcount.positionDeleted': 'Position deleted successfully.',
    'page.headcount.type': 'Type',
    'page.headcount.count': 'Count',
    'page.headcount.basic': 'Basic',
    'page.headcount.totalCost': 'Total Cost (EGP)',
    'page.headcount.deleteConfirmMsg': 'Are you sure you want to delete this position?',
    'page.headcount.allSites': 'All Sites',

    /* Inventory */
    'page.inventory.description': 'Monitor inventory balances, coverage, and slow-moving stock.',
    'page.inventory.recordSnapshot': 'Record Snapshot',
    'page.inventory.totalItemsInStock': 'Total Items in Stock',
    'page.inventory.avgStockCoverage': 'Avg. Stock Coverage',
    'page.inventory.lowStockAlerts': 'Low Stock Alerts (<15 days)',
    'page.inventory.coverageAnalysis': 'Coverage Analysis',
    'page.inventory.slowMovingWarning': 'Slow-Moving Warning',
    'page.inventory.snapshotsLog': 'Snapshots Log',
    'page.inventory.noCoverageData': 'No coverage data',
    'page.inventory.noCoverageDataDesc': 'Coverage analysis will appear here after recording snapshots.',
    'page.inventory.noSlowMoving': 'No slow-moving items',
    'page.inventory.noSlowMovingDesc': 'No slow-moving inventory items detected.',
    'page.inventory.noSnapshots': 'No snapshots recorded',
    'page.inventory.noSnapshotsDesc': 'Record your first inventory snapshot to start tracking.',
    'page.inventory.siteWarehouse': 'Site / Warehouse',
    'page.inventory.itemName': 'Item Name',
    'page.inventory.skuCode': 'SKU/Code',
    'page.inventory.type': 'Type',
    'page.inventory.qtyOnHand': 'Qty On Hand',
    'page.inventory.value': 'Value (EGP)',
    'page.inventory.avgDailyOutflow': 'Avg Daily Outflow',
    'page.inventory.coverageDays': 'Coverage (Days)',
    'page.inventory.riskLevel': 'Risk Level',
    'page.inventory.date': 'Date',
    'page.inventory.siteCol': 'Site',
    'page.inventory.product': 'Product',
    'page.inventory.material': 'Material',
    'page.inventory.qtyRecorded': 'Qty Recorded',
    'page.inventory.valuation': 'Valuation (EGP)',
    'page.inventory.critical': 'Critical (180d+)',
    'page.inventory.warning': 'Warning (90d+)',
    'page.inventory.warehouseSite': 'Warehouse / Site',
    'page.inventory.itemType': 'Item Type',
    'page.inventory.finishedGoodProduct': 'Finished Good / Product',
    'page.inventory.rawMaterialIngredient': 'Raw Material / Ingredient',
    'page.inventory.snapshotDate': 'Snapshot Date',
    'page.inventory.totalValuation': 'Total Valuation (EGP)',
    'page.inventory.record': 'Record',
    'page.inventory.snapshotRecorded': 'Snapshot recorded successfully.',
    'page.inventory.snapshotFailed': 'Failed to record snapshot.',
    'page.inventory.365plusDays': '365+ Days',
    'page.inventory.nDays': '{days} Days',
    'page.inventory.nItems': '{count} Items',

    /* Promotions */
    'page.promotions.description': 'Plan, track, and analyze retail promotions.',
    'page.promotions.newPromotion': 'New Promotion',
    'page.promotions.search': 'Search promotions…',
    'page.promotions.noPromotions': 'No promotions yet',
    'page.promotions.noPromotionsDesc': 'Create your first promotion to start tracking revenue impact.',
    'page.promotions.name': 'Name',
    'page.promotions.discount': 'Discount',
    'page.promotions.period': 'Period',
    'page.promotions.budget': 'Budget',
    'page.promotions.revenueImpact': 'Revenue Impact',
    'page.promotions.roi': 'ROI',
    'page.promotions.status': 'Status',
    'page.promotions.active': 'Active',
    'page.promotions.inactive': 'Inactive',
    'page.promotions.editPromotion': 'Edit Promotion',
    'page.promotions.discountPct': 'Discount %',
    'page.promotions.discountAmount': 'Discount Amount (EGP)',
    'page.promotions.startDate': 'Start Date',
    'page.promotions.endDate': 'End Date',
    'page.promotions.actualCost': 'Actual Cost',
    'page.promotions.incrementalRevenue': 'Incremental Revenue',
    'page.promotions.product': 'Product',
    'page.promotions.allProducts': 'All Products',
    'page.promotions.deleteConfirmMsg': 'Are you sure you want to delete "{name}"?',
    'page.promotions.promotionUpdated': 'Promotion updated successfully.',
    'page.promotions.promotionCreated': 'Promotion created successfully.',
    'page.promotions.promotionDeleted': 'Promotion deleted successfully.',
    'page.promotions.promotionDeleteFailed': 'Failed to delete promotion.',

    /* BOM Recipes */
    'page.bomRecipes.description': 'Manage bill of materials recipes for your products.',
    'page.bomRecipes.emptyDescription': 'Create BOM recipes to define the materials and quantities needed for production.',
    'page.bomRecipes.emptyTitle': 'No BOM recipes yet',
    'page.bomRecipes.lockedDescription': 'BOM Recipe management is available on the Business and Enterprise tiers.',
    'page.bomRecipes.lockedTitle': 'BOM Recipes Locked',

    /* Customers */
    'page.customers.description': 'Manage your customer list and profiles.',
    'page.customers.emptyDescription': 'Add your first customer to get started.',
    'page.customers.emptyTitle': 'No customers yet',

    /* Integrations */
    'page.integrations.title': 'Integrations',
    'page.integrations.description': 'Connect external systems and manage data mappings.',
    'page.integrations.connectionsHeader': 'Connections',
    'page.integrations.mappingsHeader': 'Mappings',
    'page.integrations.connectionsDescription': 'Configure connections to external systems for data synchronization.',
    'page.integrations.mappingsDescription': 'Define how data fields map between external systems and ASAA FP&A.',
    'page.integrations.addConnection': 'Add Connection',
    'page.integrations.addMapping': 'Add Mapping',
    'page.integrations.selectConnection': 'Select connection...',
    'page.integrations.selectMapping': 'Select mapping...',
    'page.integrations.mappingName': 'Mapping Name',
    'page.integrations.sourceSystem': 'Source System',
    'page.integrations.dataType': 'Data Type',
    'page.integrations.isDefault': 'Is Default',
    'page.integrations.status': 'Status',
    'page.integrations.connectionAdapter': 'Connection Adapter',
    'page.integrations.testConnection': 'Test Connection',
    'page.integrations.connectionSuccessful': 'Connection test successful.',
    'page.integrations.connectionFailed': 'Connection test failed.',
    'page.integrations.importMappingTemplate': 'Import Mapping Template',
    'page.integrations.manualDataSync': 'Manual Data Sync',
    'page.integrations.triggerManualSync': 'Trigger Manual Sync',
    'page.integrations.triggerSynchronization': 'Trigger Synchronization',
    'page.integrations.syncDescription': 'Synchronize data between the external system and ASAA FP&A.',
    'page.integrations.syncPeriodFrom': 'Sync Period From',
    'page.integrations.syncPeriodTo': 'Sync Period To',
    'page.integrations.recordsSynced': 'Records Synced',
    'page.integrations.syncCompleted': 'Sync completed successfully.',
    'page.integrations.syncFailed': 'Sync failed.',
    'page.integrations.lockedTitle': 'Integrations Locked',
    'page.integrations.lockedDescription': 'Data integration features are available on the Business and Enterprise tiers.',
    'page.integrations.noConnectionsTitle': 'No connections yet',
    'page.integrations.noConnectionsDescription': 'Add a connection to an external system to start syncing data.',
    'page.integrations.noMappingsTitle': 'No mappings yet',
    'page.integrations.noMappingsDescription': 'Add a mapping to define how external data is translated into ASAA FP&A.',
    'page.integrations.loadingConnections': 'Loading connections...',
    'page.integrations.loadingMappings': 'Loading mappings...',

    /* KPI Targets */
    'page.kpiTargets.description': 'Define and track key performance indicator targets.',
    'page.kpiTargets.emptyDescription': 'Create KPI targets to monitor your business performance.',
    'page.kpiTargets.emptyTitle': 'No KPI targets yet',

    /* Materials */
    'page.materials.description': 'Manage raw materials and ingredients used in production.',
    'page.materials.emptyDescription': 'Add your first material to get started.',
    'page.materials.emptyTitle': 'No materials yet',

    /* Notification Rules */
    'page.notificationRules.ruleName': 'Rule Name',
    'page.notificationRules.triggerType': 'Trigger Type',
    'page.notificationRules.threshold': 'Threshold',
    'page.notificationRules.channel': 'Notification Channels',
    'page.notificationRules.triggerEvent': 'Trigger Event',
    'page.notificationRules.thresholdPct': 'Threshold Percentage (%)',
    'page.notificationRules.thresholdAmount': 'Threshold Amount',
    'page.notificationRules.accountScope': 'Account Scope (Optional)',
    'page.notificationRules.siteScope': 'Site Scope (Optional)',
    'page.notificationRules.createRule': 'Create Rule',
    'page.notificationRules.changeable': 'Changeable',
    'page.notificationRules.description': 'Configure rules for automated alerts and notifications.',
    'page.notificationRules.emptyDescription': 'Create notification rules to receive alerts on key events.',
    'page.notificationRules.emptyTitle': 'No notification rules yet',

    /* Product Categories */
    'page.productCategories.emptyDescription': 'Add categories to organize your products.',

    /* Products */
    'page.products.description': 'Manage your product catalog and pricing.',
    'page.products.emptyDescription': 'Add your first product to get started.',
    'page.products.emptyTitle': 'No products yet',

    /* Suppliers */
    'page.suppliers.emptyDescription': 'Add suppliers to link to your materials and purchase orders.',

    /* Users */
    'page.users.description': 'Manage system users and their roles.',
    'page.users.emptyDescription': 'Invite your first user to collaborate.',
    'page.users.emptyTitle': 'No users yet',

    /* Variance */
    'page.variance.description': 'Analyze variances between budget, forecast, and actuals.',
    'page.variance.budgetVsActual': 'Budget vs Actual',
    'page.variance.budgetVsForecast': 'Budget vs Forecast',
    'page.variance.actualVsForecast': 'Actual vs Forecast',
    'page.variance.threeWay': 'Three-Way Variance',
    'page.variance.filterAnalysis': 'Filter Analysis',
    'page.variance.fiscalYear': 'Fiscal Year',
    'page.variance.periodMonth': 'Period / Month',
    'page.variance.account': 'Account',
    'page.variance.site': 'Site',
    'page.variance.product': 'Product',
    'page.variance.customer': 'Customer',
    'page.variance.allMonths': 'All Months',
    'page.variance.allAccounts': 'All Accounts',
    'page.variance.allSites': 'All Sites',
    'page.variance.allProducts': 'All Products',
    'page.variance.allCustomers': 'All Customers',
    'page.variance.search': 'Search',
    'page.variance.refresh': 'Refresh',
    'page.variance.period': 'Period',
    'page.variance.productCustomer': 'Product / Customer',
    'page.variance.budget': 'Budget',
    'page.variance.actual': 'Actual',
    'page.variance.forecast': 'Forecast',
    'page.variance.actVsBud': 'Act vs Bud',
    'page.variance.forVsBud': 'For vs Bud',
    'page.variance.forVsAct': 'For vs Act',
    'page.variance.noData': 'No data available',
    'page.variance.noDataDesc': 'Select filters and refresh to load variance data.',
    'page.variance.varianceActBud': 'Variance (Act vs Bud)',
    'page.variance.varianceForBud': 'Variance (For vs Bud)',
    'page.variance.varianceForAct': 'Variance (For vs Act)',
    'common.role': 'Role',
    'common.selectRole': 'Select role...',
    'page.bomRecipes.addLine': 'Add Line',
    'page.bomRecipes.bomLinesSection': 'BOM Lines',
    'page.bomRecipes.createRecipe': 'Create Recipe',
    'page.bomRecipes.itemsUnit': 'items',
    'page.bomRecipes.laborCost': 'Labor Cost',
    'page.bomRecipes.linePrefix': 'BOM Line',
    'page.bomRecipes.linesHeader': 'Lines',
    'page.bomRecipes.loadMetaError': 'Failed to load products and materials list.',
    'page.bomRecipes.material': 'Material',
    'page.bomRecipes.noLinesError': 'BOM requires at least one material line.',
    'page.bomRecipes.noLinesText': 'No lines yet. Click "Add Line" to add materials.',
    'page.bomRecipes.noMaterialError': 'Missing a material selection.',
    'page.bomRecipes.noProductError': 'Please select a target product.',
    'page.bomRecipes.outputQty': 'Output Qty',
    'page.bomRecipes.overheadCost': 'Overhead Cost',
    'page.bomRecipes.product': 'Product',
    'page.bomRecipes.qtyError': 'Quantity must be greater than 0.',
    'page.bomRecipes.qtyPerOutput': 'Qty/Output',
    'page.bomRecipes.removeLine': 'Remove Line',
    'page.bomRecipes.selectMaterial': 'Select material...',
    'page.bomRecipes.selectProduct': 'Select a product...',
    'page.bomRecipes.unitCost': 'Unit Cost',
    'page.bomRecipes.version': 'Version',
    'page.bomRecipes.wastagePct': 'Wastage %',
    'page.customers.contactEmail': 'Contact Email',
    'page.customers.contactPhone': 'Contact Phone',
    'page.customers.createCustomer': 'Create Customer',
    'page.customers.customerCode': 'Customer Code',
    'page.customers.customerName': 'Customer Name',
    'page.kpiTargets.kpiName': 'KPI Name',
    'page.materials.createMaterial': 'Create Material',
    'page.materials.materialCode': 'Material Code',
    'page.materials.materialName': 'Material Name',
    'page.materials.purchasePrice': 'Purchase Price',
    'page.materials.safetyStock': 'Safety Stock',
    'page.materials.supplierId': 'Supplier ID',
    'page.materials.unitId': 'Unit ID',
    'page.productCategories.createCategory': 'Create Category',
    'page.productCategories.parentIdOptional': 'Parent Category ID (optional)',
    'page.productCategories.parentIdPlaceholder': 'Leave blank for root',
    'page.products.categoryId': 'Category ID',
    'page.products.createProduct': 'Create Product',
    'page.products.productName': 'Product Name',
    'page.products.salePrice': 'Sale Price',
    'page.products.sku': 'SKU',
    'page.products.standardCost': 'Std. Cost',
    'page.products.unitId': 'Unit ID',
    'page.suppliers.createSupplier': 'Create Supplier',
    'page.users.createUser': 'Create User',
    'page.users.lastLogin': 'Last Login',
    'page.users.namePlaceholder': 'Full name',
    'page.users.passwordPlaceholder': 'Min. 8 characters',
    'common.approve': 'Approve',
    'common.approved': 'Approved',
    'common.cancelled': 'Cancelled',
    'common.completed': 'Completed',
    'common.draft': 'Draft',
    'common.login': 'Login',
    'common.logout': 'Logout',
    'common.pending': 'Pending',
    'common.permission': 'Permission',
    'common.reject': 'Reject',
    'common.rejected': 'Rejected',
    'common.submit': 'Submit',
    'common.submitted': 'Submitted',
    'kpiCategory.financial': 'Financial',
    'kpiCategory.hr': 'HR',
    'kpiCategory.operational': 'Operational',
    'kpiCategory.production': 'Production',
    'kpiCategory.sales': 'Sales',
    'page.kpiTargets.annual': 'Annual target if empty',
    'page.kpiTargets.category': 'Category',
    'page.kpiTargets.createTarget': 'Create Target',
    'page.kpiTargets.fiscalYear': 'Fiscal Year',
    'page.kpiTargets.monthOptional': 'Month (1-12, Optional)',
    'page.kpiTargets.siteScope': 'Site Scope',
    'page.kpiTargets.targetValue': 'Target Value',
    'page.kpiTargets.unit': 'Measurement Unit',

    /* ── Error messages ──────────────────────────────────────────────────── */
    'error.dashboardLoadFailed': 'Failed to load dashboard data. Please try again.',
    'error.networkError': 'Network error. Please check your connection and try again.',
    'error.sessionExpired': 'Session expired. Please log in again.',
    'error.requestFailed': 'Request failed. Please check your data and try again.',
    'error.operationFailed': 'Operation failed.',
    'error.unexpectedError': 'An unexpected error occurred.',
    'error.loadFailed': 'Failed to load data.',
    'error.saveFailed': 'Failed to save.',
    'error.notFound': 'Not found.',
    'error.serverError': 'Server error. Please try again later.',
    'error.markReadFailed': 'Failed to mark notification as read.',
    'error.deleteFailed': 'Failed to delete.',
    'error.fetchFailed': 'Failed to retrieve data.',
    'error.notificationsFetchFailed': 'Failed to retrieve notifications.',
    'error.rulesFetchFailed': 'Failed to retrieve notification rules.',
    'error.ruleSaveFailed': 'Failed to save alert rule.',
    'error.ruleDeleteFailed': 'Failed to delete notification rule.',
    /* ── Notification translations ───────────────────────────────────────── */
    'notification.budgetThresholdExceeded': 'Budget Threshold Exceeded',
    'notification.spendingAlert': 'Spending Alert',
    'notification.approvalRequired': 'Approval Required',
    'notification.newReportAvailable': 'New Report Available',
    'notification.budgetThresholdBody': 'A budget threshold has been exceeded.',
    'notification.spendingBody': 'Unusual spending detected.',
    'notification.approvalBody': 'Your approval is needed.',
    'notification.newReportBody': 'A new report is ready.',
    'notification.usdRateIncrease': 'USD Rate Increase Alert',
    'notification.scenarioTriggered': 'Scenario Triggered',

    /* ── Auth keys ──────────────────────────────────────────────────────── */
    'auth.apiNotFound': 'API not found.',
    'auth.connectionFailed': 'Connection failed.',
    'auth.protectedBy': 'Protected by authentication.',

    /* ── Production Planning keys ───────────────────────────────────────── */
    'page.productionPlanning.savedSuccess': 'Production plan saved successfully.',
    'page.productionPlanning.saveFailed': 'Failed to save production plan.',
    'page.productionPlanning.loadProductsFailed': 'Failed to load products.',
    'page.productionPlanning.quantityGreaterThanZero': 'Quantity must be greater than zero.',
    'page.productionPlanning.bomExplosionComplete': 'BOM explosion completed successfully.',
    'page.productionPlanning.bomExplosionFailed': 'BOM explosion failed.',

    /* ── Integrations keys ──────────────────────────────────────────────── */
    'page.integrations.fetchConnectionsFailed': 'Failed to fetch connections.',
    'page.integrations.fetchMappingsFailed': 'Failed to fetch import mappings.',
    'page.integrations.oauthSuccess': 'OAuth connection successful.',
    'page.integrations.testSucceeded': 'Connection test succeeded.',
    'page.integrations.testFailed': 'Connection test failed.',
    'page.integrations.testRequestFailed': 'Test request failed.',
    'page.integrations.connectionDeleted': 'Connection deleted successfully.',
    'page.integrations.deleteConnectionFailed': 'Failed to delete connection.',
    'page.integrations.mappingDeleted': 'Mapping deleted successfully.',
    'page.integrations.deleteMappingFailed': 'Failed to delete mapping.',
    'page.integrations.syncComplete': 'Sync completed successfully.',
    'page.integrations.syncFailedManual': 'Sync failed. Please try again manually.',
    'page.integrations.mappingNotFound': 'Mapping not found.',
    'page.integrations.previewSuccess': 'Preview generated successfully.',
    'page.integrations.previewFailed': 'Preview generation failed.',
    'page.integrations.connectionUpdated': 'Connection updated successfully.',
    'page.integrations.connectionCreated': 'Connection created successfully.',
    'page.integrations.saveConnectionFailed': 'Failed to save connection.',
    'page.integrations.mappingUpdated': 'Mapping updated successfully.',
    'page.integrations.mappingCreated': 'Mapping created successfully.',
    'page.integrations.saveMappingFailed': 'Failed to save mapping.',
    'page.integrations.fieldRequired': 'This field is required.',

    /* ── Forecasts keys ─────────────────────────────────────────────────── */
    'page.forecasts.fetchFailed': 'Failed to fetch forecasts.',
    'page.forecasts.detailsFailed': 'Failed to fetch forecast details.',
    'page.forecasts.statusUpdateFailed': 'Failed to update forecast status.',
    'page.forecasts.generateLinesFailed': 'Failed to generate forecast lines.',
    'page.forecasts.deleteFailed': 'Failed to delete forecast.',
    'page.forecasts.updatedSuccess': 'Forecast updated successfully.',
    'page.forecasts.createdSuccess': 'Forecast created successfully.',
    'page.forecasts.saveFailed': 'Failed to save forecast.',

    /* ── Budgets keys ───────────────────────────────────────────────────── */
    'page.budgets.fetchFailed': 'Failed to fetch budgets.',
    'page.budgets.detailsFailed': 'Failed to fetch budget details.',
    'page.budgets.statusUpdateFailed': 'Failed to update budget status.',
    'page.budgets.deleteFailed': 'Failed to delete budget.',
    'page.budgets.saveFailed': 'Failed to save budget.',

    /* ── Reports keys ───────────────────────────────────────────────────── */
    'page.reports.fetchFailed': 'Failed to fetch reports.',
    'page.reports.exportFailed': 'Failed to export report.',

    /* ── Settings keys ──────────────────────────────────────────────────── */
    'page.settings.loadPlansFailed': 'Failed to load subscription plans.',
    'page.settings.upgradeSuccess': 'Plan upgraded successfully.',
    'page.settings.upgradeFailed': 'Failed to upgrade plan.',
    'page.settings.loadCompanyFailed': 'Failed to load company details.',
    'page.settings.saveCompanyFailed': 'Failed to save company profile.',

    /* ── Variance keys ──────────────────────────────────────────────────── */
    'page.variance.fetchFailed': 'Failed to fetch variance data.',

    /* ── Approvals keys ─────────────────────────────────────────────────── */
    'page.approvals.loadFailed': 'Failed to load approvals.',

    /* ── Promotions keys ────────────────────────────────────────────────── */
    'page.promotions.loadFailed': 'Failed to load promotions.',

    /* ── Scenarios keys ─────────────────────────────────────────────────── */
    'page.scenarios.fetchFailed': 'Failed to fetch scenarios.',

    /* ── Headcount Plans keys ───────────────────────────────────────────── */
    'page.headcountPlans.fetchFailed': 'Failed to fetch headcount plans.',

    /* ── Inventory keys ─────────────────────────────────────────────────── */
    'page.inventory.fetchFailed': 'Failed to fetch inventory data.',

    /* ── Backend error code translations ─────────────────────────────────── */
    'backend.ORACLE_TABLE_NOT_FOUND': 'Oracle table or view not found. Please check your import mapping.',
    'backend.ORACLE_INVALID_COLUMN': 'Invalid Oracle column name.',
    'backend.ORACLE_INVALID_CREDENTIALS': 'Invalid Oracle username or password.',
    'backend.ORACLE_CONNECTION_FAILED': 'Could not connect to Oracle host/port/service.',
    'backend.ORACLE_CLIENT_NOT_CONFIGURED': 'Oracle client is not configured on this server.',
    'backend.ORACLE_UNKNOWN': 'An Oracle error occurred.',
    'backend.MAPPING_VALIDATION_FAILED': 'Mapping validation failed.',
    'backend.MAPPING_NOT_FOUND': 'Mapping template not found.',
    'backend.SYNC_FAILED': 'Data synchronization failed.',
    'backend.SYNC_NO_ROWS': 'No rows retrieved to execute synchronization.',
    'backend.PREVIEW_FAILED': 'Preview generation failed.',
    'backend.PREVIEW_INVALID_TABLE': 'Invalid table name format.',
    'backend.PREVIEW_INVALID_COLUMN': 'Invalid column name.',
    'backend.CONNECTION_NOT_FOUND': 'Connection not found.',
    'backend.CONNECTION_TEST_FAILED': 'Connection test failed.',
    'backend.AI_UNAVAILABLE': 'AI suggestions unavailable. Please configure GEMINI_API_KEY.',
    'backend.AI_INVALID_RESPONSE': 'AI returned invalid response. Please try again.',
    'backend.AI_GENERATION_FAILED': 'Failed to generate AI suggestions. Please try again later.',
    'backend.AI_PROVIDER_OVERLOADED': 'AI service is busy right now. Please try again in a few minutes.',
    'backend.AUTH_INVALID_CREDENTIALS': 'Invalid credentials. Please try again.',
    'backend.AUTH_USER_INACTIVE': 'User account is inactive.',
    'backend.AUTH_TOKEN_EXPIRED': 'Session expired. Please log in again.',
    'backend.AUTH_TENANT_REQUIRED': 'Tenant ID is required.',
    'backend.AUTH_TENANT_INVALID': 'Invalid Tenant ID.',
    'backend.NOT_FOUND': 'Resource not found.',
    'backend.VALIDATION_FAILED': 'Validation failed.',
    'backend.COMPANY_NOT_FOUND': 'Company not found.',
    'backend.DEFAULT': 'An error occurred. Please try again.',
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
    'common.saveChanges': 'حفظ التغييرات',
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
    'common.notifications': 'الإشعارات',
    'common.unread': 'غير مقروء',
    'common.noUnreadAlerts': 'لا توجد إشعارات غير مقروءة',
    'common.everythingRunning': 'كل شيء يعمل بسلاسة.',
    'common.markAsRead': 'تحديد كمقروء',
    'common.viewAllAlerts': 'عرض كل الإشعارات',
    'common.confirmDelete': 'تأكيد الحذف',
    'common.confirmDeleteMessage': 'هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.',
    'common.cancelDelete': 'إلغاء',
    'common.createdSuccess': 'تم الإنشاء بنجاح.',
    'common.unknown': 'غير معروف',
    'common.updatedSuccess': 'تم التحديث بنجاح.',
    'common.deletedSuccess': 'تم الحذف بنجاح.',
    'common.saving': 'جارٍ الحفظ...',
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
    'common.permission': 'صلاحية',
    'common.reject': 'رفض',
    'common.approve': 'اعتماد',
    'common.logout': 'تسجيل الخروج',
    'common.login': 'تسجيل الدخول',
    'common.submit': 'تقديم',
    'common.cancelled': 'ملغي',
    'common.completed': 'مكتمل',
    'common.submitted': 'مقدم',
    'common.draft': 'مسودة',
    'common.rejected': 'مرفوض',
    'common.approved': 'معتمد',
    'common.pending': 'قيد الانتظار',
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
    'common.days': 'يوم',
    'common.items': 'عناصر',
    'common.period': 'الفترة',
    'common.region': 'المنطقة',
    'common.address': 'العنوان',
    'common.startDate': 'تاريخ البداية',
    'common.endDate': 'تاريخ النهاية',
    'common.budget': 'الميزانية',
    'common.cost': 'التكلفة',
    'common.revenue': 'الإيرادات',

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

    /* Entity types */
    'entityType.user': 'مستخدم',
    'entityType.company': 'شركة',
    'entityType.tenant': 'مستأجر',
    'entityType.bomRecipe': 'وصفة تصنيع',
    'entityType.budgetCycle': 'دورة ميزانية',
    'entityType.forecastCycle': 'دورة توقعات',
    'entityType.scenario': 'سيناريو',
    'entityType.actualImport': 'استيراد فعلي',
    'entityType.account': 'حساب',
    'entityType.site': 'موقع',

    /* Actions */
    'action.login': 'تسجيل دخول',
    'action.update': 'تحديث',
    'action.delete': 'حذف',
    'action.create': 'إنشاء',
    'action.statusChange': 'تغيير حالة',

    /* Site types */
    'siteType.factory': 'مصنع',
    'siteType.branch': 'فرع',
    'siteType.warehouse': 'مخزن',
    'siteType.office': 'مكتب',
    'siteType.other': 'أخرى',

    /* Source values */
    'source.manual': 'يدوي',
    'source.api': 'API',
    'source.import': 'مستورد',

    /* Employment types */
    'employmentType.fullTime': 'دوام كامل',
    'employmentType.partTime': 'دوام جزئي',
    'employmentType.contract': 'عقد',
    'employmentType.seasonal': 'موسمي',

    /* Unit names */
    'unit.kilogram': 'كيلوجرام',
    'unit.liter': 'لتر',
    'unit.metricTon': 'طن متري',
    'unit.piece': 'قطعة',

    /* Known names */
    'company.nileFreshRetailChain': 'سلسلة نايل فريش للتجزئة',
    'company.iDiibiManufacturingCo': 'شركة آي ديبي للتصنيع',
    'company.foodCompany': 'شركة أغذية',
    'costCenter.administration': 'الإدارة',
    'costCenter.productionDept': 'قسم الإنتاج',
    'costCenter.salesAndMarketing': 'المبيعات والتسويق',

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

    /* AI Scenario Planner */
    'page.scenarios.aiPlanner': 'مخطط السيناريوهات بالذكاء الاصطناعي',
    'page.scenarios.generateAiScenario': 'إنشاء سيناريو بالذكاء الاصطناعي',
    'page.scenarios.aiSuggestionsUnavailable': 'اقتراحات الذكاء الاصطناعي غير متاحة. يرجى تكوين GEMINI_API_KEY.',
    'page.scenarios.applyToScenario': 'تطبيق على السيناريو',
    'page.scenarios.expectedImpact': 'التأثير المتوقع',
    'page.scenarios.recommendedActions': 'الإجراءات المقترحة',
    'page.scenarios.confidence': 'مستوى الثقة',
    'page.scenarios.aiGenerating': 'جارٍ توليد سيناريوهات الذكاء الاصطناعي...',
    'page.scenarios.aiGenerateFailed': 'فشل توليد سيناريوهات الذكاء الاصطناعي.',
    'page.scenarios.assumptions': 'الافتراضات',
    'page.scenarios.simulationInputs': 'مدخلات المحاكاة',
    /* AI Scenario type badges */
    'page.scenarios.typeMaterialCost': 'تكلفة المواد',
    'page.scenarios.typeCurrency': 'العملة',
    'page.scenarios.typeDemand': 'الطلب',
    'page.scenarios.typeExpansion': 'التوسع',
    'page.scenarios.typeMixed': 'مختلط',
    /* AI Scenario impact labels */
    'page.scenarios.impactRevenue': 'الإيرادات',
    'page.scenarios.impactCosts': 'التكاليف',
    'page.scenarios.impactGrossMargin': 'هامش الربح',
    'page.scenarios.impactNetProfit': 'صافي الربح',
    'page.scenarios.impactCashFlow': 'التدفق النقدي',

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
    'page.approvals.description': 'مراجعة وإدارة طلبات الموافقة',
    'page.approvals.all': 'الجميع',
    'page.approvals.pending': 'قيد الانتظار',
    'page.approvals.approved': 'معتمد',
    'page.approvals.rejected': 'مرفوض',
    'page.approvals.refresh': 'تحديث',
    'page.approvals.entityType': 'نوع الكيان',
    'page.approvals.entityId': 'معرف الكيان',
    'page.approvals.status': 'الحالة',
    'page.approvals.requestedBy': 'قدم بواسطة',
    'page.approvals.createdAt': 'تاريخ الإنشاء',
    'page.approvals.noApprovals': 'لم يتم العثور على موافقات',
    'page.approvals.noApprovalsDesc': 'لم يتم إنشاء أي طلبات موافقة بعد.',
    'page.approvals.noFilteredResults': 'لا توجد طلبات موافقة {status}.',
    'page.approvals.confirmApproval': 'تأكيد الموافقة',
    'page.approvals.rejectRequest': 'رفض الطلب',
    'page.approvals.confirmApprovalDesc': 'هل تريد الموافقة على طلب {entityType} (المعرف: {entityId})؟',
    'page.approvals.rejectRequestDesc': 'يرجى تقديم سبب رفض طلب {entityType} (المعرف: {entityId}).',
    'page.approvals.cancel': 'إلغاء',
    'page.approvals.approve': 'موافقة',
    'page.approvals.reject': 'رفض',
    'page.approvals.reasonRequired': 'السبب (مطلوب)',
    'page.approvals.rejectPlaceholder': 'اشرح سبب رفض هذا الطلب...',
    'page.approvals.commentOptional': 'تعليق (اختياري)',
    'page.approvals.commentPlaceholder': 'أضف ملاحظة...',
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
    'page.notifications.inboxTab': 'صندوق الإشعارات',
    'page.notifications.rulesTab': 'قواعد التنبيهات',
    'page.notifications.description': 'إشعارات النظام وتحذيرات الامتثال.',
    'page.notifications.emptyTitle': 'صندوق الإشعارات نظيف!',
    'page.notifications.emptyDescription': 'لا توجد إشعارات جديدة. كل شيء ضمن الحدود الطبيعية.',

    /* Actual Imports */
    'page.actualImports.description': 'استيراد معاملات المحاسبة من ERP أو جداول البيانات.',
    'page.actualImports.importButton': 'استيراد الفعلي',
    'page.actualImports.searchPlaceholder': 'بحث في الواردات...',
    'page.actualImports.colTypeSource': 'النوع / المصدر',
    'page.actualImports.colPeriodCover': 'تغطية الفترة',
    'page.actualImports.colUploadedAt': 'تاريخ الرفع',
    'page.actualImports.emptyTitle': 'لم يتم استيراد بيانات',
    'page.actualImports.emptyDesc': 'ابدأ بلصق صفوف المعاملات لتعيين النفقات والمبيعات الفعلية.',
    'page.actualImports.detailTitle': 'استيراد #{id}',
    'page.actualImports.cardImportTypeSource': 'نوع الاستيراد / المصدر',
    'page.actualImports.cardImportPeriod': 'فترة الاستيراد',
    'page.actualImports.cardUploadedDate': 'تاريخ الرفع',
    'page.actualImports.cardLinesImported': 'البنود المستوردة',
    'page.actualImports.verifyFinalize': 'التحقق والإنهاء:',
    'page.actualImports.runValidation': 'تشغيل فحص التحقق',
    'page.actualImports.postLedgerLines': 'ترحيل قيود الأستاذ',
    'page.actualImports.linesPosted': 'تم ترحيل البنود إلى الأستاذ. المعاملة مقفلة.',
    'page.actualImports.validationErrorLog': 'سجل أخطاء التحقق',
    'page.actualImports.importedLines': 'بنود الفعلي المستوردة',
    'page.actualImports.noLines': 'لم يتم تحميل بنود',
    'page.actualImports.noLinesDesc': 'لم يتم تحميل عناصر صالحة في دورة الاستيراد هذه.',
    'page.actualImports.lineDate': 'التاريخ',
    'page.actualImports.lineAccount': 'الحساب',
    'page.actualImports.lineSite': 'الموقع',
    'page.actualImports.lineCC': 'مركز التكلفة',
    'page.actualImports.lineDimension': 'البعد',
    'page.actualImports.lineRefNo': 'رقم المرجع',
    'page.actualImports.lineQty': 'الكمية',
    'page.actualImports.linePrice': 'السعر',
    'page.actualImports.lineAmount': 'المبلغ',
    'page.actualImports.codePrefix': 'الكود: {code}',
    'page.actualImports.wizardTitle': 'استيراد بيانات الأستاذ الفعلية',
    'page.actualImports.wizardDesc': 'تكوين استيراد الأستاذ الفعلي ولصق خلايا جدول البيانات.',
    'page.actualImports.step1Label': 'إعداد المصدر',
    'page.actualImports.step2Label': 'لصق بيانات الأستاذ',
    'page.actualImports.step3Label': 'معاينة ورفع',
    'page.actualImports.sourceSystem': 'النظام المصدر',
    'page.actualImports.importType': 'نوع الاستيراد',
    'page.actualImports.periodFrom': 'من فترة',
    'page.actualImports.periodTo': 'إلى فترة',
    'page.actualImports.mappingTemplate': 'قالب التعيين',
    'page.actualImports.selectTemplate': 'اختر قالبًا...',
    'page.actualImports.nextPasteData': 'التالي: لصق البيانات',
    'page.actualImports.orUploadCsv': 'أو رفع ملف CSV مباشرة',
    'page.actualImports.pastedGridCells': 'خلايا الجدول الملصقة (مفصولة بعلامة تبويب أو فاصلة، تشمل الرؤوس)',
    'page.actualImports.csvPlaceholder': 'مثال:\nAccount Code,Amount,Date,Reference\n6010,4500,2025-01-12,REF-001',
    'page.actualImports.backSetup': 'رجوع: الإعداد',
    'page.actualImports.nextPreview': 'التالي: معاينة التعيين',
    'page.actualImports.previewRow': 'الصف',
    'page.actualImports.previewAccountId': 'معرف الحساب',
    'page.actualImports.previewAmount': 'المبلغ',
    'page.actualImports.previewDate': 'التاريخ',
    'page.actualImports.previewStatus': 'الحالة / سجل الأخطاء',
    'page.actualImports.analyzingSchema': 'تحليل المخطط وترجمات التعيين...',
    'page.actualImports.resolved': 'تم الحل',
    'page.actualImports.noPreviewResolved': 'لم يتم حل بنود المعاينة. تحقق من قالب التعيين.',
    'page.actualImports.uploadValidate': 'رفع وتحقق',
    'page.actualImports.backPasteData': 'رجوع: لصق البيانات',
    'page.actualImports.previewResolution': 'دقة المعاينة ({valid} / {total} صالح)',
    'page.actualImports.deleteConfirm': 'هل أنت متأكد من حذف هذا الاستيراد؟ ستتم إزالة البنود الملصقة. لا يمكن التراجع عن هذا.',
    'page.actualImports.backToList': 'رجوع إلى القائمة',
    'page.actualImports.retrieving': 'جاري استرداد الواردات الفعلية...',
    'page.actualImports.fetchFailed': 'فشل في جلب الواردات الفعلية.',
    'page.actualImports.validateFailed': 'فشل التحقق.',
    'page.actualImports.validateSuccess': 'اكتمل التحقق بنجاح.',
    'page.actualImports.postSuccess': 'تم ترحيل بنود الأستاذ بنجاح.',
    'page.actualImports.deleteSuccess': 'تم حذف استيراد الفعلي بنجاح.',
    'page.actualImports.importCreated': 'تم إنشاء استيراد الفعلي بنجاح.',
    'page.actualImports.fileLoaded': 'تم تحميل {name} بنجاح.',
    'page.actualImports.noCompanyDesc': 'يرجى اختيار شركة من الشريط الجانبي قبل استيراد البيانات الفعلية.',
    'page.actualImports.pasteValidationError': 'تأكد من لصق صفوف جدول بيانات صالحة.',

    /* Audit Logs */
    'page.auditLogs.description': 'سجل امتثال للقراءة فقط لجميع حسابات النماذج وحفظ السيناريوهات وتعديلات الأستاذ اليدوية',
    'page.auditLogs.searchFilter': 'بحث في الوصف / معرف المستخدم',
    'page.auditLogs.searchPlaceholder': 'بحث بالكلمات المفتاحية...',
    'page.auditLogs.entityType': 'نوع الكيان',
    'page.auditLogs.action': 'الإجراء',
    'page.auditLogs.allEntities': 'كل الكيانات',
    'page.auditLogs.allActions': 'كل الإجراءات',
    'page.auditLogs.recordsTracked': '{n} سجل متتبع',
    'page.auditLogs.refreshLogs': 'تحديث السجلات',
    'page.auditLogs.emptyTitle': 'لم يتم استرداد سجلات',
    'page.auditLogs.emptyDesc': 'اضبط كلمات البحث أو مرشحات الكيان.',
    'page.auditLogs.colTimestamp': 'الطابع الزمني',
    'page.auditLogs.colOperator': 'المشغل',
    'page.auditLogs.colAction': 'الإجراء',
    'page.auditLogs.colEntityType': 'نوع الكيان',
    'page.auditLogs.colEntityId': 'معرف الكيان',
    'page.auditLogs.colIpAddress': 'عنوان IP',
    'page.auditLogs.viewDiff': 'عرض الفرق',
    'page.auditLogs.modalTitle': 'عرض تفاصيل سجل التدقيق',
    'page.auditLogs.logRecordId': 'معرف سجل التدقيق',
    'page.auditLogs.operator': 'المشغل',
    'page.auditLogs.ipAddress': 'عنوان IP',
    'page.auditLogs.timestamp': 'الطابع الزمني',
    'page.auditLogs.userLabel': 'المستخدم #{id}',
    'page.auditLogs.system': 'النظام',
    'page.auditLogs.oldValues': 'قبل التغيير (القيم القديمة)',
    'page.auditLogs.newValues': 'بعد التغيير (القيم الجديدة)',
    'page.auditLogs.noOldValues': 'لا توجد سمات مسجلة (عملية إنشاء)',
    'page.auditLogs.noNewValues': 'لا توجد سمات مسجلة (عملية حذف)',
    'page.auditLogs.closeDetail': 'إغلاق التفاصيل',
    'page.auditLogs.noCompanyDesc': 'يرجى اختيار شركة من الشريط الجانبي قبل عرض سجلات التدقيق.',
    'page.auditLogs.fetchFailed': 'فشل في استرداد سجلات التدقيق.',
    'page.auditLogs.fetching': 'جاري جلب سجل التدقيق...',
    'page.auditLogs.noCompanyTitle': 'لا توجد شركة نشطة',

    /* Import Modal */
    'component.importModal.title': 'استيراد {module}',
    'component.importModal.howItWorks': 'كيف يعمل',
    'component.importModal.instruction1': 'قم بتنزيل قالب CSV النموذجي أدناه',
    'component.importModal.instruction2': 'املأ بياناتك باتباع رؤوس الأعمدة',
    'component.importModal.instruction3': 'قم برفع الملف المكتمل',
    'component.importModal.instruction4': 'معاينة والتحقق — أصلح أي أخطاء تظهر',
    'component.importModal.instruction5': 'انقر "استيراد الصفوف الصالحة" للتنفيذ',
    'component.importModal.downloadTemplate': 'تنزيل القالب النموذجي',
    'component.importModal.uploadFile': 'رفع ملف CSV أو Excel',
    'component.importModal.dragDrop': 'اسحب وأفلت أو انقر لاختيار ملف .csv أو .xlsx',
    'component.importModal.validatePreview': 'تحقق ومعاينة',
    'component.importModal.validCount': '{n} صالح',
    'component.importModal.errorCount': '{n} مع أخطاء',
    'component.importModal.clearReUpload': 'مسح وإعادة الرفع',
    'component.importModal.status': 'الحالة',
    'component.importModal.importRows': 'استيراد {n} صف صالح',
    'component.importModal.previewFailed': 'فشلت المعاينة.',
    'component.importModal.importFailed': 'فشل الاستيراد.',
    'component.importModal.downloadFailed': 'فشل تنزيل القالب.',
    'component.importModal.noValidRows': 'لا توجد صفوف صالحة للاستيراد.',
    'component.importModal.importSuccess': 'تم استيراد {count} سجل بنجاح.{failMsg}',
    'component.importModal.noCommit': 'اكتمل الاستيراد، ولكن لم يتم تنفيذ أي سجلات.',
    'component.importModal.rowFail': 'فشل {n} صف.',
    'component.importModal.close': 'إغلاق',
    'component.importModal.fileName': 'تم تحميل {name} بنجاح.',

    /* Auth */
    'auth.signInTitle': 'تسجيل الدخول إلى حسابك',
    'auth.signInSubtitle': 'أدخل بيانات الاعتماد الخاصة بك للوصول إلى المنصة',
    'auth.noAccount': 'ليس لديك حساب؟',
    'auth.forgotPassword': 'نسيت كلمة المرور؟',
    'auth.invalidCredentials': 'بيانات الاعتماد غير صالحة. يرجى التحقق من معرف المؤسسة والبريد الإلكتروني وكلمة المرور.',

    /* Companies page */
    'page.companies.description': 'إدارة الشركات في مؤسستك',
    'page.companies.addCompany': 'إضافة شركة',
    'page.companies.selectCompanyCallout': 'اختر شركة',
    'page.companies.selectCompanyCalloutDesc': 'انقر على زر {action} بجانب الشركة التي تريد العمل بها.',
    'page.companies.emptyTitle': 'لا توجد شركات بعد',
    'page.companies.emptyDescription': 'أضف شركتك الأولى للبدء.',
    'page.companies.loading': 'جارٍ تحميل الشركات...',
    'page.companies.fiscalYearStart': 'بداية السنة المالية',
    'page.companies.editTitle': 'تعديل الشركة',
    'page.companies.createTitle': 'شركة جديدة',
    'page.companies.companyName': 'اسم الشركة',
    'page.companies.fiscalYearMonth': 'بداية السنة المالية (الشهر)',
    'page.companies.createCompany': 'إنشاء شركة',
    'page.companies.saveChanges': 'حفظ التغييرات',
    'page.companies.deleteConfirmMsg': 'لا يمكن التراجع عن هذا الإجراء. هل أنت متأكد من حذف هذه الشركة؟',
    'page.companies.deletedSuccess': 'تم حذف الشركة بنجاح.',
    'page.companies.deleteFailed': 'فشل حذف الشركة.',
    'page.companies.unexpectedDeleteError': 'حدث خطأ غير متوقع أثناء حذف الشركة.',

    /* Exchange rates page */
    'page.exchangeRates.description': 'إدارة أسعار الصرف لتحويل العملات والتقارير',
    'page.exchangeRates.fromCurrency': 'من عملة',
    'page.exchangeRates.toCurrency': 'إلى عملة',
    'page.exchangeRates.exchangeRate': 'سعر الصرف',
    'page.exchangeRates.effectiveDate': 'تاريخ السريان',
    'page.exchangeRates.source': 'المصدر',
    'page.exchangeRates.addRate': 'إضافة سعر',
    'page.exchangeRates.syncUsd': 'مزامنة سعر USD (API)',
    'page.exchangeRates.syncSuccess': 'تمت مزامنة سعر USD بنجاح بسعر {rate} EGP.',
    'page.exchangeRates.syncSuccessScenario': 'تمت مزامنة سعر USD بنجاح بسعر {rate} EGP. تم إنشاء سيناريو محاكاة تلقائياً!',
    'page.exchangeRates.syncFailed': 'فشلت مزامنة سعر USD.',
    'page.exchangeRates.emptyTitle': 'لم يتم تعيين أسعار صرف',
    'page.exchangeRates.emptyDesc': 'أضف أسعار صرف لدعم التوقعات المالية متعددة العملات.',
    'page.exchangeRates.saveChanges': 'حفظ التغييرات',

    /* Raw material prices page */
    'page.rawMaterialPrices.description': 'تتبع أسعار شراء المواد الخام بمرور الوقت',
    'page.rawMaterialPrices.materialName': 'اسم المادة',
    'page.rawMaterialPrices.price': 'السعر',
    'page.rawMaterialPrices.priceDate': 'تاريخ السعر',
    'page.rawMaterialPrices.source': 'المصدر',
    'page.rawMaterialPrices.material': 'المادة',
    'page.rawMaterialPrices.selectMaterial': 'اختر مادة...',
    'page.rawMaterialPrices.addPrice': 'إضافة سعر',
    'page.rawMaterialPrices.emptyTitle': 'لم يتم تسجيل أسعار مواد خام',
    'page.rawMaterialPrices.emptyDesc': 'أضف سجلات أسعار لتتبع اتجاهات تكلفة المواد الخام.',
    'page.rawMaterialPrices.saveChanges': 'حفظ التغييرات',

    /* Sites page */
    'page.sites.description': 'إدارة الفروع والمصانع والمستودعات والمكاتب',
    'page.sites.siteName': 'اسم الموقع',
    'page.sites.type': 'النوع',
    'page.sites.status': 'الحالة',
    'page.sites.region': 'المنطقة',
    'page.sites.address': 'العنوان',
    'page.sites.create': 'إنشاء موقع',
    'page.sites.emptyTitle': 'لا توجد مواقع بعد',
    'page.sites.emptyDesc': 'أضف موقعك الأول للبدء.',
    'page.sites.saveChanges': 'حفظ التغييرات',

    /* Units page */
    'page.units.description': 'وحدات القياس المستخدمة عبر المنتجات والمواد',
    'page.units.unitName': 'اسم الوحدة',
    'page.units.symbol': 'الرمز',
    'page.units.create': 'إنشاء وحدة',
    'page.units.emptyTitle': 'لا توجد وحدات بعد',
    'page.units.emptyDesc': 'أضف وحدات قياس مثل كجم، لتر، أو قطعة.',
    'page.units.saveChanges': 'حفظ التغييرات',

    /* Accounts page */
    'page.accounts.description': 'دليل الحسابات للتخطيط المالي',
    'page.accounts.accountCode': 'كود الحساب',
    'page.accounts.accountName': 'اسم الحساب',
    'page.accounts.accountType': 'نوع الحساب',
    'page.accounts.parentId': 'معرف الحساب الأب (اختياري)',
    'page.accounts.create': 'إنشاء حساب',
    'page.accounts.emptyTitle': 'لا توجد حسابات بعد',
    'page.accounts.emptyDesc': 'قم بإعداد دليل الحسابات الخاص بك لبدء إعداد الميزانية.',
    'page.accounts.saveChanges': 'حفظ التغييرات',

    /* Cost centers page */
    'page.costCenters.description': 'مراكز التكلفة التنظيمية للتخصيص المالي',
    'page.costCenters.siteId': 'معرف الموقع',
    'page.costCenters.siteIdOptional': 'معرف الموقع (اختياري)',
    'page.costCenters.parentId': 'معرف مركز التكلفة الأب (اختياري)',
    'page.costCenters.create': 'إنشاء مركز تكلفة',
    'page.costCenters.emptyTitle': 'لا توجد مراكز تكلفة بعد',
    'page.costCenters.emptyDesc': 'أضف مراكز تكلفة لتخصيص الميزانيات والمصروفات.',
    'page.costCenters.saveChanges': 'حفظ التغييرات',

    /* Product categories page */
    'page.productCategories.description': 'تصنيف هرمي للمنتجات',
    'page.productCategories.categoryName': 'اسم التصنيف',
    'page.productCategories.parentId': 'معرف التصنيف الأب (اختياري)',
    'page.productCategories.create': 'إنشاء تصنيف',
    'page.productCategories.emptyTitle': 'لا توجد تصنيفات بعد',
    'page.productCategories.emptyDesc': 'أضف تصنيفات لتنظيم منتجاتك.',
    'page.productCategories.saveChanges': 'حفظ التغييرات',

    /* Suppliers page */
    'page.suppliers.description': 'إدارة موردي المواد والخدمات',
    'page.suppliers.supplierCode': 'كود المورد',
    'page.suppliers.supplierName': 'اسم المورد',
    'page.suppliers.contactEmail': 'البريد الإلكتروني للاتصال',
    'page.suppliers.contactPhone': 'هاتف الاتصال',
    'page.suppliers.create': 'إنشاء مورد',
    'page.suppliers.emptyTitle': 'لا توجد موردين بعد',
    'page.suppliers.emptyDesc': 'أضف موردين لربطهم بالمواد وأوامر الشراء الخاصة بك.',
    'page.suppliers.saveChanges': 'حفظ التغييرات',

    /* Production Planning */
    'page.productionPlanning.description': 'خطط للإنتاج عن طريق تحليل بنود خطة المبيعات إلى متطلبات هيكل المنتج.',
    'page.productionPlanning.lockedTitle': 'تخطيط الإنتاج مقفول',
    'page.productionPlanning.lockedDescription': 'تخطيط الإنتاج وتحليل هيكل المنتج متاحان في باقات الأعمال والمؤسسات.',
    'page.productionPlanning.salesPlanLines': 'بنود خطة المبيعات',
    'page.productionPlanning.addProduct': 'إضافة منتج',
    'page.productionPlanning.product': 'المنتج',
    'page.productionPlanning.quantity': 'الكمية',
    'page.productionPlanning.selectProduct': 'اختر منتجاً…',
    'page.productionPlanning.removeLine': 'إزالة البند',
    'page.productionPlanning.runBomExplosion': 'تشغيل تحليل هيكل المنتج',
    'page.productionPlanning.explosionResults': 'نتائج التحليل',
    'page.productionPlanning.saveAsPlan': 'حفظ كخطة إنتاج',
    'page.productionPlanning.grandTotal': 'الإجمالي الكلي',
    'page.productionPlanning.allProductionCosts': 'جميع تكاليف الإنتاج',
    'page.productionPlanning.materialCost': 'تكلفة المواد',
    'page.productionPlanning.laborCost': 'تكلفة العمالة',
    'page.productionPlanning.overheadCost': 'التكاليف العامة',
    'page.productionPlanning.totalWastage': 'إجمالي الهدر',
    'page.productionPlanning.materialWastage': 'هدر المواد والوصفات',
    'page.productionPlanning.totalQty': 'الكمية الإجمالية',
    'page.productionPlanning.unitsPlanned': 'الوحدات المخططة',
    'page.productionPlanning.capacityUtilization': 'استغلال الطاقة',
    'page.productionPlanning.capacityThreshold': 'حد الطاقة الإنتاجية 50,000 وحدة',
    'page.productionPlanning.productsTab': 'المنتجات',
    'page.productionPlanning.materialsTab': 'المواد',
    'page.productionPlanning.noProductsMatch': 'لا توجد منتجات تطابق وصفات هيكل المنتج النشطة.',
    'page.productionPlanning.noMaterialsFound': 'لم يتم العثور على متطلبات مواد.',
    'page.productionPlanning.totalCost': 'التكلفة الإجمالية',
    'page.productionPlanning.wastageCost': 'تكلفة الهدر',
    'page.productionPlanning.material': 'المادة',
    'page.productionPlanning.requiredQty': 'الكمية المطلوبة',
    'page.productionPlanning.wastageQty': 'كمية الهدر',
    'page.productionPlanning.unitPrice': 'سعر الوحدة',
    'page.productionPlanning.totals': 'الإجماليات',
    'page.productionPlanning.savePlanModalTitle': 'حفظ خطة الإنتاج',
    'page.productionPlanning.targetFactorySite': 'المصنع / الموقع المستهدف',
    'page.productionPlanning.selectSite': 'اختر موقعاً…',
    'page.productionPlanning.fiscalYear': 'السنة المالية',
    'page.productionPlanning.targetMonth': 'الشهر المستهدف',
    'page.productionPlanning.sku': 'رمز المنتج',
    'page.productionPlanning.version': 'الإصدار',
    'page.productionPlanning.qty': 'الكمية',

    /* Headcount Plans */
    'page.headcount.title': 'خطط التوظيف',
    'page.headcount.description': 'توقع مستويات القوى العاملة وخطط عدد الموظفين عبر الأقسام.',
    'page.headcount.selectBudgetCycle': 'اختر دورة الميزانية…',
    'page.headcount.addPosition': 'إضافة وظيفة',
    'page.headcount.totalPositions': 'إجمالي الوظائف',
    'page.headcount.totalWorkforceCost': 'إجمالي تكلفة القوى العاملة',
    'page.headcount.departmentsConfigured': 'الأقسام المكونة',
    'page.headcount.workforceBudgetTable': 'جدول ميزانية القوى العاملة',
    'page.headcount.costByDepartment': 'التكلفة حسب القسم',
    'page.headcount.monthlyDistribution': 'التوزيع الشهري',
    'page.headcount.month': 'الشهر',
    'page.headcount.noCycleSelected': 'لم يتم اختيار دورة',
    'page.headcount.noCycleSelectedDesc': 'اختر دورة ميزانية من القائمة العلوية لعرض خطط التوظيف.',
    'page.headcount.editPosition': 'تعديل الوظيفة',
    'page.headcount.addNewPosition': 'إضافة وظيفة جديدة',
    'page.headcount.jobTitle': 'المسمى الوظيفي',
    'page.headcount.department': 'القسم',
    'page.headcount.employmentType': 'نوع التوظيف',
    'page.headcount.planningMonth': 'شهر التخطيط (1-12)',
    'page.headcount.headcount': 'عدد الموظفين',
    'page.headcount.monthlyBasicSalary': 'الراتب الأساسي الشهري',
    'page.headcount.monthlyAllowances': 'البدلات الشهرية',
    'page.headcount.socialInsurance': 'التأمينات الاجتماعية',
    'page.headcount.siteOptional': 'الموقع (اختياري)',
    'page.headcount.costCenterOptional': 'مركز التكلفة (اختياري)',
    'page.headcount.none': 'لا يوجد',
    'page.headcount.positionUpdated': 'تم تحديث الوظيفة بنجاح.',
    'page.headcount.positionAdded': 'تم إضافة الوظيفة بنجاح.',
    'page.headcount.positionDeleted': 'تم حذف الوظيفة بنجاح.',
    'page.headcount.type': 'النوع',
    'page.headcount.count': 'العدد',
    'page.headcount.basic': 'أساسي',
    'page.headcount.totalCost': 'التكلفة الإجمالية',
    'page.headcount.deleteConfirmMsg': 'هل أنت متأكد من حذف هذه الوظيفة؟',
    'page.headcount.allSites': 'جميع المواقع',

    /* Inventory */
    'page.inventory.description': 'مراقبة أرصدة المخزون والتغطية والمواد بطيئة الحركة.',
    'page.inventory.recordSnapshot': 'تسجيل لقطة',
    'page.inventory.totalItemsInStock': 'إجمالي العناصر في المخزون',
    'page.inventory.avgStockCoverage': 'متوسط تغطية المخزون',
    'page.inventory.lowStockAlerts': 'تنبيهات انخفاض المخزون (أقل من 15 يوم)',
    'page.inventory.coverageAnalysis': 'تحليل التغطية',
    'page.inventory.slowMovingWarning': 'تحذير بطيء الحركة',
    'page.inventory.snapshotsLog': 'سجل اللقطات',
    'page.inventory.noCoverageData': 'لا توجد بيانات تغطية',
    'page.inventory.noCoverageDataDesc': 'سيظهر تحليل التغطية هنا بعد تسجيل اللقطات.',
    'page.inventory.noSlowMoving': 'لا توجد مواد بطيئة الحركة',
    'page.inventory.noSlowMovingDesc': 'لم يتم اكتشاف عناصر مخزون بطيئة الحركة.',
    'page.inventory.noSnapshots': 'لم يتم تسجيل لقطات',
    'page.inventory.noSnapshotsDesc': 'سجل أول لقطة مخزون لبدء التتبع.',
    'page.inventory.siteWarehouse': 'الموقع / المخزن',
    'page.inventory.itemName': 'اسم العنصر',
    'page.inventory.skuCode': 'رمز SKU',
    'page.inventory.type': 'النوع',
    'page.inventory.qtyOnHand': 'الكمية المتاحة',
    'page.inventory.value': 'القيمة (ج.م)',
    'page.inventory.avgDailyOutflow': 'متوسط التدفق اليومي',
    'page.inventory.coverageDays': 'أيام التغطية',
    'page.inventory.riskLevel': 'مستوى المخاطرة',
    'page.inventory.date': 'التاريخ',
    'page.inventory.siteCol': 'الموقع',
    'page.inventory.product': 'المنتج',
    'page.inventory.material': 'المادة',
    'page.inventory.qtyRecorded': 'الكمية المسجلة',
    'page.inventory.valuation': 'التقييم (ج.م)',
    'page.inventory.critical': 'حرج (أكثر من 180 يوم)',
    'page.inventory.warning': 'تحذير (أكثر من 90 يوم)',
    'page.inventory.warehouseSite': 'المخزن / الموقع',
    'page.inventory.itemType': 'نوع العنصر',
    'page.inventory.finishedGoodProduct': 'سلعة تامة / منتج',
    'page.inventory.rawMaterialIngredient': 'مادة خام / مكون',
    'page.inventory.snapshotDate': 'تاريخ اللقطة',
    'page.inventory.totalValuation': 'إجمالي التقييم (ج.م)',
    'page.inventory.record': 'تسجيل',
    'page.inventory.snapshotRecorded': 'تم تسجيل اللقطة بنجاح.',
    'page.inventory.snapshotFailed': 'فشل تسجيل اللقطة.',
    'page.inventory.365plusDays': 'أكثر من 365 يوم',
    'page.inventory.nDays': '{days} يوم',
    'page.inventory.nItems': '{count} عنصر',

    /* Promotions */
    'page.promotions.newPromotion': 'عرض ترويجي جديد',
    'page.promotions.search': 'بحث في العروض الترويجية…',
    'page.promotions.noPromotions': 'لا توجد عروض ترويجية بعد',
    'page.promotions.noPromotionsDesc': 'أنشئ أول عرض ترويجي لبدء تتبع الأثر على الإيرادات.',
    'page.promotions.name': 'الاسم',
    'page.promotions.discount': 'الخصم',
    'page.promotions.period': 'الفترة',
    'page.promotions.budget': 'الميزانية',
    'page.promotions.revenueImpact': 'الأثر على الإيرادات',
    'page.promotions.roi': 'العائد على الاستثمار',
    'page.promotions.description': 'خطط وتتبع وحلل العروض الترويجية.',
    'page.promotions.status': 'الحالة',
    'page.promotions.active': 'نشط',
    'page.promotions.inactive': 'غير نشط',
    'page.promotions.editPromotion': 'تعديل العرض الترويجي',
    'page.promotions.discountPct': 'نسبة الخصم',
    'page.promotions.discountAmount': 'قيمة الخصم (ج.م)',
    'page.promotions.startDate': 'تاريخ البداية',
    'page.promotions.endDate': 'تاريخ النهاية',
    'page.promotions.actualCost': 'التكلفة الفعلية',
    'page.promotions.incrementalRevenue': 'الإيرادات الإضافية',
    'page.promotions.product': 'المنتج',
    'page.promotions.allProducts': 'جميع المنتجات',
    'page.promotions.deleteConfirmMsg': 'هل أنت متأكد من حذف "{name}"؟',
    'page.promotions.promotionUpdated': 'تم تحديث العرض الترويجي بنجاح.',
    'page.promotions.promotionCreated': 'تم إنشاء العرض الترويجي بنجاح.',
    'page.promotions.promotionDeleted': 'تم حذف العرض الترويجي بنجاح.',
    'page.promotions.promotionDeleteFailed': 'فشل حذف العرض الترويجي.',

    /* BOM Recipes */
    'page.bomRecipes.description': 'إدارة قوائم مكونات المنتجات لوصفات التصنيع.',
    'page.bomRecipes.emptyDescription': 'أنشئ وصفات تصنيع لتحديد المواد والكميات المطلوبة للإنتاج.',
    'page.bomRecipes.emptyTitle': 'لا توجد وصفات تصنيع بعد',
    'page.bomRecipes.lockedDescription': 'إدارة وصفات التصنيع متاحة في باقات الأعمال والمؤسسات.',
    'page.bomRecipes.lockedTitle': 'وصفات التصنيع مقفولة',

    /* Customers */
    'page.customers.description': 'إدارة قائمة العملاء وملفاتهم.',
    'page.customers.emptyDescription': 'أضف أول عميل للبدء.',
    'page.customers.emptyTitle': 'لا يوجد عملاء بعد',

    /* Integrations */
    'page.integrations.title': 'التكاملات',
    'page.integrations.description': 'ربط الأنظمة الخارجية وإدارة تعيينات البيانات.',
    'page.integrations.connectionsHeader': 'الاتصالات',
    'page.integrations.mappingsHeader': 'التعيينات',
    'page.integrations.connectionsDescription': 'تكوين اتصالات بالأنظمة الخارجية لمزامنة البيانات.',
    'page.integrations.mappingsDescription': 'تحديد كيفية تعيين حقول البيانات بين الأنظمة الخارجية و ASAA FP&A.',
    'page.integrations.addConnection': 'إضافة اتصال',
    'page.integrations.addMapping': 'إضافة تعيين',
    'page.integrations.selectConnection': 'اختر اتصالاً...',
    'page.integrations.selectMapping': 'اختر تعييناً...',
    'page.integrations.mappingName': 'اسم التعيين',
    'page.integrations.sourceSystem': 'النظام المصدر',
    'page.integrations.dataType': 'نوع البيانات',
    'page.integrations.isDefault': 'افتراضي',
    'page.integrations.status': 'الحالة',
    'page.integrations.connectionAdapter': 'موصل الاتصال',
    'page.integrations.testConnection': 'اختبار الاتصال',
    'page.integrations.connectionSuccessful': 'اختبار الاتصال ناجح.',
    'page.integrations.connectionFailed': 'فشل اختبار الاتصال.',
    'page.integrations.importMappingTemplate': 'استيراد قالب التعيين',
    'page.integrations.manualDataSync': 'مزامنة البيانات اليدوية',
    'page.integrations.triggerManualSync': 'تشغيل المزامنة اليدوية',
    'page.integrations.triggerSynchronization': 'تشغيل المزامنة',
    'page.integrations.syncDescription': 'مزامنة البيانات بين النظام الخارجي و ASAA FP&A.',
    'page.integrations.syncPeriodFrom': 'من فترة المزامنة',
    'page.integrations.syncPeriodTo': 'إلى فترة المزامنة',
    'page.integrations.recordsSynced': 'السجلات المتزامنة',
    'page.integrations.syncCompleted': 'اكتملت المزامنة بنجاح.',
    'page.integrations.syncFailed': 'فشلت المزامنة.',
    'page.integrations.lockedTitle': 'التكاملات مقفولة',
    'page.integrations.lockedDescription': 'ميزات تكامل البيانات متاحة في باقات الأعمال والمؤسسات.',
    'page.integrations.noConnectionsTitle': 'لا توجد اتصالات بعد',
    'page.integrations.noConnectionsDescription': 'أضف اتصالاً بنظام خارجي لبدء مزامنة البيانات.',
    'page.integrations.noMappingsTitle': 'لا توجد تعيينات بعد',
    'page.integrations.noMappingsDescription': 'أضف تعييناً لتحديد كيفية ترجمة البيانات الخارجية إلى ASAA FP&A.',
    'page.integrations.loadingConnections': 'جارٍ تحميل الاتصالات...',
    'page.integrations.loadingMappings': 'جارٍ تحميل التعيينات...',

    /* KPI Targets */
    'page.kpiTargets.description': 'تحديد وتتبع مستهدفات مؤشرات الأداء الرئيسية.',
    'page.kpiTargets.emptyDescription': 'أنشئ مستهدفات أداء لمراقبة أداء أعمالك.',
    'page.kpiTargets.emptyTitle': 'لا توجد مستهدفات أداء بعد',

    /* Materials */
    'page.materials.description': 'إدارة المواد الخام والمكونات المستخدمة في الإنتاج.',
    'page.materials.emptyDescription': 'أضف أول مادة للبدء.',
    'page.materials.emptyTitle': 'لا توجد مواد بعد',

    /* Notification Rules */
    'page.notificationRules.ruleName': 'اسم القاعدة',
    'page.notificationRules.triggerType': 'نوع المشغل',
    'page.notificationRules.threshold': 'الحد الأدنى',
    'page.notificationRules.channel': 'قنوات الإشعارات',
    'page.notificationRules.triggerEvent': 'الحدث المشغل',
    'page.notificationRules.thresholdPct': 'نسبة الحد الأدنى (%)',
    'page.notificationRules.thresholdAmount': 'المبلغ الأدنى',
    'page.notificationRules.accountScope': 'نطاق الحساب (اختياري)',
    'page.notificationRules.siteScope': 'نطاق الموقع (اختياري)',
    'page.notificationRules.createRule': 'إنشاء قاعدة',
    'page.notificationRules.changeable': 'قابل للتغيير',
    'page.notificationRules.description': 'تكوين قواعد التنبيهات والإشعارات الآلية.',
    'page.notificationRules.emptyDescription': 'أنشئ قواعد إشعارات لتلقي تنبيهات حول الأحداث الرئيسية.',
    'page.notificationRules.emptyTitle': 'لا توجد قواعد إشعارات بعد',

    /* Product Categories */
    'page.productCategories.emptyDescription': 'أضف تصنيفات لتنظيم منتجاتك.',

    /* Products */
    'page.products.description': 'إدارة كتالوج المنتجات والتسعير.',
    'page.products.emptyDescription': 'أضف أول منتج للبدء.',
    'page.products.emptyTitle': 'لا توجد منتجات بعد',

    /* Suppliers */
    'page.suppliers.emptyDescription': 'أضف موردين لربطهم بالمواد وأوامر الشراء.',

    /* Users */
    'page.users.description': 'إدارة مستخدمي النظام وأدوارهم.',
    'page.users.emptyDescription': 'ادعُ أول مستخدم للتعاون.',
    'page.users.emptyTitle': 'لا يوجد مستخدمين بعد',

    /* Variance */
    'page.variance.description': 'تحليل الانحرافات بين الميزانية والتوقعات والفعليات.',
    'page.variance.budgetVsActual': 'الميزانية مقابل الفعلي',
    'page.variance.budgetVsForecast': 'الميزانية مقابل التوقعات',
    'page.variance.actualVsForecast': 'الفعلي مقابل التوقعات',
    'page.variance.threeWay': 'الانحراف الثلاثي',
    'page.variance.filterAnalysis': 'تصفية التحليل',
    'page.variance.fiscalYear': 'السنة المالية',
    'page.variance.periodMonth': 'الفترة / الشهر',
    'page.variance.account': 'الحساب',
    'page.variance.site': 'الموقع',
    'page.variance.product': 'المنتج',
    'page.variance.customer': 'العميل',
    'page.variance.allMonths': 'كل الأشهر',
    'page.variance.allAccounts': 'كل الحسابات',
    'page.variance.allSites': 'كل المواقع',
    'page.variance.allProducts': 'كل المنتجات',
    'page.variance.allCustomers': 'كل العملاء',
    'page.variance.search': 'بحث',
    'page.variance.refresh': 'تحديث',
    'page.variance.period': 'الفترة',
    'page.variance.productCustomer': 'المنتج / العميل',
    'page.variance.budget': 'الميزانية',
    'page.variance.actual': 'الفعلي',
    'page.variance.forecast': 'التوقعات',
    'page.variance.actVsBud': 'الفعلي مقابل الميزانية',
    'page.variance.forVsBud': 'التوقعات مقابل الميزانية',
    'page.variance.forVsAct': 'التوقعات مقابل الفعلي',
    'page.variance.noData': 'لا توجد بيانات متاحة',
    'page.variance.noDataDesc': 'اختر عوامل التصفية وقم بالتحديث لتحميل بيانات الانحراف.',
    'page.variance.varianceActBud': 'الانحراف (الفعلي مقابل الميزانية)',
    'page.variance.varianceForBud': 'الانحراف (التوقعات مقابل الميزانية)',
    'page.variance.varianceForAct': 'الانحراف (التوقعات مقابل الفعلي)',
    'common.role': 'الدور',
    'common.selectRole': 'اختر الدور...',
    'page.bomRecipes.addLine': 'إضافة بند',
    'page.bomRecipes.bomLinesSection': 'بنود قائمة المكونات',
    'page.bomRecipes.createRecipe': 'إنشاء وصفة',
    'page.bomRecipes.itemsUnit': 'عنصر',
    'page.bomRecipes.laborCost': 'تكلفة العمالة',
    'page.bomRecipes.linePrefix': 'بند قائمة المكونات',
    'page.bomRecipes.linesHeader': 'البنود',
    'page.bomRecipes.loadMetaError': 'فشل تحميل قوائم المنتجات والمواد.',
    'page.bomRecipes.material': 'المادة',
    'page.bomRecipes.noLinesError': 'قائمة المكونات تتطلب بند مادة واحد على الأقل.',
    'page.bomRecipes.noLinesText': 'لا توجد بنود بعد. انقر "إضافة بند" لإضافة المواد.',
    'page.bomRecipes.noMaterialError': 'اختيار المادة مفقود.',
    'page.bomRecipes.noProductError': 'الرجاء اختيار منتج مستهدف.',
    'page.bomRecipes.outputQty': 'كمية الإخراج',
    'page.bomRecipes.overheadCost': 'التكاليف العامة',
    'page.bomRecipes.product': 'المنتج',
    'page.bomRecipes.qtyError': 'يجب أن تكون الكمية أكبر من 0.',
    'page.bomRecipes.qtyPerOutput': 'الكمية لكل إخراج',
    'page.bomRecipes.removeLine': 'حذف البند',
    'page.bomRecipes.selectMaterial': 'اختر مادة...',
    'page.bomRecipes.selectProduct': 'اختر منتج...',
    'page.bomRecipes.unitCost': 'تكلفة الوحدة',
    'page.bomRecipes.version': 'الإصدار',
    'page.bomRecipes.wastagePct': 'نسبة الهدر %',
    'page.customers.contactEmail': 'البريد الإلكتروني للتواصل',
    'page.customers.contactPhone': 'هاتف التواصل',
    'page.customers.createCustomer': 'إنشاء عميل',
    'page.customers.customerCode': 'كود العميل',
    'page.customers.customerName': 'اسم العميل',
    'page.kpiTargets.kpiName': 'اسم مؤشر الأداء',
    'page.kpiTargets.annual': 'هدف سنوي إذا كان فارغاً',
    'page.kpiTargets.category': 'التصنيف',
    'page.kpiTargets.createTarget': 'إنشاء هدف',
    'page.kpiTargets.fiscalYear': 'السنة المالية',
    'page.kpiTargets.monthOptional': 'الشهر (1-12، اختياري)',
    'page.kpiTargets.siteScope': 'نطاق الموقع',
    'page.kpiTargets.targetValue': 'القيمة المستهدفة',
    'page.kpiTargets.unit': 'وحدة القياس',
    'kpiCategory.financial': 'مالي',
    'kpiCategory.hr': 'موارد بشرية',
    'kpiCategory.operational': 'تشغيلي',
    'kpiCategory.production': 'إنتاج',
    'kpiCategory.sales': 'مبيعات',
    'page.materials.createMaterial': 'إنشاء مادة',
    'page.materials.materialCode': 'كود المادة',
    'page.materials.materialName': 'اسم المادة',
    'page.materials.purchasePrice': 'سعر الشراء',
    'page.materials.safetyStock': 'المخزون الآمن',
    'page.materials.supplierId': 'معرف المورد',
    'page.materials.unitId': 'معرف الوحدة',
    'page.productCategories.createCategory': 'إنشاء تصنيف',
    'page.productCategories.parentIdOptional': 'معرف التصنيف الأب (اختياري)',
    'page.productCategories.parentIdPlaceholder': 'اتركه فارغاً للتصنيف الجذر',
    'page.products.categoryId': 'معرف التصنيف',
    'page.products.createProduct': 'إنشاء منتج',
    'page.products.productName': 'اسم المنتج',
    'page.products.salePrice': 'سعر البيع',
    'page.products.sku': 'كود المنتج',
    'page.products.standardCost': 'التكلفة المعيارية',
    'page.products.unitId': 'معرف الوحدة',
    'page.suppliers.createSupplier': 'إنشاء مورد',
    'page.users.createUser': 'إنشاء مستخدم',
    'page.users.lastLogin': 'آخر تسجيل دخول',
    'page.users.namePlaceholder': 'الاسم الكامل',
    'page.users.passwordPlaceholder': '8 أحرف كحد أدنى',

    /* ── Error messages ──────────────────────────────────────────────────── */
    'error.dashboardLoadFailed': 'فشل تحميل بيانات لوحة التحكم. يرجى المحاولة مرة أخرى.',
    'error.networkError': 'خطأ في الشبكة. يرجى التحقق من اتصالك والمحاولة مرة أخرى.',
    'error.sessionExpired': 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.',
    'error.requestFailed': 'فشل الطلب. يرجى مراجعة البيانات والمحاولة مرة أخرى.',
    'error.operationFailed': 'فشلت العملية.',
    'error.unexpectedError': 'حدث خطأ غير متوقع.',
    'error.loadFailed': 'فشل تحميل البيانات.',
    'error.saveFailed': 'فشل الحفظ.',
    'error.notFound': 'غير موجود.',
    'error.serverError': 'خطأ في الخادم. يرجى المحاولة لاحقاً.',
    'error.markReadFailed': 'فشل تعيين الإشعار كمقروء.',
    'error.deleteFailed': 'فشل الحذف.',
    'error.fetchFailed': 'فشل استرجاع البيانات.',
    'error.notificationsFetchFailed': 'فشل استرجاع الإشعارات.',
    'error.rulesFetchFailed': 'فشل استرجاع قواعد الإشعارات.',
    'error.ruleSaveFailed': 'فشل حفظ قاعدة التنبيه.',
    'error.ruleDeleteFailed': 'فشل حذف قاعدة الإشعار.',
    /* ── Notification translations ───────────────────────────────────────── */
    'notification.budgetThresholdExceeded': 'تجاوز حد الميزانية',
    'notification.spendingAlert': 'تنبيه الإنفاق',
    'notification.approvalRequired': 'الموافقة مطلوبة',
    'notification.newReportAvailable': 'تقرير جديد متاح',
    'notification.budgetThresholdBody': 'تم تجاوز حد الميزانية.',
    'notification.spendingBody': 'تم اكتشاف إنفاق غير عادي.',
    'notification.approvalBody': 'موافقتك مطلوبة.',
    'notification.newReportBody': 'تقرير جديد جاهز.',
    'notification.usdRateIncrease': 'تنبيه ارتفاع سعر الدولار',
    'notification.scenarioTriggered': 'تم إنشاء سيناريو',

    /* ── Auth keys ──────────────────────────────────────────────────────── */
    'auth.apiNotFound': 'واجهة البرمجة غير موجودة.',
    'auth.connectionFailed': 'فشل الاتصال.',
    'auth.protectedBy': 'محمي بالمصادقة.',

    /* ── Production Planning keys ───────────────────────────────────────── */
    'page.productionPlanning.savedSuccess': 'تم حفظ خطة الإنتاج بنجاح.',
    'page.productionPlanning.saveFailed': 'فشل حفظ خطة الإنتاج.',
    'page.productionPlanning.loadProductsFailed': 'فشل تحميل المنتجات.',
    'page.productionPlanning.quantityGreaterThanZero': 'يجب أن تكون الكمية أكبر من صفر.',
    'page.productionPlanning.bomExplosionComplete': 'تم تفكيك قائمة المكونات بنجاح.',
    'page.productionPlanning.bomExplosionFailed': 'فشل تفكيك قائمة المكونات.',

    /* ── Integrations keys ──────────────────────────────────────────────── */
    'page.integrations.fetchConnectionsFailed': 'فشل استرجاع الاتصالات.',
    'page.integrations.fetchMappingsFailed': 'فشل استرجاع تعيينات الاستيراد.',
    'page.integrations.oauthSuccess': 'تم الاتصال بنجاح عبر OAuth.',
    'page.integrations.testSucceeded': 'نجح اختبار الاتصال.',
    'page.integrations.testFailed': 'فشل اختبار الاتصال.',
    'page.integrations.testRequestFailed': 'فشل طلب الاختبار.',
    'page.integrations.connectionDeleted': 'تم حذف الاتصال بنجاح.',
    'page.integrations.deleteConnectionFailed': 'فشل حذف الاتصال.',
    'page.integrations.mappingDeleted': 'تم حذف التعيين بنجاح.',
    'page.integrations.deleteMappingFailed': 'فشل حذف التعيين.',
    'page.integrations.syncComplete': 'تمت المزامنة بنجاح.',
    'page.integrations.syncFailedManual': 'فشلت المزامنة. يرجى المحاولة يدوياً.',
    'page.integrations.mappingNotFound': 'التعيين غير موجود.',
    'page.integrations.previewSuccess': 'تم إنشاء المعاينة بنجاح.',
    'page.integrations.previewFailed': 'فشل إنشاء المعاينة.',
    'page.integrations.connectionUpdated': 'تم تحديث الاتصال بنجاح.',
    'page.integrations.connectionCreated': 'تم إنشاء الاتصال بنجاح.',
    'page.integrations.saveConnectionFailed': 'فشل حفظ الاتصال.',
    'page.integrations.mappingUpdated': 'تم تحديث التعيين بنجاح.',
    'page.integrations.mappingCreated': 'تم إنشاء التعيين بنجاح.',
    'page.integrations.saveMappingFailed': 'فشل حفظ التعيين.',
    'page.integrations.fieldRequired': 'هذا الحقل مطلوب.',

    /* ── Forecasts keys ─────────────────────────────────────────────────── */
    'page.forecasts.fetchFailed': 'فشل استرجاع التوقعات.',
    'page.forecasts.detailsFailed': 'فشل استرجاع تفاصيل التوقعات.',
    'page.forecasts.statusUpdateFailed': 'فشل تحديث حالة التوقعات.',
    'page.forecasts.generateLinesFailed': 'فشل إنشاء بنود التوقعات.',
    'page.forecasts.deleteFailed': 'فشل حذف التوقعات.',
    'page.forecasts.updatedSuccess': 'تم تحديث التوقعات بنجاح.',
    'page.forecasts.createdSuccess': 'تم إنشاء التوقعات بنجاح.',
    'page.forecasts.saveFailed': 'فشل حفظ التوقعات.',

    /* ── Budgets keys ───────────────────────────────────────────────────── */
    'page.budgets.fetchFailed': 'فشل استرجاع الميزانيات.',
    'page.budgets.detailsFailed': 'فشل استرجاع تفاصيل الميزانية.',
    'page.budgets.statusUpdateFailed': 'فشل تحديث حالة الميزانية.',
    'page.budgets.deleteFailed': 'فشل حذف الميزانية.',
    'page.budgets.saveFailed': 'فشل حفظ الميزانية.',

    /* ── Reports keys ───────────────────────────────────────────────────── */
    'page.reports.fetchFailed': 'فشل استرجاع التقارير.',
    'page.reports.exportFailed': 'فشل تصدير التقرير.',

    /* ── Settings keys ──────────────────────────────────────────────────── */
    'page.settings.loadPlansFailed': 'فشل تحميل خطط الاشتراك.',
    'page.settings.upgradeSuccess': 'تم ترقية الخطة بنجاح.',
    'page.settings.upgradeFailed': 'فشل ترقية الخطة.',
    'page.settings.loadCompanyFailed': 'فشل تحميل تفاصيل الشركة.',
    'page.settings.saveCompanyFailed': 'فشل حفظ ملف الشركة.',

    /* ── Variance keys ──────────────────────────────────────────────────── */
    'page.variance.fetchFailed': 'فشل استرجاع بيانات الانحراف.',

    /* ── Approvals keys ─────────────────────────────────────────────────── */
    'page.approvals.loadFailed': 'فشل تحميل الموافقات.',

    /* ── Promotions keys ────────────────────────────────────────────────── */
    'page.promotions.loadFailed': 'فشل تحميل العروض الترويجية.',

    /* ── Scenarios keys ─────────────────────────────────────────────────── */
    'page.scenarios.fetchFailed': 'فشل استرجاع السيناريوهات.',

    /* ── Headcount Plans keys ───────────────────────────────────────────── */
    'page.headcountPlans.fetchFailed': 'فشل استرجاع خطط التوظيف.',

    /* ── Inventory keys ─────────────────────────────────────────────────── */
    'page.inventory.fetchFailed': 'فشل استرجاع بيانات المخزون.',

    /* ── Backend error code translations ─────────────────────────────────── */
    'backend.ORACLE_TABLE_NOT_FOUND': 'الجدول أو العرض غير موجود في Oracle. يرجى التحقق من تعيين الاستيراد.',
    'backend.ORACLE_INVALID_COLUMN': 'اسم عمود Oracle غير صالح.',
    'backend.ORACLE_INVALID_CREDENTIALS': 'اسم مستخدم أو كلمة مرور Oracle غير صالحة.',
    'backend.ORACLE_CONNECTION_FAILED': 'تعذر الاتصال بمضمن/منفذ/خدمة Oracle.',
    'backend.ORACLE_CLIENT_NOT_CONFIGURED': 'عميل Oracle غير مُعد على هذا الخادم.',
    'backend.ORACLE_UNKNOWN': 'حدث خطأ في Oracle.',
    'backend.MAPPING_VALIDATION_FAILED': 'فشل التحقق من التعيين.',
    'backend.MAPPING_NOT_FOUND': 'قالب التعيين غير موجود.',
    'backend.SYNC_FAILED': 'فشلت مزامنة البيانات.',
    'backend.SYNC_NO_ROWS': 'لم يتم استرجاع صفوف لتنفيذ المزامنة.',
    'backend.PREVIEW_FAILED': 'فشل إنشاء المعاينة.',
    'backend.PREVIEW_INVALID_TABLE': 'تنسيق اسم الجدول غير صالح.',
    'backend.PREVIEW_INVALID_COLUMN': 'اسم العمود غير صالح.',
    'backend.CONNECTION_NOT_FOUND': 'الاتصال غير موجود.',
    'backend.CONNECTION_TEST_FAILED': 'فشل اختبار الاتصال.',
    'backend.AI_UNAVAILABLE': 'اقتراحات الذكاء الاصطناعي غير متاحة. يرجى إعداد مفتاح GEMINI_API_KEY.',
    'backend.AI_INVALID_RESPONSE': 'استجابة الذكاء الاصطناعي غير صالحة. يرجى المحاولة مرة أخرى.',
    'backend.AI_GENERATION_FAILED': 'فشل إنشاء اقتراحات الذكاء الاصطناعي. يرجى المحاولة لاحقاً.',
    'backend.AI_PROVIDER_OVERLOADED': 'خدمة الذكاء الاصطناعي مشغولة حالياً. يرجى المحاولة بعد بضع دقائق.',
    'backend.AUTH_INVALID_CREDENTIALS': 'بيانات الاعتماد غير صالحة. يرجى المحاولة مرة أخرى.',
    'backend.AUTH_USER_INACTIVE': 'حساب المستخدم غير نشط.',
    'backend.AUTH_TOKEN_EXPIRED': 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.',
    'backend.AUTH_TENANT_REQUIRED': 'معرف المؤسسة مطلوب.',
    'backend.AUTH_TENANT_INVALID': 'معرف المؤسسة غير صالح.',
    'backend.NOT_FOUND': 'المورد غير موجود.',
    'backend.VALIDATION_FAILED': 'فشل التحقق.',
    'backend.COMPANY_NOT_FOUND': 'الشركة غير موجودة.',
    'backend.DEFAULT': 'حدث خطأ. يرجى المحاولة مرة أخرى.',
  },
};
