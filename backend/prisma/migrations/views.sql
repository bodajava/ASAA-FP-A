-- ============================================================
-- idiibi FP&A Suite - Database Views Deployment Script
-- يجب تشغيل هذا الملف مرة واحدة على قاعدة البيانات
-- ============================================================

-- -------------------------------------------------------
-- vw_budget_vs_actual
-- مقارنة الموازنة بالفعلي لكل حساب/شهر/موقع/منتج/عميل
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
-- مقارنة ثلاثية: Budget / Actual / Forecast
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
-- ربحية الفروع بعد المصروفات
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
-- ربحية العملاء
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
-- ربحية المنتجات
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
    - SUM(CASE WHEN a.type = 'cogs' THEN al.amount ELSE 0 END) AS gross_margin
FROM actual_lines al
JOIN actual_imports ai ON ai.id = al.actual_import_id
JOIN accounts a ON a.id = al.account_id
JOIN products p ON p.id = al.product_id
GROUP BY
  al.product_id, p.sku, p.name, ai.company_id,
  YEAR(al.transaction_date), MONTH(al.transaction_date);

-- -------------------------------------------------------
-- vw_inventory_coverage
-- تغطية المخزون بالأيام
-- -------------------------------------------------------
CREATE OR REPLACE VIEW vw_inventory_coverage AS
WITH usage_30 AS (
  SELECT
    ai.company_id,
    al.site_id,
    COALESCE(al.product_id, al.material_id) AS item_id,
    SUM(ABS(al.quantity)) / 30 AS avg_daily_qty
  FROM actual_lines al
  JOIN actual_imports ai ON ai.id = al.actual_import_id
  JOIN accounts a ON a.id = al.account_id
  WHERE al.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    AND (al.product_id IS NOT NULL OR al.material_id IS NOT NULL)
    AND a.type IN ('revenue','cogs')
  GROUP BY ai.company_id, al.site_id, COALESCE(al.product_id, al.material_id)
),
latest_snapshot AS (
  SELECT inv.*
  FROM inventory_snapshots inv
  JOIN (
    SELECT company_id, site_id, COALESCE(product_id, material_id) AS item_id,
           MAX(snapshot_date) AS max_snapshot_date
    FROM inventory_snapshots
    WHERE product_id IS NOT NULL OR material_id IS NOT NULL
    GROUP BY company_id, site_id, COALESCE(product_id, material_id)
  ) x ON x.company_id = inv.company_id
     AND x.site_id = inv.site_id
     AND x.max_snapshot_date = inv.snapshot_date
     AND COALESCE(inv.product_id, inv.material_id) = x.item_id
)
SELECT
  ls.company_id,
  ls.site_id,
  s.name AS site_name,
  ls.product_id,
  ls.material_id,
  COALESCE(p.name, m.name) AS item_name,
  COALESCE(p.sku, m.code) AS item_code,
  ls.snapshot_date,
  ls.qty_on_hand,
  COALESCE(u.avg_daily_qty, 0) AS avg_daily_qty,
  CASE
    WHEN COALESCE(u.avg_daily_qty, 0) = 0 THEN NULL
    ELSE ROUND(ls.qty_on_hand / u.avg_daily_qty, 2)
  END AS coverage_days,
  ls.inventory_value,
  CASE WHEN ls.product_id IS NOT NULL THEN 'product' ELSE 'material' END AS item_type
FROM latest_snapshot ls
JOIN sites s ON s.id = ls.site_id
LEFT JOIN products p ON p.id = ls.product_id
LEFT JOIN materials m ON m.id = ls.material_id
LEFT JOIN usage_30 u
  ON u.company_id = ls.company_id
 AND u.site_id = ls.site_id
 AND u.item_id = COALESCE(ls.product_id, ls.material_id);

-- -------------------------------------------------------
-- vw_slow_moving_items
-- المنتجات الراكدة
-- -------------------------------------------------------
CREATE OR REPLACE VIEW vw_slow_moving_items AS
WITH movement_90 AS (
  SELECT
    ai.company_id,
    al.site_id,
    COALESCE(al.product_id, al.material_id) AS item_id,
    SUM(ABS(al.quantity)) AS moved_qty_90,
    MAX(al.transaction_date) AS last_movement_date
  FROM actual_lines al
  JOIN actual_imports ai ON ai.id = al.actual_import_id
  JOIN accounts a ON a.id = al.account_id
  WHERE (al.product_id IS NOT NULL OR al.material_id IS NOT NULL)
    AND al.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
    AND a.type IN ('revenue','cogs')
  GROUP BY ai.company_id, al.site_id, COALESCE(al.product_id, al.material_id)
),
latest_snapshot AS (
  SELECT inv.*
  FROM inventory_snapshots inv
  JOIN (
    SELECT company_id, site_id, COALESCE(product_id, material_id) AS item_id,
           MAX(snapshot_date) AS max_snapshot_date
    FROM inventory_snapshots
    WHERE product_id IS NOT NULL OR material_id IS NOT NULL
    GROUP BY company_id, site_id, COALESCE(product_id, material_id)
  ) x ON x.company_id = inv.company_id
     AND x.site_id = inv.site_id
     AND x.max_snapshot_date = inv.snapshot_date
     AND COALESCE(inv.product_id, inv.material_id) = x.item_id
)
SELECT
  ls.company_id,
  ls.site_id,
  s.name AS site_name,
  ls.product_id,
  ls.material_id,
  COALESCE(p.name, m.name) AS item_name,
  COALESCE(p.sku, m.code) AS item_code,
  ls.snapshot_date,
  ls.qty_on_hand,
  ls.inventory_value,
  COALESCE(mv.moved_qty_90, 0) AS moved_qty_90,
  mv.last_movement_date,
  CASE
    WHEN COALESCE(mv.moved_qty_90, 0) = 0 AND ls.qty_on_hand > 0 THEN 1
    ELSE 0
  END AS is_slow_moving,
  CASE WHEN ls.product_id IS NOT NULL THEN 'product' ELSE 'material' END AS item_type
FROM latest_snapshot ls
JOIN sites s ON s.id = ls.site_id
LEFT JOIN products p ON p.id = ls.product_id
LEFT JOIN materials m ON m.id = ls.material_id
LEFT JOIN movement_90 mv
  ON mv.company_id = ls.company_id
 AND mv.site_id = ls.site_id
 AND mv.item_id = COALESCE(ls.product_id, ls.material_id);

-- -------------------------------------------------------
-- vw_product_cost_variance
-- مقارنة تكلفة المنتج المخططة بالتكلفة الفعلية
-- -------------------------------------------------------
CREATE OR REPLACE VIEW vw_product_cost_variance AS
WITH latest_bom AS (
  SELECT br1.*
  FROM bom_recipes br1
  JOIN (
    SELECT product_id, company_id, MAX(version) AS max_version
    FROM bom_recipes
    WHERE is_active = 1
    GROUP BY product_id, company_id
  ) br2 ON br2.product_id = br1.product_id AND br2.company_id = br1.company_id AND br2.max_version = br1.version
),
product_cost_plan AS (
  SELECT
    pp.company_id,
    pp.product_id,
    pp.fiscal_year,
    pp.period_month,
    pp.planned_qty,
    pp.estimated_cost,
    pp.actual_qty,
    pp.actual_cost,
    br.wastage_pct AS planned_wastage_pct,
    br.labor_cost AS planned_labor_cost,
    br.overhead_cost AS planned_overhead_cost
  FROM production_plans pp
  LEFT JOIN latest_bom br ON br.product_id = pp.product_id AND br.company_id = pp.company_id
),
actual_material_cost AS (
  SELECT
    ai.company_id,
    al.product_id,
    YEAR(al.transaction_date) AS fiscal_year,
    MONTH(al.transaction_date) AS period_month,
    SUM(CASE WHEN a.type = 'cogs' THEN al.amount ELSE 0 END) AS actual_material_cost,
    SUM(CASE WHEN a.type = 'expense' AND (a.name LIKE '%labor%' OR a.name LIKE '%salary%' OR a.name LIKE '%payroll%') THEN al.amount ELSE 0 END) AS actual_labor_cost,
    SUM(CASE WHEN a.type = 'expense' AND a.name NOT LIKE '%labor%' AND a.name NOT LIKE '%salary%' AND a.name NOT LIKE '%payroll%' THEN al.amount ELSE 0 END) AS actual_oh_cost
  FROM actual_lines al
  JOIN actual_imports ai ON ai.id = al.actual_import_id
  JOIN accounts a ON a.id = al.account_id
  WHERE al.product_id IS NOT NULL
  GROUP BY ai.company_id, al.product_id, YEAR(al.transaction_date), MONTH(al.transaction_date)
)
SELECT
  pcp.company_id,
  pcp.product_id,
  pr.sku AS product_sku,
  pr.name AS product_name,
  pcp.fiscal_year,
  pcp.period_month,
  pcp.planned_qty,
  pcp.actual_qty,
  pcp.estimated_cost AS budget_cost_per_unit,
  pcp.planned_labor_cost AS budget_labor_per_unit,
  pcp.planned_overhead_cost AS budget_overhead_per_unit,
  ROUND(pcp.estimated_cost + pcp.planned_labor_cost + pcp.planned_overhead_cost, 2) AS budget_total_unit_cost,
  ROUND(pcp.estimated_cost * pcp.planned_qty, 2) AS budget_total_material,
  ROUND(pcp.planned_labor_cost * pcp.planned_qty, 2) AS budget_total_labor,
  ROUND(pcp.planned_overhead_cost * pcp.planned_qty, 2) AS budget_total_overhead,
  COALESCE(amc.actual_material_cost, 0) AS actual_total_material,
  COALESCE(amc.actual_labor_cost, 0) AS actual_total_labor,
  COALESCE(amc.actual_oh_cost, 0) AS actual_total_overhead,
  ROUND(COALESCE(amc.actual_material_cost, 0) + COALESCE(amc.actual_labor_cost, 0) + COALESCE(amc.actual_oh_cost, 0), 2) AS actual_total_cost,
  CASE WHEN pcp.actual_qty > 0
    THEN ROUND(COALESCE(amc.actual_material_cost, 0) / pcp.actual_qty, 2)
    ELSE 0
  END AS actual_cost_per_unit,
  ROUND(COALESCE(amc.actual_material_cost, 0) - (pcp.estimated_cost * pcp.planned_qty), 2) AS material_variance,
  ROUND(COALESCE(amc.actual_labor_cost, 0) - (pcp.planned_labor_cost * pcp.planned_qty), 2) AS labor_variance,
  ROUND(COALESCE(amc.actual_oh_cost, 0) - (pcp.planned_overhead_cost * pcp.planned_qty), 2) AS overhead_variance
FROM product_cost_plan pcp
JOIN products pr ON pr.id = pcp.product_id
LEFT JOIN actual_material_cost amc
  ON amc.company_id = pcp.company_id
 AND amc.product_id = pcp.product_id
 AND amc.fiscal_year = pcp.fiscal_year
 AND amc.period_month = pcp.period_month;

-- -------------------------------------------------------
-- vw_production_capacity
-- تحليل الطاقة الإنتاجية
-- -------------------------------------------------------
CREATE OR REPLACE VIEW vw_production_capacity AS
WITH site_capacity AS (
  SELECT
    id AS site_id,
    company_id,
    name AS site_name
  FROM sites
  WHERE type IN ('factory', 'distribution_center')
),
monthly_production AS (
  SELECT
    pp.company_id,
    pp.site_id,
    pp.product_id,
    pp.fiscal_year,
    pp.period_month,
    pp.planned_qty,
    pp.actual_qty,
    pp.estimated_cost,
    pp.actual_cost
  FROM production_plans pp
),
capacity_util AS (
  SELECT
    mp.company_id,
    mp.site_id,
    sc.site_name,
    mp.fiscal_year,
    mp.period_month,
    mp.product_id,
    p.name AS product_name,
    p.sku AS product_sku,
    mp.planned_qty,
    mp.actual_qty,
    CASE WHEN mp.planned_qty > 0
      THEN ROUND((COALESCE(mp.actual_qty, 0) / mp.planned_qty) * 100, 2)
      ELSE NULL
    END AS capacity_utilization_pct,
    mp.estimated_cost,
    mp.actual_cost,
    CASE WHEN mp.estimated_cost > 0
      THEN ROUND((COALESCE(mp.actual_cost, 0) / mp.estimated_cost) * 100, 2)
      ELSE NULL
    END AS cost_utilization_pct,
    COALESCE(mp.actual_qty, 0) - mp.planned_qty AS qty_variance
  FROM monthly_production mp
  JOIN site_capacity sc ON sc.site_id = mp.site_id AND sc.company_id = mp.company_id
  JOIN products p ON p.id = mp.product_id
)
SELECT * FROM capacity_util;

-- -------------------------------------------------------
-- vw_cash_flow_forecast
-- توقع التدفقات النقدية (AR / AP / Financing)
-- -------------------------------------------------------
CREATE OR REPLACE VIEW vw_cash_flow_forecast AS
WITH cash_actuals AS (
  SELECT
    ai.company_id,
    YEAR(al.transaction_date) AS fiscal_year,
    MONTH(al.transaction_date) AS period_month,
    SUM(CASE WHEN a.type IN ('revenue', 'cashflow') AND al.amount > 0 THEN al.amount ELSE 0 END) AS actual_inflow,
    SUM(CASE WHEN a.type IN ('expense', 'cogs', 'cashflow') AND al.amount < 0 THEN ABS(al.amount)
             WHEN a.type IN ('expense', 'cogs') THEN al.amount ELSE 0 END) AS actual_outflow,
    SUM(CASE WHEN al.customer_id IS NOT NULL AND a.type = 'revenue' THEN al.amount ELSE 0 END) AS ar_inflow,
    SUM(CASE WHEN a.type = 'expense' THEN al.amount ELSE 0 END) AS ap_outflow
  FROM actual_lines al
  JOIN actual_imports ai ON ai.id = al.actual_import_id
  JOIN accounts a ON a.id = al.account_id
  GROUP BY ai.company_id, YEAR(al.transaction_date), MONTH(al.transaction_date)
),
cash_budget AS (
  SELECT
    bc.company_id,
    bc.fiscal_year,
    bl.period_month,
    SUM(CASE WHEN a.type IN ('revenue', 'cashflow') AND bl.amount > 0 THEN bl.amount ELSE 0 END) AS budget_inflow,
    SUM(CASE WHEN a.type IN ('expense', 'cogs', 'cashflow') AND bl.amount < 0 THEN ABS(bl.amount)
             WHEN a.type IN ('expense', 'cogs') THEN bl.amount ELSE 0 END) AS budget_outflow
  FROM budget_cycles bc
  JOIN budget_lines bl ON bl.budget_cycle_id = bc.id
  JOIN accounts a ON a.id = bl.account_id
  GROUP BY bc.company_id, bc.fiscal_year, bl.period_month
)
SELECT
  ca.company_id,
  ca.fiscal_year,
  ca.period_month,
  ca.actual_inflow,
  ca.actual_outflow,
  ca.actual_inflow - ca.actual_outflow AS actual_net,
  COALESCE(cb.budget_inflow, 0) AS budget_inflow,
  COALESCE(cb.budget_outflow, 0) AS budget_outflow,
  COALESCE(cb.budget_inflow, 0) - COALESCE(cb.budget_outflow, 0) AS budget_net,
  ca.ar_inflow AS ar_collections,
  ca.ap_outflow AS ap_payments,
  ca.ar_inflow - ca.ap_outflow AS working_capital_net
FROM cash_actuals ca
LEFT JOIN cash_budget cb
  ON cb.company_id = ca.company_id
 AND cb.fiscal_year = ca.fiscal_year
 AND cb.period_month = ca.period_month
UNION ALL
SELECT
  cb.company_id,
  cb.fiscal_year,
  cb.period_month,
  0 AS actual_inflow,
  0 AS actual_outflow,
  0 AS actual_net,
  cb.budget_inflow,
  cb.budget_outflow,
  cb.budget_inflow - cb.budget_outflow AS budget_net,
  0 AS ar_collections,
  0 AS ap_payments,
  0 AS working_capital_net
FROM cash_budget cb
LEFT JOIN cash_actuals ca
  ON ca.company_id = cb.company_id
 AND ca.fiscal_year = cb.fiscal_year
 AND ca.period_month = cb.period_month
WHERE ca.company_id IS NULL;

-- -------------------------------------------------------
-- vw_wastage_analysis
-- تحليل الفاقد: مقارنة الفاقد المخطط مع الفعلي
-- -------------------------------------------------------
CREATE OR REPLACE VIEW vw_wastage_analysis AS
WITH planned_wastage AS (
  SELECT
    br.company_id,
    br.product_id,
    SUM(br.wastage_pct * br.output_qty / 100) AS planned_wastage_qty
  FROM bom_recipes br
  WHERE br.is_active = TRUE
  GROUP BY br.company_id, br.product_id
),
actual_production AS (
  SELECT
    pp.company_id,
    pp.product_id,
    pp.fiscal_year,
    pp.period_month,
    pp.planned_qty,
    pp.actual_qty,
    pp.actual_cost,
    pp.estimated_cost
  FROM production_plans pp
)
SELECT
  ap.company_id,
  ap.product_id,
  p.name AS product_name,
  ap.fiscal_year,
  ap.period_month,
  ap.planned_qty,
  ap.actual_qty,
  COALESCE(pw.planned_wastage_qty, 0) AS planned_wastage_pct,
  CASE WHEN ap.planned_qty > 0
    THEN (ap.planned_qty - ap.actual_qty) * 100.0 / ap.planned_qty
    ELSE 0
  END AS actual_wastage_pct,
  CASE WHEN ap.planned_qty > 0
    THEN (ap.planned_qty - ap.actual_qty) * (ap.estimated_cost / NULLIF(ap.planned_qty, 0))
    ELSE 0
  END AS wastage_cost
FROM actual_production ap
LEFT JOIN planned_wastage pw ON pw.company_id = ap.company_id AND pw.product_id = ap.product_id
LEFT JOIN products p ON p.id = ap.product_id;

-- -------------------------------------------------------
-- vw_forecast_accuracy
-- دقة التوقعات: مقارنة المتوقع بالفعلي
-- -------------------------------------------------------
CREATE OR REPLACE VIEW vw_forecast_accuracy AS
SELECT
  fa.company_id,
  fa.forecast_cycle_id,
  fa.account_id,
  a.name AS account_name,
  fa.fiscal_year,
  fa.period_month,
  fa.forecast_amount,
  fa.actual_amount,
  fa.variance_pct,
  fa.method_used,
  fa.confidence_score,
  CASE WHEN ABS(fa.variance_pct) <= 5 THEN 'high'
       WHEN ABS(fa.variance_pct) <= 15 THEN 'medium'
       ELSE 'low'
  END AS accuracy_tier,
  fa.created_at
FROM forecast_accuracy_logs fa
LEFT JOIN accounts a ON a.id = fa.account_id;

-- -------------------------------------------------------
-- vw_material_cost_impact
-- أثر تغير أسعار المواد الخام على التكلفة
-- -------------------------------------------------------
CREATE OR REPLACE VIEW vw_material_cost_impact AS
WITH latest_prices AS (
  SELECT
    rmp.company_id,
    rmp.material_id,
    rmp.price AS latest_price,
    rmp.price_date
  FROM raw_material_prices rmp
  INNER JOIN (
    SELECT company_id, material_id, MAX(price_date) AS max_date
    FROM raw_material_prices
    GROUP BY company_id, material_id
  ) lp ON lp.company_id = rmp.company_id AND lp.material_id = rmp.material_id AND lp.max_date = rmp.price_date
),
bom_material_usage AS (
  SELECT
    br.company_id,
    br.product_id,
    bl.material_id,
    bl.qty_per_output,
    bl.unit_cost,
    bl.wastage_pct
  FROM bom_recipes br
  JOIN bom_lines bl ON bl.bom_id = br.id
  WHERE br.is_active = TRUE
)
SELECT
  bmu.company_id,
  bmu.product_id,
  p.name AS product_name,
  bmu.material_id,
  m.name AS material_name,
  m.purchase_price AS current_purchase_price,
  COALESCE(lp.latest_price, m.purchase_price) AS latest_market_price,
  COALESCE(lp.latest_price, m.purchase_price) - m.purchase_price AS price_change,
  CASE WHEN m.purchase_price > 0
    THEN ((COALESCE(lp.latest_price, m.purchase_price) - m.purchase_price) / m.purchase_price) * 100
    ELSE 0
  END AS price_change_pct,
  bmu.qty_per_output,
  bmu.qty_per_output * (COALESCE(lp.latest_price, m.purchase_price) - m.purchase_price) AS cost_impact_per_unit
FROM bom_material_usage bmu
LEFT JOIN latest_prices lp ON lp.company_id = bmu.company_id AND lp.material_id = bmu.material_id
LEFT JOIN products p ON p.id = bmu.product_id
LEFT JOIN materials m ON m.id = bmu.material_id;
