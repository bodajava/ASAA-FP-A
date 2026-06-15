export type Locale = 'en' | 'ar';

export type TranslationKey =
  | 'app.name'
  | 'app.tagline'
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
  | 'page.budgets.title'
  | 'page.forecasts.title'
  | 'page.scenarios.title'
  | 'page.reports.title'
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
  | 'page.settings.title'
  | 'page.users.title'
  | 'page.exchangeRates.title'
  | 'page.connections.title'
  | 'page.importMappings.title'
  | 'page.productionPlanning.title'
  | 'page.headcountPlans.title';

export const translations: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    'app.name': 'ASAA FP&A',
    'app.tagline': 'Financial Planning & Analysis',
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
    'page.dashboard.title': 'Dashboard',
    'page.dashboard.revenue': 'Revenue',
    'page.dashboard.expenses': 'Expenses',
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
    'page.budgets.title': 'Budgets',
    'page.forecasts.title': 'Forecasts',
    'page.scenarios.title': 'Scenarios',
    'page.reports.title': 'Reports',
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
    'page.settings.title': 'Settings',
    'page.users.title': 'Users',
    'page.exchangeRates.title': 'Exchange Rates',
    'page.connections.title': 'Connections',
    'page.importMappings.title': 'Import Mappings',
    'page.productionPlanning.title': 'Production Planning',
    'page.headcountPlans.title': 'Headcount Plans',
  },
  ar: {
    'app.name': 'ASAA FP&A',
    'app.tagline': 'التخطيط والتحليل المالي',
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
    'page.dashboard.title': 'لوحة التحكم',
    'page.dashboard.revenue': 'الإيرادات',
    'page.dashboard.expenses': 'المصروفات',
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
    'page.budgets.title': 'الميزانيات',
    'page.forecasts.title': 'التوقعات',
    'page.scenarios.title': 'السيناريوهات',
    'page.reports.title': 'التقارير',
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
    'page.settings.title': 'الإعدادات',
    'page.users.title': 'المستخدمين',
    'page.exchangeRates.title': 'أسعار الصرف',
    'page.connections.title': 'الاتصالات',
    'page.importMappings.title': 'تعيينات الاستيراد',
    'page.productionPlanning.title': 'تخطيط الإنتاج',
    'page.headcountPlans.title': 'خطط التوظيف',
  },
};
