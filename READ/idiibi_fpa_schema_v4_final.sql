-- ============================================================
-- idiibi FP&A Suite - SaaS Database v4 FINAL
-- Engine: MySQL 8+  |  Charset: utf8mb4
-- التغييرات عن v1:
--   1. تصليح vw_budget_vs_actual (إضافة fiscal_year في JOIN)
--   2. إضافة fiscal_year في production_plans
--   3. جدول customers جديد
--   4. جدول exchange_rates جديد
--   5. جدول headcount_plans جديد (تخطيط الرواتب والموارد البشرية)
--   6. جدول notification_rules جديد
--   7. جدول kpi_targets جديد
--   8. VIEW جديدة: vw_budget_actual_forecast الثلاثية
-- ============================================================

CREATE DATABASE IF NOT EXISTS idiibi_fpa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE idiibi_fpa;

-- ============================================================
-- CORE SaaS LAYER
-- ============================================================

CREATE TABLE plans (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  monthly_price DECIMAL(12,2) DEFAULT 0,
  yearly_price  DECIMAL(12,2) DEFAULT 0,
  max_companies INT DEFAULT 1,
  max_users     INT DEFAULT 5,
  features      JSON NULL,
  is_active     TINYINT(1) DEFAULT 1,
  created_at    TIMESTAMP NULL,
  updated_at    TIMESTAMP NULL
) ENGINE=InnoDB;

CREATE TABLE tenants (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id       BIGINT UNSIGNED NULL,
  name          VARCHAR(180) NOT NULL,
  slug          VARCHAR(120) UNIQUE,
  status        ENUM('trial','active','suspended','cancelled') DEFAULT 'trial',
  trial_ends_at DATE NULL,
  created_at    TIMESTAMP NULL,
  updated_at    TIMESTAMP NULL,
  CONSTRAINT fk_tenants_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE subscriptions (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id     BIGINT UNSIGNED NOT NULL,
  plan_id       BIGINT UNSIGNED NOT NULL,
  starts_at     DATE NOT NULL,
  ends_at       DATE NULL,
  billing_cycle ENUM('monthly','yearly','custom') DEFAULT 'monthly',
  amount        DECIMAL(12,2) DEFAULT 0,
  status        ENUM('active','past_due','cancelled','expired') DEFAULT 'active',
  created_at    TIMESTAMP NULL,
  updated_at    TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id)   REFERENCES plans(id)
) ENGINE=InnoDB;

CREATE TABLE companies (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id               BIGINT UNSIGNED NOT NULL,
  name                    VARCHAR(200) NOT NULL,
  legal_name              VARCHAR(220) NULL,
  industry_type           ENUM('food_manufacturing','food_retail','mixed','other') DEFAULT 'mixed',
  currency_code           CHAR(3) DEFAULT 'EGP',
  fiscal_year_start_month TINYINT DEFAULT 1,
  tax_number              VARCHAR(80) NULL,
  created_at              TIMESTAMP NULL,
  updated_at              TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_companies_tenant (tenant_id)
) ENGINE=InnoDB;

CREATE TABLE roles (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT UNSIGNED NULL,
  name        VARCHAR(100) NOT NULL,
  permissions JSON NULL,
  created_at  TIMESTAMP NULL,
  updated_at  TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE users (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id     BIGINT UNSIGNED NOT NULL,
  role_id       BIGINT UNSIGNED NULL,
  name          VARCHAR(160) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  phone         VARCHAR(40) NULL,
  password_hash VARCHAR(255) NOT NULL,
  status        ENUM('active','inactive','invited','blocked') DEFAULT 'active',
  last_login_at TIMESTAMP NULL,
  created_at    TIMESTAMP NULL,
  updated_at    TIMESTAMP NULL,
  UNIQUE KEY uq_tenant_email (tenant_id, email),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id)   REFERENCES roles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- MASTER DATA
-- ============================================================

CREATE TABLE sites (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      BIGINT UNSIGNED NOT NULL,
  manager_user_id BIGINT UNSIGNED NULL,
  name            VARCHAR(180) NOT NULL,
  type            ENUM('factory','branch','warehouse','office','distribution_center') NOT NULL,
  region          VARCHAR(120) NULL,
  address         VARCHAR(255) NULL,
  status          ENUM('active','inactive') DEFAULT 'active',
  created_at      TIMESTAMP NULL,
  updated_at      TIMESTAMP NULL,
  FOREIGN KEY (company_id)      REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_sites_company_type (company_id, type)
) ENGINE=InnoDB;

CREATE TABLE units (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  name       VARCHAR(80) NOT NULL,
  symbol     VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE accounts (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  parent_id  BIGINT UNSIGNED NULL,
  code       VARCHAR(50) NOT NULL,
  name       VARCHAR(160) NOT NULL,
  type       ENUM('revenue','cogs','expense','asset','liability','equity','cashflow') NOT NULL,
  is_active  TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY uq_account_code (company_id, code),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id)  REFERENCES accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE cost_centers (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  site_id    BIGINT UNSIGNED NULL,
  parent_id  BIGINT UNSIGNED NULL,
  code       VARCHAR(60) NULL,
  name       VARCHAR(160) NOT NULL,
  type       ENUM('sales','production','admin','marketing','logistics','maintenance','other') DEFAULT 'other',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id)    REFERENCES sites(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_id)  REFERENCES cost_centers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE product_categories (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  name       VARCHAR(160) NOT NULL,
  parent_id  BIGINT UNSIGNED NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id)  REFERENCES product_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE products (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    BIGINT UNSIGNED NOT NULL,
  category_id   BIGINT UNSIGNED NULL,
  unit_id       BIGINT UNSIGNED NULL,
  sku           VARCHAR(80) NOT NULL,
  name          VARCHAR(200) NOT NULL,
  product_type  ENUM('finished_good','semi_finished','service') DEFAULT 'finished_good',
  sale_price    DECIMAL(14,4) DEFAULT 0,
  standard_cost DECIMAL(14,4) DEFAULT 0,
  is_active     TINYINT(1) DEFAULT 1,
  created_at    TIMESTAMP NULL,
  updated_at    TIMESTAMP NULL,
  UNIQUE KEY uq_product_sku (company_id, sku),
  FOREIGN KEY (company_id)  REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id)     REFERENCES units(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE suppliers (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  name       VARCHAR(200) NOT NULL,
  phone      VARCHAR(50) NULL,
  email      VARCHAR(160) NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE materials (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id        BIGINT UNSIGNED NOT NULL,
  supplier_id       BIGINT UNSIGNED NULL,
  unit_id           BIGINT UNSIGNED NULL,
  code              VARCHAR(80) NOT NULL,
  name              VARCHAR(200) NOT NULL,
  purchase_price    DECIMAL(14,4) DEFAULT 0,
  safety_stock_qty  DECIMAL(14,4) DEFAULT 0,
  is_active         TINYINT(1) DEFAULT 1,
  created_at        TIMESTAMP NULL,
  updated_at        TIMESTAMP NULL,
  UNIQUE KEY uq_material_code (company_id, code),
  FOREIGN KEY (company_id)  REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id)     REFERENCES units(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- [جديد] CUSTOMERS - عملاء / موزعين
-- مطلوب لتحليل ربحية العميل والمنطقة
-- ============================================================
CREATE TABLE customers (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      BIGINT UNSIGNED NOT NULL,
  code            VARCHAR(80) NOT NULL,
  name            VARCHAR(200) NOT NULL,
  customer_type   ENUM('retail','wholesale','distributor','internal','other') DEFAULT 'retail',
  region          VARCHAR(120) NULL,
  phone           VARCHAR(50) NULL,
  email           VARCHAR(160) NULL,
  credit_limit    DECIMAL(16,2) DEFAULT 0,
  payment_terms   TINYINT UNSIGNED DEFAULT 30          COMMENT 'أيام الأجل',
  is_active       TINYINT(1) DEFAULT 1,
  created_at      TIMESTAMP NULL,
  updated_at      TIMESTAMP NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_customers_company (company_id)
) ENGINE=InnoDB;

-- ============================================================
-- [جديد] EXCHANGE RATES - أسعار الصرف
-- مطلوب لأن companies.currency_code موجود لكن مفيش أسعار صرف
-- ============================================================
CREATE TABLE exchange_rates (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    BIGINT UNSIGNED NOT NULL,
  from_currency CHAR(3) NOT NULL,
  to_currency   CHAR(3) NOT NULL,
  rate          DECIMAL(18,6) NOT NULL,
  rate_date     DATE NOT NULL,
  source        ENUM('manual','api','import') DEFAULT 'manual',
  created_by    BIGINT UNSIGNED NULL,
  created_at    TIMESTAMP NULL,
  updated_at    TIMESTAMP NULL,
  UNIQUE KEY uq_rate_date (company_id, from_currency, to_currency, rate_date),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_rates_lookup (company_id, from_currency, to_currency, rate_date)
) ENGINE=InnoDB;

-- ============================================================
-- BOM (وصفات الإنتاج)
-- ============================================================

CREATE TABLE bom_recipes (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    BIGINT UNSIGNED NOT NULL,
  product_id    BIGINT UNSIGNED NOT NULL,
  version       VARCHAR(30) DEFAULT 'v1',
  output_qty    DECIMAL(14,4) DEFAULT 1,
  wastage_pct   DECIMAL(6,3) DEFAULT 0,
  labor_cost    DECIMAL(14,4) DEFAULT 0,
  overhead_cost DECIMAL(14,4) DEFAULT 0,
  is_active     TINYINT(1) DEFAULT 1,
  created_at    TIMESTAMP NULL,
  updated_at    TIMESTAMP NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE bom_lines (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bom_id         BIGINT UNSIGNED NOT NULL,
  material_id    BIGINT UNSIGNED NOT NULL,
  qty_per_output DECIMAL(14,6) NOT NULL,
  unit_cost      DECIMAL(14,4) DEFAULT 0,
  wastage_pct    DECIMAL(6,3) DEFAULT 0,
  created_at     TIMESTAMP NULL,
  updated_at     TIMESTAMP NULL,
  FOREIGN KEY (bom_id)      REFERENCES bom_recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id)
) ENGINE=InnoDB;

-- ============================================================
-- BUDGET
-- ============================================================

CREATE TABLE budget_cycles (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id  BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(160) NOT NULL,
  fiscal_year INT NOT NULL,
  period_type ENUM('annual','quarterly','monthly') DEFAULT 'annual',
  version     INT DEFAULT 1,
  status      ENUM('draft','submitted','approved','rejected','locked') DEFAULT 'draft',
  created_by  BIGINT UNSIGNED NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at TIMESTAMP NULL,
  created_at  TIMESTAMP NULL,
  updated_at  TIMESTAMP NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_budget_year (company_id, fiscal_year, status)
) ENGINE=InnoDB;

CREATE TABLE budget_lines (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  budget_cycle_id  BIGINT UNSIGNED NOT NULL,
  account_id       BIGINT UNSIGNED NOT NULL,
  site_id          BIGINT UNSIGNED NULL,
  cost_center_id   BIGINT UNSIGNED NULL,
  product_id       BIGINT UNSIGNED NULL,
  material_id      BIGINT UNSIGNED NULL,
  customer_id      BIGINT UNSIGNED NULL,                   -- [جديد] لتحليل ربحية العميل
  period_month     TINYINT NOT NULL,
  quantity         DECIMAL(16,4) DEFAULT 0,
  unit_price       DECIMAL(16,4) DEFAULT 0,
  amount           DECIMAL(16,2) NOT NULL DEFAULT 0,
  notes            TEXT NULL,
  created_at       TIMESTAMP NULL,
  updated_at       TIMESTAMP NULL,
  FOREIGN KEY (budget_cycle_id) REFERENCES budget_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id)      REFERENCES accounts(id),
  FOREIGN KEY (site_id)         REFERENCES sites(id) ON DELETE SET NULL,
  FOREIGN KEY (cost_center_id)  REFERENCES cost_centers(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id)      REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (material_id)     REFERENCES materials(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id)     REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_budget_lines_period (budget_cycle_id, period_month, account_id)
) ENGINE=InnoDB;

-- ============================================================
-- [جديد] HEADCOUNT PLANS - تخطيط الرواتب والموارد البشرية
-- مذكور في الشاشات (المصروفات والرواتب) لكن مكانش في الـ schema
-- ============================================================
CREATE TABLE headcount_plans (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  budget_cycle_id  BIGINT UNSIGNED NOT NULL,
  site_id          BIGINT UNSIGNED NULL,
  cost_center_id   BIGINT UNSIGNED NULL,
  job_title        VARCHAR(160) NOT NULL,
  department       VARCHAR(120) NULL,
  employment_type  ENUM('full_time','part_time','contract','seasonal') DEFAULT 'full_time',
  headcount        INT DEFAULT 1                         COMMENT 'عدد الموظفين',
  period_month     TINYINT NOT NULL,
  basic_salary     DECIMAL(14,2) DEFAULT 0,
  allowances       DECIMAL(14,2) DEFAULT 0              COMMENT 'بدلات وحوافز',
  social_insurance DECIMAL(14,2) DEFAULT 0,
  total_cost       DECIMAL(14,2) GENERATED ALWAYS AS    -- محتسبة تلقائياً
                   ((basic_salary + allowances + social_insurance) * headcount) STORED,
  notes            TEXT NULL,
  created_at       TIMESTAMP NULL,
  updated_at       TIMESTAMP NULL,
  FOREIGN KEY (budget_cycle_id) REFERENCES budget_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id)         REFERENCES sites(id) ON DELETE SET NULL,
  FOREIGN KEY (cost_center_id)  REFERENCES cost_centers(id) ON DELETE SET NULL,
  INDEX idx_headcount_cycle (budget_cycle_id, period_month)
) ENGINE=InnoDB;

-- ============================================================
-- SCENARIOS & FORECAST
-- ============================================================

CREATE TABLE scenarios (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id       BIGINT UNSIGNED NOT NULL,
  name             VARCHAR(160) NOT NULL,
  scenario_type    ENUM('base','optimistic','pessimistic','custom') DEFAULT 'custom',
  assumptions_json JSON NULL,
  created_by       BIGINT UNSIGNED NULL,
  created_at       TIMESTAMP NULL,
  updated_at       TIMESTAMP NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE forecast_cycles (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id  BIGINT UNSIGNED NOT NULL,
  scenario_id BIGINT UNSIGNED NULL,
  name        VARCHAR(160) NOT NULL,
  fiscal_year INT NOT NULL,                               -- [جديد] إضافة fiscal_year صريحة
  base_period DATE NOT NULL,
  method      ENUM('manual','rolling','driver_based','ai_assisted') DEFAULT 'manual',
  status      ENUM('draft','submitted','approved','rejected','locked') DEFAULT 'draft',
  created_by  BIGINT UNSIGNED NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at TIMESTAMP NULL,
  created_at  TIMESTAMP NULL,
  updated_at  TIMESTAMP NULL,
  FOREIGN KEY (company_id)  REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by)  REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_forecast_year (company_id, fiscal_year, status)
) ENGINE=InnoDB;

CREATE TABLE forecast_lines (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  forecast_cycle_id BIGINT UNSIGNED NOT NULL,
  account_id        BIGINT UNSIGNED NOT NULL,
  site_id           BIGINT UNSIGNED NULL,
  cost_center_id    BIGINT UNSIGNED NULL,
  product_id        BIGINT UNSIGNED NULL,
  material_id       BIGINT UNSIGNED NULL,
  customer_id       BIGINT UNSIGNED NULL,                 -- [جديد]
  period_month      TINYINT NOT NULL,
  quantity          DECIMAL(16,4) DEFAULT 0,
  unit_price        DECIMAL(16,4) DEFAULT 0,
  amount            DECIMAL(16,2) NOT NULL DEFAULT 0,
  driver_type       VARCHAR(80) NULL,
  notes             TEXT NULL,
  created_at        TIMESTAMP NULL,
  updated_at        TIMESTAMP NULL,
  FOREIGN KEY (forecast_cycle_id) REFERENCES forecast_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id)        REFERENCES accounts(id),
  FOREIGN KEY (site_id)           REFERENCES sites(id) ON DELETE SET NULL,
  FOREIGN KEY (cost_center_id)    REFERENCES cost_centers(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id)        REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (material_id)       REFERENCES materials(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id)       REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_forecast_lines_period (forecast_cycle_id, period_month, account_id)
) ENGINE=InnoDB;

-- ============================================================
-- ACTUALS
-- ============================================================

CREATE TABLE actual_imports (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    BIGINT UNSIGNED NOT NULL,
  source_system ENUM('excel','oracle','sap','erp','pms','odoo','pos','woocommerce','manual','api','custom') DEFAULT 'excel',
  import_type   ENUM('sales','expenses','production','inventory','gl','cashflow') NOT NULL,
  period_from   DATE NOT NULL,
  period_to     DATE NOT NULL,
  file_path     VARCHAR(255) NULL,
  status        ENUM('uploaded','validated','posted','failed') DEFAULT 'uploaded',
  error_log     TEXT NULL,                                -- [جديد] تخزين أخطاء الاستيراد
  imported_by   BIGINT UNSIGNED NULL,
  created_at    TIMESTAMP NULL,
  updated_at    TIMESTAMP NULL,
  FOREIGN KEY (company_id)  REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE actual_lines (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actual_import_id BIGINT UNSIGNED NOT NULL,
  account_id       BIGINT UNSIGNED NOT NULL,
  site_id          BIGINT UNSIGNED NULL,
  cost_center_id   BIGINT UNSIGNED NULL,
  product_id       BIGINT UNSIGNED NULL,
  material_id      BIGINT UNSIGNED NULL,
  customer_id      BIGINT UNSIGNED NULL,                  -- [جديد]
  transaction_date DATE NOT NULL,
  quantity         DECIMAL(16,4) DEFAULT 0,
  unit_price       DECIMAL(16,4) DEFAULT 0,
  amount           DECIMAL(16,2) NOT NULL DEFAULT 0,
  reference_no     VARCHAR(120) NULL,
  created_at       TIMESTAMP NULL,
  updated_at       TIMESTAMP NULL,
  FOREIGN KEY (actual_import_id) REFERENCES actual_imports(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id)       REFERENCES accounts(id),
  FOREIGN KEY (site_id)          REFERENCES sites(id) ON DELETE SET NULL,
  FOREIGN KEY (cost_center_id)   REFERENCES cost_centers(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id)       REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (material_id)      REFERENCES materials(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id)      REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_actual_lines_date (transaction_date, account_id)
) ENGINE=InnoDB;

-- ============================================================
-- PRODUCTION & INVENTORY
-- ============================================================

CREATE TABLE production_plans (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id     BIGINT UNSIGNED NOT NULL,
  site_id        BIGINT UNSIGNED NOT NULL,
  product_id     BIGINT UNSIGNED NOT NULL,
  plan_source    ENUM('budget','forecast','manual') DEFAULT 'manual',
  fiscal_year    INT NOT NULL,                            -- [FIX] كان ناقص — بيمنع خلط سنتين
  period_month   TINYINT NOT NULL,
  planned_qty    DECIMAL(16,4) NOT NULL DEFAULT 0,
  actual_qty     DECIMAL(16,4) DEFAULT 0,                -- [جديد] الكمية الفعلية للمقارنة
  estimated_cost DECIMAL(16,2) DEFAULT 0,
  actual_cost    DECIMAL(16,2) DEFAULT 0,                -- [جديد]
  created_at     TIMESTAMP NULL,
  updated_at     TIMESTAMP NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id)    REFERENCES sites(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  UNIQUE KEY uq_production_plan (company_id, site_id, product_id, fiscal_year, period_month)
) ENGINE=InnoDB;

CREATE TABLE inventory_snapshots (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      BIGINT UNSIGNED NOT NULL,
  site_id         BIGINT UNSIGNED NOT NULL,
  product_id      BIGINT UNSIGNED NULL,
  material_id     BIGINT UNSIGNED NULL,
  snapshot_date   DATE NOT NULL,
  qty_on_hand     DECIMAL(16,4) DEFAULT 0,
  inventory_value DECIMAL(16,2) DEFAULT 0,
  created_at      TIMESTAMP NULL,
  updated_at      TIMESTAMP NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id)    REFERENCES sites(id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL,
  INDEX idx_inventory_date (company_id, site_id, snapshot_date)
) ENGINE=InnoDB;

-- ============================================================
-- [جديد] KPI TARGETS - أهداف مؤشرات الأداء
-- مين يحدد إن الـ Target للمبيعات 10 مليون مثلاً؟ هنا
-- ============================================================
CREATE TABLE kpi_targets (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id     BIGINT UNSIGNED NOT NULL,
  site_id        BIGINT UNSIGNED NULL,
  kpi_name       VARCHAR(160) NOT NULL                   COMMENT 'مثال: gross_margin_pct, revenue_growth, inventory_days',
  kpi_category   ENUM('financial','operational','sales','production','hr') DEFAULT 'financial',
  fiscal_year    INT NOT NULL,
  period_month   TINYINT NULL                            COMMENT 'NULL = هدف سنوي',
  target_value   DECIMAL(18,4) NOT NULL,
  unit           VARCHAR(40) NULL                        COMMENT 'مثال: %, EGP, days',
  created_by     BIGINT UNSIGNED NULL,
  created_at     TIMESTAMP NULL,
  updated_at     TIMESTAMP NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id)    REFERENCES sites(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_kpi_year (company_id, fiscal_year, kpi_name)
) ENGINE=InnoDB;

-- ============================================================
-- [جديد] NOTIFICATION RULES - قواعد التنبيهات
-- مين يتبلغ لما الانحراف يعدي حد معين؟
-- ============================================================
CREATE TABLE notification_rules (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id       BIGINT UNSIGNED NOT NULL,
  rule_name        VARCHAR(160) NOT NULL,
  trigger_type     ENUM('variance_pct','variance_amount','kpi_breach','budget_approval','import_failed') NOT NULL,
  threshold_value  DECIMAL(14,4) NULL                   COMMENT 'مثال: 10 = لو الانحراف عدى 10%',
  account_id       BIGINT UNSIGNED NULL                  COMMENT 'لو التنبيه خاص بحساب معين',
  site_id          BIGINT UNSIGNED NULL,
  notify_roles     JSON NULL                             COMMENT 'مثال: ["CFO","FP&A Manager"]',
  notify_users     JSON NULL                             COMMENT 'مثال: [1, 5, 12] - user IDs',
  channel          SET('email','system','sms') DEFAULT 'system,email',
  is_active        TINYINT(1) DEFAULT 1,
  created_by       BIGINT UNSIGNED NULL,
  created_at       TIMESTAMP NULL,
  updated_at       TIMESTAMP NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (site_id)    REFERENCES sites(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- GOVERNANCE
-- ============================================================

CREATE TABLE approvals (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  entity_type  VARCHAR(80) NOT NULL,
  entity_id    BIGINT UNSIGNED NOT NULL,
  step_order   INT DEFAULT 1,
  status       ENUM('pending','approved','rejected') DEFAULT 'pending',
  requested_by BIGINT UNSIGNED NULL,
  approved_by  BIGINT UNSIGNED NULL,
  approved_at  TIMESTAMP NULL,
  comments     TEXT NULL,
  created_at   TIMESTAMP NULL,
  updated_at   TIMESTAMP NULL,
  FOREIGN KEY (tenant_id)    REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by)  REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_approvals_entity (entity_type, entity_id, status)
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id   BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id   BIGINT UNSIGNED NULL,
  action      VARCHAR(80) NOT NULL,
  old_values  JSON NULL,
  new_values  JSON NULL,
  ip_address  VARCHAR(60) NULL,
  user_agent  VARCHAR(255) NULL,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_entity (tenant_id, entity_type, entity_id)
) ENGINE=InnoDB;

-- ============================================================
-- NOTIFICATIONS - تسجيل التنبيهات الفعلية المرسلة
-- ============================================================
CREATE TABLE notifications (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rule_id          BIGINT UNSIGNED NULL COMMENT 'القاعدة اللي أطلقت التنبيه',
  company_id       BIGINT UNSIGNED NOT NULL,
  user_id          BIGINT UNSIGNED NULL COMMENT 'المستخدم اللي وصله التنبيه',
  title            VARCHAR(255) NOT NULL,
  body             TEXT NULL,
  channel          ENUM('email','system','sms') NOT NULL DEFAULT 'system',
  entity_type      VARCHAR(80) NULL,
  entity_id        BIGINT UNSIGNED NULL,
  trigger_data     JSON NULL,
  status           ENUM('pending','sent','failed','read') DEFAULT 'pending',
  sent_at          TIMESTAMP NULL,
  read_at          TIMESTAMP NULL,
  error_message    VARCHAR(500) NULL,
  created_at       TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rule_id)    REFERENCES notification_rules(id) ON DELETE SET NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_notif_user_status (user_id, status, created_at),
  INDEX idx_notif_company (company_id, created_at)
) ENGINE=InnoDB;

-- ============================================================
-- INTEGRATION CONNECTIONS - إعدادات الربط الخارجي
-- ============================================================
CREATE TABLE integration_connections (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id       BIGINT UNSIGNED NOT NULL,
  name             VARCHAR(160) NOT NULL,
  connection_type  ENUM('oracle','sap','erp','pms','odoo','pos','woocommerce','rest_api','sftp','custom') NOT NULL,
  host             VARCHAR(255) NULL,
  port             SMALLINT UNSIGNED NULL,
  database_name    VARCHAR(120) NULL,
  username         VARCHAR(120) NULL,
  password_enc     TEXT NULL COMMENT 'مشفر - لا تخزن plain text',
  api_base_url     VARCHAR(500) NULL,
  api_key_enc      TEXT NULL COMMENT 'مشفر',
  extra_config     JSON NULL,
  sync_schedule    ENUM('manual','hourly','daily','weekly','monthly') DEFAULT 'manual',
  last_sync_at     TIMESTAMP NULL,
  last_sync_status ENUM('success','failed','partial','never') DEFAULT 'never',
  last_sync_log    TEXT NULL,
  is_active        TINYINT(1) DEFAULT 1,
  created_by       BIGINT UNSIGNED NULL,
  created_at       TIMESTAMP NULL,
  updated_at       TIMESTAMP NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_conn_company_type (company_id, connection_type, is_active)
) ENGINE=InnoDB;

-- ============================================================
-- IMPORT MAPPINGS - حفظ Mapping لكل مصدر بيانات
-- ============================================================
CREATE TABLE import_mappings (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      BIGINT UNSIGNED NOT NULL,
  connection_id   BIGINT UNSIGNED NULL,
  name            VARCHAR(160) NOT NULL,
  source_system   ENUM('excel','oracle','sap','erp','pms','odoo','pos','woocommerce','api','custom') NOT NULL,
  import_type     ENUM('sales','expenses','production','inventory','gl','cashflow','payroll') NOT NULL,
  mapping_config  JSON NOT NULL,
  skip_errors     TINYINT(1) DEFAULT 0,
  is_default      TINYINT(1) DEFAULT 0,
  is_active       TINYINT(1) DEFAULT 1,
  last_used_at    TIMESTAMP NULL,
  created_by      BIGINT UNSIGNED NULL,
  created_at      TIMESTAMP NULL,
  updated_at      TIMESTAMP NULL,
  FOREIGN KEY (company_id)    REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (connection_id) REFERENCES integration_connections(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by)    REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_mapping_company_source (company_id, source_system, import_type),
  INDEX idx_mapping_connection (connection_id)
) ENGINE=InnoDB;

ALTER TABLE actual_imports
  ADD COLUMN mapping_id BIGINT UNSIGNED NULL AFTER source_system,
  ADD CONSTRAINT fk_actual_import_mapping
    FOREIGN KEY (mapping_id) REFERENCES import_mappings(id) ON DELETE SET NULL;

-- ============================================================
-- FINAL FIXES
-- ============================================================

-- يسمح بربط العملاء من ملفات Import عن طريق الكود بدون تكرار داخل نفس الشركة.
ALTER TABLE customers
  ADD UNIQUE KEY uq_customer_code (company_id, code);

-- تحديث source_system ليدعم ERP و PMS صراحة، وليس فقط api/custom.
ALTER TABLE actual_imports
  MODIFY source_system ENUM('excel','oracle','sap','erp','pms','odoo','pos','woocommerce','manual','api','custom') DEFAULT 'excel';

-- ============================================================
-- VIEWS
-- ============================================================

-- -------------------------------------------------------
-- vw_budget_vs_actual
-- يحل مشكلة خلط السنوات ويمنع تضاعف الأرقام عن طريق تجميع Budget و Actual قبل الـ JOIN.
-- -------------------------------------------------------
CREATE OR REPLACE VIEW vw_budget_vs_actual AS
WITH budget_agg AS (
  SELECT
    bc.company_id,
    bc.fiscal_year,
    bl.period_month,
    bl.account_id,
    bl.site_id,
    bl.product_id,
    bl.customer_id,
    SUM(bl.amount) AS budget_amount
  FROM budget_cycles bc
  JOIN budget_lines bl ON bl.budget_cycle_id = bc.id
  GROUP BY
    bc.company_id, bc.fiscal_year, bl.period_month,
    bl.account_id, bl.site_id, bl.product_id, bl.customer_id
),
actual_agg AS (
  SELECT
    ai.company_id,
    YEAR(al.transaction_date) AS fiscal_year,
    MONTH(al.transaction_date) AS period_month,
    al.account_id,
    al.site_id,
    al.product_id,
    al.customer_id,
    SUM(al.amount) AS actual_amount
  FROM actual_lines al
  JOIN actual_imports ai ON ai.id = al.actual_import_id
  GROUP BY
    ai.company_id, YEAR(al.transaction_date), MONTH(al.transaction_date),
    al.account_id, al.site_id, al.product_id, al.customer_id
)
SELECT
  b.company_id,
  b.fiscal_year,
  b.period_month,
  b.account_id,
  b.site_id,
  b.product_id,
  b.customer_id,
  b.budget_amount,
  COALESCE(a.actual_amount, 0) AS actual_amount,
  COALESCE(a.actual_amount, 0) - b.budget_amount AS variance_amount,
  CASE
    WHEN b.budget_amount = 0 THEN NULL
    ELSE ROUND(((COALESCE(a.actual_amount, 0) - b.budget_amount) / b.budget_amount) * 100, 2)
  END AS variance_pct
FROM budget_agg b
LEFT JOIN actual_agg a
  ON  a.company_id   = b.company_id
  AND a.fiscal_year  = b.fiscal_year
  AND a.period_month = b.period_month
  AND a.account_id   = b.account_id
  AND (a.site_id     <=> b.site_id)
  AND (a.product_id  <=> b.product_id)
  AND (a.customer_id <=> b.customer_id);

-- -------------------------------------------------------
-- vw_budget_actual_forecast
-- مقارنة ثلاثية بدون تضاعف، وبأحدث Forecast approved/locked ثم submitted ثم draft.
-- -------------------------------------------------------
CREATE OR REPLACE VIEW vw_budget_actual_forecast AS
WITH latest_forecast AS (
  SELECT *
  FROM (
    SELECT
      fc.*,
      ROW_NUMBER() OVER (
        PARTITION BY fc.company_id, fc.fiscal_year
        ORDER BY
          FIELD(fc.status, 'locked','approved','submitted','draft','rejected') ASC,
          fc.approved_at DESC,
          fc.base_period DESC,
          fc.id DESC
      ) AS rn
    FROM forecast_cycles fc
    WHERE fc.status IN ('locked','approved','submitted','draft')
  ) x
  WHERE x.rn = 1
),
budget_agg AS (
  SELECT
    bc.company_id,
    bc.fiscal_year,
    bl.period_month,
    bl.account_id,
    bl.site_id,
    bl.product_id,
    bl.customer_id,
    SUM(bl.amount) AS budget_amount
  FROM budget_cycles bc
  JOIN budget_lines bl ON bl.budget_cycle_id = bc.id
  GROUP BY
    bc.company_id, bc.fiscal_year, bl.period_month,
    bl.account_id, bl.site_id, bl.product_id, bl.customer_id
),
actual_agg AS (
  SELECT
    ai.company_id,
    YEAR(al.transaction_date) AS fiscal_year,
    MONTH(al.transaction_date) AS period_month,
    al.account_id,
    al.site_id,
    al.product_id,
    al.customer_id,
    SUM(al.amount) AS actual_amount
  FROM actual_lines al
  JOIN actual_imports ai ON ai.id = al.actual_import_id
  GROUP BY
    ai.company_id, YEAR(al.transaction_date), MONTH(al.transaction_date),
    al.account_id, al.site_id, al.product_id, al.customer_id
),
forecast_agg AS (
  SELECT
    fc.company_id,
    fc.fiscal_year,
    fl.period_month,
    fl.account_id,
    fl.site_id,
    fl.product_id,
    fl.customer_id,
    SUM(fl.amount) AS forecast_amount
  FROM latest_forecast fc
  JOIN forecast_lines fl ON fl.forecast_cycle_id = fc.id
  GROUP BY
    fc.company_id, fc.fiscal_year, fl.period_month,
    fl.account_id, fl.site_id, fl.product_id, fl.customer_id
)
SELECT
  b.company_id,
  b.fiscal_year,
  b.period_month,
  b.account_id,
  b.site_id,
  b.product_id,
  b.customer_id,
  b.budget_amount,
  COALESCE(a.actual_amount, 0) AS actual_amount,
  COALESCE(f.forecast_amount, 0) AS forecast_amount,
  COALESCE(a.actual_amount, 0) - b.budget_amount AS actual_vs_budget,
  COALESCE(f.forecast_amount, 0) - b.budget_amount AS forecast_vs_budget,
  CASE
    WHEN b.budget_amount = 0 THEN NULL
    ELSE ROUND(((COALESCE(a.actual_amount, 0) - b.budget_amount) / b.budget_amount) * 100, 2)
  END AS actual_variance_pct,
  CASE
    WHEN b.budget_amount = 0 THEN NULL
    ELSE ROUND(((COALESCE(f.forecast_amount, 0) - b.budget_amount) / b.budget_amount) * 100, 2)
  END AS forecast_variance_pct
FROM budget_agg b
LEFT JOIN actual_agg a
  ON  a.company_id   = b.company_id
  AND a.fiscal_year  = b.fiscal_year
  AND a.period_month = b.period_month
  AND a.account_id   = b.account_id
  AND (a.site_id     <=> b.site_id)
  AND (a.product_id  <=> b.product_id)
  AND (a.customer_id <=> b.customer_id)
LEFT JOIN forecast_agg f
  ON  f.company_id   = b.company_id
  AND f.fiscal_year  = b.fiscal_year
  AND f.period_month = b.period_month
  AND f.account_id   = b.account_id
  AND (f.site_id     <=> b.site_id)
  AND (f.product_id  <=> b.product_id)
  AND (f.customer_id <=> b.customer_id);

-- -------------------------------------------------------
-- vw_branch_profitability
-- ربحية الفروع بعد المصروفات.
-- -------------------------------------------------------
CREATE OR REPLACE VIEW vw_branch_profitability AS
SELECT
  al.site_id,
  s.name AS site_name,
  ai.company_id,
  YEAR(al.transaction_date) AS fiscal_year,
  MONTH(al.transaction_date) AS period_month,
  SUM(CASE WHEN a.type = 'revenue' THEN al.amount ELSE 0 END) AS revenue,
  SUM(CASE WHEN a.type = 'cogs' THEN al.amount ELSE 0 END) AS cogs,
  SUM(CASE WHEN a.type = 'expense' THEN al.amount ELSE 0 END) AS expenses,
  SUM(CASE WHEN a.type = 'revenue' THEN al.amount ELSE 0 END)
    - SUM(CASE WHEN a.type = 'cogs' THEN al.amount ELSE 0 END) AS gross_profit,
  SUM(CASE WHEN a.type = 'revenue' THEN al.amount ELSE 0 END)
    - SUM(CASE WHEN a.type = 'cogs' THEN al.amount ELSE 0 END)
    - SUM(CASE WHEN a.type = 'expense' THEN al.amount ELSE 0 END) AS net_profit
FROM actual_lines al
JOIN actual_imports ai ON ai.id = al.actual_import_id
JOIN accounts a ON a.id = al.account_id
JOIN sites s ON s.id = al.site_id
GROUP BY
  al.site_id, s.name, ai.company_id,
  YEAR(al.transaction_date), MONTH(al.transaction_date);

-- -------------------------------------------------------
-- vw_customer_profitability
-- ربحية العملاء، لأن الـ PDF ذكر تحليل الربحية حسب العميل.
-- -------------------------------------------------------
CREATE OR REPLACE VIEW vw_customer_profitability AS
SELECT
  al.customer_id,
  c.name AS customer_name,
  c.region,
  ai.company_id,
  YEAR(al.transaction_date) AS fiscal_year,
  MONTH(al.transaction_date) AS period_month,
  SUM(CASE WHEN a.type = 'revenue' THEN al.amount ELSE 0 END) AS revenue,
  SUM(CASE WHEN a.type = 'cogs' THEN al.amount ELSE 0 END) AS cogs,
  SUM(CASE WHEN a.type = 'expense' THEN al.amount ELSE 0 END) AS expenses,
  SUM(CASE WHEN a.type = 'revenue' THEN al.amount ELSE 0 END)
    - SUM(CASE WHEN a.type = 'cogs' THEN al.amount ELSE 0 END) AS gross_profit,
  SUM(CASE WHEN a.type = 'revenue' THEN al.amount ELSE 0 END)
    - SUM(CASE WHEN a.type = 'cogs' THEN al.amount ELSE 0 END)
    - SUM(CASE WHEN a.type = 'expense' THEN al.amount ELSE 0 END) AS net_profit
FROM actual_lines al
JOIN actual_imports ai ON ai.id = al.actual_import_id
JOIN accounts a ON a.id = al.account_id
JOIN customers c ON c.id = al.customer_id
GROUP BY
  al.customer_id, c.name, c.region, ai.company_id,
  YEAR(al.transaction_date), MONTH(al.transaction_date);



-- -------------------------------------------------------
-- vw_product_profitability
-- ربحية المنتجات: Sales / COGS / Gross Margin.
-- -------------------------------------------------------
CREATE OR REPLACE VIEW vw_product_profitability AS
SELECT
  al.product_id,
  p.sku AS product_sku,
  p.name AS product_name,
  ai.company_id,
  YEAR(al.transaction_date) AS fiscal_year,
  MONTH(al.transaction_date) AS period_month,
  SUM(CASE WHEN a.type = 'revenue' THEN al.amount ELSE 0 END) AS sales,
  SUM(CASE WHEN a.type = 'cogs' THEN al.amount ELSE 0 END) AS cogs,
  SUM(CASE WHEN a.type = 'revenue' THEN al.amount ELSE 0 END)
    - SUM(CASE WHEN a.type = 'cogs' THEN al.amount ELSE 0 END) AS gross_margin,
  CASE
    WHEN SUM(CASE WHEN a.type = 'revenue' THEN al.amount ELSE 0 END) = 0 THEN NULL
    ELSE ROUND((
      (SUM(CASE WHEN a.type = 'revenue' THEN al.amount ELSE 0 END)
       - SUM(CASE WHEN a.type = 'cogs' THEN al.amount ELSE 0 END))
      / SUM(CASE WHEN a.type = 'revenue' THEN al.amount ELSE 0 END)
    ) * 100, 2)
  END AS gross_margin_pct
FROM actual_lines al
JOIN actual_imports ai ON ai.id = al.actual_import_id
JOIN accounts a ON a.id = al.account_id
JOIN products p ON p.id = al.product_id
GROUP BY
  al.product_id, p.sku, p.name, ai.company_id,
  YEAR(al.transaction_date), MONTH(al.transaction_date);

-- -------------------------------------------------------
-- vw_inventory_coverage
-- تغطية المخزون بالأيام بناءً على متوسط استهلاك/مبيعات آخر 30 يوم.
-- -------------------------------------------------------
CREATE OR REPLACE VIEW vw_inventory_coverage AS
WITH usage_30 AS (
  SELECT
    ai.company_id,
    al.site_id,
    al.product_id,
    SUM(ABS(al.quantity)) / 30 AS avg_daily_qty
  FROM actual_lines al
  JOIN actual_imports ai ON ai.id = al.actual_import_id
  JOIN accounts a ON a.id = al.account_id
  WHERE al.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    AND al.product_id IS NOT NULL
    AND a.type IN ('revenue','cogs')
  GROUP BY ai.company_id, al.site_id, al.product_id
), latest_snapshot AS (
  SELECT inv.*
  FROM inventory_snapshots inv
  JOIN (
    SELECT company_id, site_id, product_id, MAX(snapshot_date) AS max_snapshot_date
    FROM inventory_snapshots
    WHERE product_id IS NOT NULL
    GROUP BY company_id, site_id, product_id
  ) x ON x.company_id = inv.company_id
     AND x.site_id = inv.site_id
     AND x.product_id = inv.product_id
     AND x.max_snapshot_date = inv.snapshot_date
)
SELECT
  ls.company_id,
  ls.site_id,
  s.name AS site_name,
  ls.product_id,
  p.sku AS product_sku,
  p.name AS product_name,
  ls.snapshot_date,
  ls.qty_on_hand,
  COALESCE(u.avg_daily_qty, 0) AS avg_daily_qty,
  CASE
    WHEN COALESCE(u.avg_daily_qty, 0) = 0 THEN NULL
    ELSE ROUND(ls.qty_on_hand / u.avg_daily_qty, 2)
  END AS coverage_days,
  ls.inventory_value
FROM latest_snapshot ls
JOIN sites s ON s.id = ls.site_id
JOIN products p ON p.id = ls.product_id
LEFT JOIN usage_30 u
  ON u.company_id = ls.company_id
 AND u.site_id = ls.site_id
 AND u.product_id = ls.product_id;

-- -------------------------------------------------------
-- vw_slow_moving_items
-- المنتجات الراكدة: مخزون موجود بدون حركة مبيعات/استهلاك خلال 90 يوم.
-- -------------------------------------------------------
CREATE OR REPLACE VIEW vw_slow_moving_items AS
WITH movement_90 AS (
  SELECT
    ai.company_id,
    al.site_id,
    al.product_id,
    SUM(ABS(al.quantity)) AS moved_qty_90,
    MAX(al.transaction_date) AS last_movement_date
  FROM actual_lines al
  JOIN actual_imports ai ON ai.id = al.actual_import_id
  JOIN accounts a ON a.id = al.account_id
  WHERE al.product_id IS NOT NULL
    AND al.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
    AND a.type IN ('revenue','cogs')
  GROUP BY ai.company_id, al.site_id, al.product_id
), latest_snapshot AS (
  SELECT inv.*
  FROM inventory_snapshots inv
  JOIN (
    SELECT company_id, site_id, product_id, MAX(snapshot_date) AS max_snapshot_date
    FROM inventory_snapshots
    WHERE product_id IS NOT NULL
    GROUP BY company_id, site_id, product_id
  ) x ON x.company_id = inv.company_id
     AND x.site_id = inv.site_id
     AND x.product_id = inv.product_id
     AND x.max_snapshot_date = inv.snapshot_date
)
SELECT
  ls.company_id,
  ls.site_id,
  s.name AS site_name,
  ls.product_id,
  p.sku AS product_sku,
  p.name AS product_name,
  ls.snapshot_date,
  ls.qty_on_hand,
  ls.inventory_value,
  COALESCE(m.moved_qty_90, 0) AS moved_qty_90,
  m.last_movement_date,
  CASE
    WHEN COALESCE(m.moved_qty_90, 0) = 0 AND ls.qty_on_hand > 0 THEN 1
    ELSE 0
  END AS is_slow_moving
FROM latest_snapshot ls
JOIN sites s ON s.id = ls.site_id
JOIN products p ON p.id = ls.product_id
LEFT JOIN movement_90 m
  ON m.company_id = ls.company_id
 AND m.site_id = ls.site_id
 AND m.product_id = ls.product_id;

-- ============================================================
-- END OF SCHEMA v4 FINAL
-- ============================================================

