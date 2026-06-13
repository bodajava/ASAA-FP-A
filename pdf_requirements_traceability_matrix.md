# Requirements Traceability Matrix (RTM)
**Project Name**: idiibi FP&A Suite SaaS Platform  
**Target Organization**: iDiibi Manufacturing Co.  
**Source Document**: [idiibi_fpa_budget_forecast.html](file:///Users/abdelrhmannounir/Desktop/ASAA-FB&A/READ/idiibi_fpa_budget_forecast.html) (PDF Requirement Source)

---

## 1. Document Purpose
This Requirements Traceability Matrix (RTM) maps the commercial and operational requirements detailed in the idiibi PDF specifications to the functional components implemented in the software application and the specific test cases designed to verify them.

---

## 2. Requirements Traceability Table

| Req ID | PDF Section | Requirement Description | App Screen / API Route | Test Case ID | Status |
|--------|-------------|-------------------------|------------------------|--------------|--------|
| **REQ-01** | Section 1 & 2 | FP&A role support: Track revenue, costs, profit, liquidity and evaluate deviations. | `/dashboard` <br> `/reports` | TC-DASH-01, TC-REP-01 | Implemented & Verified |
| **REQ-02** | Section 3 | Distinguish between Budget (pre-planned annual target) and Forecast (monthly rolling projection). | `/budgets` <br> `/forecasts` | TC-BUD-01, TC-FOR-01 | Implemented & Verified |
| **REQ-03** | Section 4 & 5 | Multi-Tenant SaaS platform focused on food factories, retail, and branches. | `/login` <br> `/companies` | TC-AUTH-01, TC-AUTH-02 | Implemented & Verified |
| **REQ-04** | Section 6 | Module coverage: Setup, Budget, Forecast, Actuals, Variance, Scenarios, and Reports. | Sidebar Navigation | TC-NAV-01 | Implemented & Verified |
| **REQ-05** | Section 7 | **Food Factory Costing**: final/semi products, materials, units, recipes (BOM), normal wastage, unit pricing. | `/products` <br> `/materials` <br> `/bom-recipes` | TC-MD-01, TC-MD-02, TC-BOM-01 | Implemented & Verified |
| **REQ-06** | Section 7 | **Factory planning**: sales plan linked to production plan, capacity utilization, material requirement forecasting. | `/reports?type=factory-costing` <br> `/reports?type=inventory-coverage` | TC-BOM-02, TC-REP-02 | Implemented & Verified |
| **REQ-07** | Section 8 | **Food Retail planning**: sales analysis by branch/product, branch net profit margins, inventory coverage, wastage rates. | `/reports?type=branch-profitability` <br> `/reports?type=wastage-analysis` | TC-REP-03, TC-REP-04 | Implemented & Verified |
| **REQ-08** | Section 9 | Essential screen workflows (Dashboard, Setup, Master Data, Budgets, Forecasts, Reports, Integration). | Frontend Layout Routes | TC-NAV-01 | Implemented & Verified |
| **REQ-09** | Section 10 | **Financial Reports**: P&L, Cash Flow, Gross Margin, Net Profit, Budget vs Actual, Forecast Accuracy. | `/reports` <br> `/variance` | TC-VAR-01, TC-REP-01 | Implemented & Verified |
| **REQ-10** | Section 10 | **Operational Reports**: Product/Branch Profitability, Factory Costing, Inventory Coverage, Slow Items, Wastage. | `/reports` | TC-REP-02, TC-REP-03, TC-REP-04 | Implemented & Verified |
| **REQ-11** | Section 11 | **User Roles & Workflow Approvals**: Super Admin, CFO, FP&A Manager, Analyst. Approve/Reject cycles. | `/budgets` (Status transition) <br> `/forecasts` (Status transition) | TC-AUTH-02, TC-BUD-02, TC-FOR-02 | Implemented & Verified |
| **REQ-12** | Section 12 | **External Integrations**: import CSV/Excel data, POS sales data, ERP ledger transactions, connection test, manual sync. | `/integrations` <br> `/actuals` | TC-INT-01, TC-ACT-01, TC-ACT-02 | Implemented & Verified |
| **REQ-13** | Section 13 | **System Cycle Workflows**: setup -> inputs -> budget creation -> actuals import -> rolling forecast -> variance. | End-to-end user loop | TC-FLOW-01 | Implemented & Verified |
| **REQ-14** | Section 15 | **Subscription Tiers**: Starter, Business, and Enterprise configurations (represented by system database structures). | Tenant plan verification | TC-AUTH-02 | Implemented & Verified |

---

## 3. Database Entity Traceability

To ensure database schema consistency, the following table maps SQL tables from [idiibi_fpa_schema_v4_final.sql](file:///Users/abdelrhmannounir/Desktop/ASAA-FB&A/READ/idiibi_fpa_schema_v4_final.sql) to application requirements:

| Database Table | Logical Component | PDF Section | Verification Test Case |
|----------------|-------------------|-------------|------------------------|
| `tenants`, `subscriptions`, `companies` | Multi-Tenant setup & licensing | Section 4, 15 | TC-AUTH-01, TC-AUTH-02 |
| `users`, `roles`, `approvals` | Governance & Role permissions | Section 11 | TC-BUD-02, TC-FOR-02 |
| `sites`, `units`, `accounts`, `cost_centers` | Organization structure & Ledger definition | Section 6, 9 | TC-MD-01 |
| `products`, `materials`, `bom_recipes`, `bom_lines` | Factory inputs & Recipe costing | Section 7 | TC-MD-02, TC-BOM-01 |
| `budget_cycles`, `budget_lines` | Budget cycle management | Section 6, 9 | TC-BUD-01, TC-BUD-02 |
| `forecast_cycles`, `forecast_lines` | Rolling forecasting | Section 6, 9 | TC-FOR-01, TC-FOR-02 |
| `actual_imports`, `actual_lines` | ERP, POS, and Oracle spreadsheet uploads | Section 12 | TC-ACT-01, TC-ACT-02 |
| `scenarios` | Planning variations (Spikes/Drops) | Section 6 | TC-SCEN-01 |
| `integration_connections`, `import_mappings` | Third-party systems connectors | Section 12 | TC-INT-01 |
| `notifications`, `audit_logs` | Platform audit trails & threshold alerts | Section 9 | TC-NOT-01, TC-AUD-01 |
