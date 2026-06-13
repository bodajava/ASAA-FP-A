import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { ClearCacheInterceptor } from './common/interceptors/clear-cache.interceptor';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { CompaniesModule } from './companies/companies.module';
import { RolesModule } from './roles/roles.module';
import { SitesModule } from './sites/sites.module';
import { UnitsModule } from './units/units.module';
import { AccountsModule } from './accounts/accounts.module';
import { CostCentersModule } from './cost-centers/cost-centers.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { MaterialsModule } from './materials/materials.module';
import { BomRecipesModule } from './bom-recipes/bom-recipes.module';
import { BudgetsModule } from './budgets/budgets.module';
import { ActualImportsModule } from './actual-imports/actual-imports.module';
import { ForecastsModule } from './forecasts/forecasts.module';
import { ScenariosModule } from './scenarios/scenarios.module';
import { VarianceModule } from './variance/variance.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { ImportsModule } from './imports/imports.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { HeadcountPlansModule } from './headcount-plans/headcount-plans.module';
import { KpiTargetsModule } from './kpi-targets/kpi-targets.module';
import { ProductionPlansModule } from './production-plans/production-plans.module';
import { InventoryModule } from './inventory/inventory.module';
import { PromotionsModule } from './promotions/promotions.module';
import { RawMaterialPricesModule } from './raw-material-prices/raw-material-prices.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TenantsModule,
    CompaniesModule,
    RolesModule,
    SitesModule,
    UnitsModule,
    AccountsModule,
    CostCentersModule,
    ProductCategoriesModule,
    SuppliersModule,
    CustomersModule,
    ProductsModule,
    MaterialsModule,
    BomRecipesModule,
    BudgetsModule,
    ActualImportsModule,
    ForecastsModule,
    ScenariosModule,
    VarianceModule,
    ReportsModule,
    DashboardModule,
    IntegrationsModule,
    NotificationsModule,
    AuditLogsModule,
    ImportsModule,
    ExchangeRatesModule,
    HeadcountPlansModule,
    KpiTargetsModule,
    ProductionPlansModule,
    InventoryModule,
    PromotionsModule,
    RawMaterialPricesModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: ClearCacheInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
