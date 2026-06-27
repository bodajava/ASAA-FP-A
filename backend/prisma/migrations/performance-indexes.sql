-- ═══════════════════════════════════════════════════════════════════════════
-- Enterprise Performance Indexes
-- 
-- Purpose: Add indexes for frequently searched columns and common query
-- patterns used by the FP&A platform (dashboards, reports, imports).
--
-- Safe to run: Uses ADD INDEX IF NOT EXISTS (MySQL 10.5+ / MariaDB 10.2+)
-- Non-destructive: Never drops existing indexes.
-- Idempotent: Running multiple times is safe.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Companies ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_companies_tenant_name ON companies(tenant_id, name);

-- ─── Users ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_status ON users(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- ─── Sites ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sites_company_type ON sites(company_id, type);
CREATE INDEX IF NOT EXISTS idx_sites_company_name ON sites(company_id, name);

-- ─── Units ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_units_company_name ON units(company_id, name);
CREATE INDEX IF NOT EXISTS idx_units_company_symbol ON units(company_id, symbol);

-- ─── Accounts ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_accounts_company_code ON accounts(company_id, code);
CREATE INDEX IF NOT EXISTS idx_accounts_company_type ON accounts(company_id, type);
CREATE INDEX IF NOT EXISTS idx_accounts_parent_id ON accounts(parent_id);

-- ─── Cost Centers ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cost_centers_company_code ON cost_centers(company_id, code);
CREATE INDEX IF NOT EXISTS idx_cost_centers_company_type ON cost_centers(company_id, type);
CREATE INDEX IF NOT EXISTS idx_cost_centers_site_id ON cost_centers(site_id);

-- ─── Product Categories ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_product_categories_company_name ON product_categories(company_id, name);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id ON product_categories(parent_id);

-- ─── Products ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_company_sku ON products(company_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_company_name ON products(company_id, name);
CREATE INDEX IF NOT EXISTS idx_products_company_type ON products(company_id, product_type);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_unit_id ON products(unit_id);
CREATE INDEX IF NOT EXISTS idx_products_company_active ON products(company_id, is_active);

-- ─── Materials ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_materials_company_code ON materials(company_id, code);
CREATE INDEX IF NOT EXISTS idx_materials_company_name ON materials(company_id, name);
CREATE INDEX IF NOT EXISTS idx_materials_company_type ON materials(company_id, material_type);
CREATE INDEX IF NOT EXISTS idx_materials_supplier_id ON materials(supplier_id);
CREATE INDEX IF NOT EXISTS idx_materials_unit_id ON materials(unit_id);
CREATE INDEX IF NOT EXISTS idx_materials_company_active ON materials(company_id, is_active);

-- ─── Suppliers ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_suppliers_company_name ON suppliers(company_id, name);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_active ON suppliers(company_id, is_active);

-- ─── Customers ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_customers_company_code ON customers(company_id, code);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_company_type ON customers(company_id, customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_company_region ON customers(company_id, region);
CREATE INDEX IF NOT EXISTS idx_customers_company_active ON customers(company_id, is_active);

-- ─── Exchange Rates ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_exchange_rates_company_date ON exchange_rates(company_id, rate_date);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_company_currencies ON exchange_rates(company_id, from_currency, to_currency);

-- ─── BOM Recipes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bom_recipes_company_product ON bom_recipes(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_bom_recipes_company_status ON bom_recipes(company_id, status);

-- ─── BOM Lines ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bom_lines_bom_id ON bom_lines(bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_lines_material_id ON bom_lines(material_id);

-- ─── Raw Material Prices ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_raw_material_prices_company_material ON raw_material_prices(company_id, material_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_prices_material_date ON raw_material_prices(material_id, price_date);
CREATE INDEX IF NOT EXISTS idx_raw_material_prices_company_date ON raw_material_prices(company_id, price_date);

-- ─── Budget Cycles ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_budget_cycles_company_year ON budget_cycles(company_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budget_cycles_company_status ON budget_cycles(company_id, status);

-- ─── Budget Lines ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_budget_lines_cycle_account ON budget_lines(budget_cycle_id, account_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_cycle_month ON budget_lines(budget_cycle_id, period_month);
CREATE INDEX IF NOT EXISTS idx_budget_lines_account_id ON budget_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_product_id ON budget_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_site_id ON budget_lines(site_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_cost_center_id ON budget_lines(cost_center_id);

-- ─── Forecast Cycles ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_forecast_cycles_company_year ON forecast_cycles(company_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_forecast_cycles_company_status ON forecast_cycles(company_id, status);

-- ─── Forecast Lines ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_forecast_lines_cycle_account ON forecast_lines(forecast_cycle_id, account_id);
CREATE INDEX IF NOT EXISTS idx_forecast_lines_cycle_month ON forecast_lines(forecast_cycle_id, period_month);
CREATE INDEX IF NOT EXISTS idx_forecast_lines_account_id ON forecast_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_forecast_lines_product_id ON forecast_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_forecast_lines_site_id ON forecast_lines(site_id);

-- ─── Scenarios ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scenarios_company_type ON scenarios(company_id, scenario_type);
CREATE INDEX IF NOT EXISTS idx_scenarios_company_name ON scenarios(company_id, name);

-- ─── Actual Imports ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_actual_imports_company_status ON actual_imports(company_id, status);
CREATE INDEX IF NOT EXISTS idx_actual_imports_company_type ON actual_imports(company_id, import_type);
CREATE INDEX IF NOT EXISTS idx_actual_imports_company_date ON actual_imports(company_id, created_at);

-- ─── Actual Lines ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_actual_lines_import_id ON actual_lines(actual_import_id);
CREATE INDEX IF NOT EXISTS idx_actual_lines_account_id ON actual_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_actual_lines_product_id ON actual_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_actual_lines_material_id ON actual_lines(material_id);
CREATE INDEX IF NOT EXISTS idx_actual_lines_customer_id ON actual_lines(customer_id);
CREATE INDEX IF NOT EXISTS idx_actual_lines_site_id ON actual_lines(site_id);
CREATE INDEX IF NOT EXISTS idx_actual_lines_cost_center_id ON actual_lines(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_actual_lines_date_account ON actual_lines(transaction_date, account_id);

-- ─── Production Plans ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_production_plans_company_year ON production_plans(company_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_production_plans_company_month ON production_plans(company_id, period_month);
CREATE INDEX IF NOT EXISTS idx_production_plans_product_id ON production_plans(product_id);
CREATE INDEX IF NOT EXISTS idx_production_plans_site_id ON production_plans(site_id);

-- ─── Inventory Snapshots ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_company_date ON inventory_snapshots(company_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_product_id ON inventory_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_material_id ON inventory_snapshots(material_id);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_site_id ON inventory_snapshots(site_id);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_batch ON inventory_snapshots(batch_number);

-- ─── KPI Targets ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kpi_targets_company_year ON kpi_targets(company_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_kpi_targets_company_name ON kpi_targets(company_id, kpi_name);
CREATE INDEX IF NOT EXISTS idx_kpi_targets_company_category ON kpi_targets(company_id, kpi_category);
CREATE INDEX IF NOT EXISTS idx_kpi_targets_site_id ON kpi_targets(site_id);

-- ─── Notifications ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_company_created ON notifications(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_company_user ON notifications(company_id, user_id);

-- ─── Alerts ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_alerts_company_category ON alerts(company_id, category);
CREATE INDEX IF NOT EXISTS idx_alerts_company_priority ON alerts(company_id, priority);
CREATE INDEX IF NOT EXISTS idx_alerts_user_read ON alerts(user_id, is_read);

-- ─── Import Jobs ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_import_jobs_company_module ON import_jobs(company_id, module);
CREATE INDEX IF NOT EXISTS idx_import_jobs_company_status ON import_jobs(company_id, status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_user_id ON import_jobs(user_id);

-- ─── Import Job Lines ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_import_job_lines_job_status ON import_job_lines(job_id, status);
CREATE INDEX IF NOT EXISTS idx_import_job_lines_job_row ON import_job_lines(job_id, row_number);

-- ─── Product Cost Snapshots ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_product_cost_snapshots_company_product ON product_cost_snapshots(company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_product_cost_snapshots_product_period ON product_cost_snapshots(product_id, period);

-- ─── Production Cost Allocations ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_production_cost_allocations_company_period ON production_cost_allocations(company_id, period);
CREATE INDEX IF NOT EXISTS idx_production_cost_allocations_product_id ON production_cost_allocations(product_id);
CREATE INDEX IF NOT EXISTS idx_production_cost_allocations_site_id ON production_cost_allocations(site_id);

-- ─── Cost Drivers ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cost_drivers_company_name ON cost_drivers(company_id, name);
CREATE INDEX IF NOT EXISTS idx_cost_drivers_company_type ON cost_drivers(company_id, driver_type);

-- ─── Promotions ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_promotions_company_active ON promotions(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_product_id ON promotions(product_id);
CREATE INDEX IF NOT EXISTS idx_promotions_customer_id ON promotions(customer_id);
CREATE INDEX IF NOT EXISTS idx_promotions_company_dates ON promotions(company_id, start_date, end_date);

-- ─── Notification Rules ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notification_rules_company ON notification_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_notification_rules_account_id ON notification_rules(account_id);

-- ─── Headcount Plans ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_headcount_plans_cycle_month ON headcount_plans(budget_cycle_id, period_month);
CREATE INDEX IF NOT EXISTS idx_headcount_plans_site_id ON headcount_plans(site_id);

-- ─── Seasonal Indices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_seasonal_indices_company ON seasonal_indices(company_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_indices_account_month ON seasonal_indices(account_id, month);

-- ─── Approvals ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_approvals_entity_status ON approvals(entity_type, entity_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_tenant_status ON approvals(tenant_id, status);

-- ─── Audit Logs ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_entity ON audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ─── Subscriptions ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status ON subscriptions(tenant_id, status);

SELECT 'Enterprise performance indexes created successfully' AS result;
