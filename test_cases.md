# Functional & UAT Test Cases
**Project Name**: idiibi FP&A Suite SaaS Platform  
**Target Organization**: iDiibi Manufacturing Co.  
**Version**: 1.0  
**Date**: June 11, 2026  

---

## 1. Authentication & Multi-Tenancy

### TC-AUTH-01: User Login
* **Requirement Reference**: REQ-03 (Section 4 & 5 - Multi-tenant login credentials)
* **Page / API to Test**: `/login` (Frontend) | `POST /api/auth/login` (Backend)
* **Test Steps**:
  1. Navigate to `http://localhost:3000/login`
  2. Input Tenant ID: `2` (or slug `idiibi-demo`)
  3. Input Email: `admin@idiibi.com`
  4. Input Password: `Admin@123456`
  5. Click on the "Login" button.
* **Expected Result**: 
  - Login request succeeds with status `201 Created`.
  - JWT token and activeCompanyId are saved to local storage.
  - Browser automatically redirects to the dashboard page (`http://localhost:3000/dashboard`).
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Verify that the login API payload only sends `x-tenant-id` and does *not* send `x-company-id` header during authorization.

### TC-AUTH-02: Tenant Isolation Check
* **Requirement Reference**: REQ-03 (Section 4 & 5 - Multi-tenant SaaS boundary protection)
* **Page / API to Test**: `/companies` (Frontend) | `GET /api/companies` (Backend)
* **Test Steps**:
  1. Log in with the credentials of Tenant 2.
  2. Click the "Settings" page or active company profile.
  3. Observe list of companies and records shown.
* **Expected Result**: 
  - Only companies, products, sites, and actuals belonging to Tenant 2 are visible.
  - Accessing a company ID belonging to another tenant via API returns a `404 Not Found` or `403 Forbidden` response.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Data isolation is enforced at the database layer using `tenant_id` constraints on core models.

---

## 2. Navigation & Layout

### TC-NAV-01: Sidebar Navigation and Route Access
* **Requirement Reference**: REQ-04 (Section 6 - Main Modules) & REQ-08 (Section 9 - Main Screens)
* **Page / API to Test**: Navigation Sidebar
* **Test Steps**:
  1. Log in and access the sidebar navigation panel.
  2. Click sequentially through the following modules:
     - Dashboard (`/dashboard`)
     - Master Data Submenus (Accounts, Sites, Products, Materials, Customers, Suppliers)
     - Budgets (`/budgets`)
     - Forecasts (`/forecasts`)
     - Actuals (`/actuals`)
     - Variance Analysis (`/variance`)
     - Scenario Planning (`/scenarios`)
     - Reports (`/reports`)
     - Integrations (`/integrations`)
     - Notifications (`/notifications`)
     - Audit Logs (`/audit-logs`)
* **Expected Result**: 
  - All sidebar links render matching icons and labels.
  - Click actions load corresponding routes successfully without hydration mismatches or crash loops.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Verify that clicking a new route correctly preserves active company context.

---

## 3. Master Data & BOM

### TC-MD-01: GL Account & Cost Center Definition
* **Requirement Reference**: REQ-08 (Section 9 - Chart of Accounts & Cost Centers Setup)
* **Page / API to Test**: `/accounts` (Frontend) | `GET /api/accounts` (Backend)
* **Test Steps**:
  1. Navigate to `/accounts` page.
  2. Confirm presence of pre-loaded codes: `4000` (Sales Revenue), `5000` (COGS), `6000` (Rent), and `6100` (Salaries).
  3. Click "Add Account", enter code `7000`, name `Marketing Expense`, select type `expense`, and save.
* **Expected Result**: 
  - New account is created successfully and renders in the table.
  - Cost Centers page (`/cost-centers`) displays `CC_PROD`, `CC_SALES`, and `CC_ADMIN`.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Confirm accounts cannot have duplicate codes under the same company.

### TC-MD-02: Products & Materials Management
* **Requirement Reference**: REQ-05 (Section 7 - Products & Raw Materials Setup)
* **Page / API to Test**: `/products` & `/materials`
* **Test Steps**:
  1. Navigate to `/products`. Verify `PROD-JUICE` (Sale price: 15.00 EGP) and `PROD-MILK` (Sale price: 35.00 EGP) appear.
  2. Navigate to `/materials`. Verify raw materials `MAT-SUGAR`, `MAT-CONCENTRATE`, and `MAT-CARTON` are active.
  3. Edit standard purchase price for `MAT-SUGAR` from `30.00` to `32.00` and save.
* **Expected Result**: 
  - Prices update dynamically. 
  - Database stores updated prices and logs an audit record.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Checked standard cost fields for margin calculations.

### TC-BOM-01: Bill of Materials (BOM) Recipe Costing
* **Requirement Reference**: REQ-05 (Section 7 - Food factory BOM & standard recipe costings)
* **Page / API to Test**: `/bom-recipes` (Frontend) | `GET /api/bom-recipes` (Backend)
* **Test Steps**:
  1. Navigate to the `/bom-recipes` configuration page.
  2. Inspect the recipe for `Apple Juice 250ml (v1)`.
  3. Observe direct inputs:
     - Output Qty: `1`
     - Wastage: `2%`
     - Ingredients: Sugar (`0.02 kg`), Concentrate (`0.05 L`), Carton (`1.00 pcs`).
* **Expected Result**: 
  - System correctly sums up material unit costs to calculate the standard recipe cost (8.00 EGP).
  - Formulas automatically account for normal wastage rate (2% loss factor).
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Formula matches: `Material Cost = Qty * Price * (1 + Wastage%)`.

### TC-BOM-02: Sales Plan link to Production Capacity
* **Requirement Reference**: REQ-06 (Section 7 - Sales plan linking to production plan)
* **Page / API to Test**: `/reports?type=factory-costing`
* **Test Steps**:
  1. Retrieve production plan projections.
  2. Review the raw material requirement reports generated for `FY2025 Annual Budget`.
* **Expected Result**: 
  - Sales volume targets (e.g. 10,000 units of juice) translate to raw ingredient requirements: `200 kg Sugar`, `500 L Concentrate`, and `10,000 Cartons` plus normal wastage allowances.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Verifies operational supply chain alignment.

---

## 4. Planning & Budgets

### TC-BUD-01: Annual Budget Cycle Creation
* **Requirement Reference**: REQ-02 (Section 3 - Budget Definitions)
* **Page / API to Test**: `/budgets` (Frontend) | `POST /api/budgets` (Backend)
* **Test Steps**:
  1. Navigate to `/budgets`.
  2. Click "Add Budget Cycle".
  3. Enter Name: `FY2026 Budget`, Year: `2026`, Period: `Annual`.
  4. Build a line entry: Account: `4000` (Sales Revenue), Site: `Main Factory`, Month: `1`, Amount: `150000.00`.
  5. Click Save.
* **Expected Result**: 
  - Budget cycle created in `draft` status.
  - Budget line item successfully recorded and totals updated in the cycle list view.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Draft budgets can be edited or deleted by the FP&A Manager.

### TC-BUD-02: Budget Approval Workflow
* **Requirement Reference**: REQ-11 (Section 11 - Workflow approvals)
* **Page / API to Test**: `/budgets` Page Status Transitions
* **Test Steps**:
  1. Select the draft `FY2026 Budget`.
  2. Click "Submit for Review".
  3. Log in as CFO (or use admin role).
  4. Click "Approve Budget".
* **Expected Result**: 
  - Status updates: `draft` -> `review` -> `approved`.
  - Once status is `approved`, all inputs are locked. Clicking "Save" or "Delete" throws a validation error (400 Bad Request: "Cannot edit approved budget").
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Locks budget records to prevent historical modifications.

---

## 5. Actual Data Imports

### TC-ACT-01: CSV Data Paste & Preview Validation
* **Requirement Reference**: REQ-12 (Section 12 - Integration CSV pasting)
* **Page / API to Test**: `/actuals` (Wizard) | `POST /api/actual-imports/preview`
* **Test Steps**:
  1. Navigate to `/actuals` page, click "New Import Wizard".
  2. Select Source System: `oracle`, Import Type: `gl`.
  3. Choose Mapping Template: (Standard mapping configured for GL Account, Amount, Date, Reference).
  4. Copy contents of `oracle_actuals_sample.csv` and paste into the raw spreadsheet data textarea.
  5. Click "Validate / Preview".
* **Expected Result**: 
  - System parses comma-separated lines.
  - Rows are parsed and mapped columns are displayed in a clean preview table.
  - Diagnostic passes with no error indicators.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Verification covers splitting on newline and comma/tab delimiter detection.

### TC-ACT-02: Actuals Error Logging & Validation Failure
* **Requirement Reference**: REQ-12 (Section 12 - Import validation & logs)
* **Page / API to Test**: `/actuals` (Wizard Validation Failures)
* **Test Steps**:
  1. Follow steps of TC-ACT-01, but paste data containing an invalid account code (e.g. `9999` which doesn't exist).
  2. Click "Validate / Preview".
* **Expected Result**: 
  - System highlights the invalid row in Red.
  - Renders validation message: `Account code "9999" not found under this company`.
  - The "Post Actuals" button remains disabled.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Prevents corrupt or unlinked records from populating ledger actual tables.

---

## 6. Rolling Forecasts

### TC-FOR-01: Rolling Forecast Generation
* **Requirement Reference**: REQ-02 (Section 3 - Forecast definition)
* **Page / API to Test**: `/forecasts` (Frontend) | `POST /api/forecasts` (Backend)
* **Test Steps**:
  1. Navigate to `/forecasts`.
  2. Click "Add Forecast Cycle".
  3. Set Year: `2025`, Base Month: `1` (January), Scenario: `Base Scenario`, Method: `rolling`.
  4. Submit.
* **Expected Result**: 
  - Forecast cycle created.
  - Actual values from January 2025 are automatically copied into month 1.
  - Forecast lines for Feb-Dec are generated based on chosen driver algorithms.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: A rolling forecast blends actual results of past months with forecasted estimates for upcoming months.

### TC-FOR-02: Driver-Based Forecast Modifications
* **Requirement Reference**: REQ-02 (Section 3 - Forecast flexibility)
* **Page / API to Test**: `/forecasts` (Nested Detail View)
* **Test Steps**:
  1. Open the created rolling forecast.
  2. Locate month 2 lines.
  3. Edit line for sales account `4000`, set Driver: `sales_growth`, adjust percentage, and click save.
* **Expected Result**: 
  - Values recalculate dynamically based on driver inputs.
  - Calculations are verified against standard formula: `New Value = Previous Actual * (1 + Growth%)`.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Validates rolling forecast flexibility.

---

## 7. Scenario Planning & Variance Analysis

### TC-SCEN-01: Scenario Assumption simulation
* **Requirement Reference**: REQ-06 (Section 7 - Scenario analysis / cost spikes)
* **Page / API to Test**: `/scenarios` (Simulate Preview Tab)
* **Test Steps**:
  1. Navigate to `/scenarios`.
  2. Click "Add Scenario".
  3. Select Type: `increase_material_prices`, select Material: `MAT-SUGAR`, enter rate: `20%`. Save.
  4. Navigate to the "Simulation Preview" tab.
  5. Select base cycle: `FY2025 Annual Budget`, Select scenario: `High Inflation Scenario`. Click Run.
* **Expected Result**: 
  - System generates a comparison preview table.
  - Shows baseline amount vs. projected amounts.
  - Cost of Goods Sold (Account `5000`) for beverage products using sugar rises by 20% of standard sugar recipe cost, indicating projected profit reduction.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Does not alter actual database budget files; operates strictly as a virtual sandbox.

### TC-VAR-01: Variance Analysis Table
* **Requirement Reference**: REQ-09 (Section 10 - Budget vs Actual vs Forecast comparison)
* **Page / API to Test**: `/variance`
* **Test Steps**:
  1. Navigate to `/variance`.
  2. Set filters: Comparison: `Budget vs Actual`, Fiscal Year: `2025`, Period: `Month 1`.
  3. Review columns: Account, Budget, Actual, Variance Amount, Variance %.
* **Expected Result**: 
  - Sales Revenue (4000): Budget = 100k, Actual = 120k, Var Amount = +20k, Var % = +20% (Favorable - Green).
  - COGS (5000): Budget = 55k, Actual = 70k, Var Amount = +15k, Var % = +27.3% (Unfavorable - Red).
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Variance formatting must be context-aware: expense increase is unfavorable (red), revenue increase is favorable (green).

---

## 8. Reports & Dashboards

### TC-REP-01: Profit and Loss (P&L) Statement
* **Requirement Reference**: REQ-09 (Section 10 - Required P&L reports)
* **Page / API to Test**: `/reports` -> P&L Statement
* **Test Steps**:
  1. Select Report Type: `P&L Statement`.
  2. Set Fiscal Year: `2025`.
* **Expected Result**: 
  - Renders rows for Revenue, Gross Profit, Operating Expenses, and Net Profit.
  - Monthly values match posted actuals and rolling forecasts.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Formula validated: `Gross Profit = Revenue - COGS`. `Net Profit = Gross Profit - Opex`.

### TC-REP-02: Factory Costing & Wastage report
* **Requirement Reference**: REQ-10 (Section 10 - Factory Costing & Wastage reports)
* **Page / API to Test**: `/reports` -> Factory Costing / Wastage Analysis
* **Test Steps**:
  1. Select Report Type: `Factory Costing`.
  2. Observe standard versus actual material consumption details and waste factors.
* **Expected Result**: 
  - Wastage rates are parsed and compared to recipe standard percentages.
  - Excess wastage is highlighted as a manufacturing inefficiency.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Critical operational review for food factories.

### TC-REP-03: Branch Profitability report
* **Requirement Reference**: REQ-10 (Section 10 - Branch net profitability)
* **Page / API to Test**: `/reports` -> Branch Profitability
* **Test Steps**:
  1. Select Report Type: `Branch Profitability`.
  2. Filter by Site Type: `Factory` or `Warehouse`.
* **Expected Result**: 
  - Allocates revenue, salaries, and rent per site ID.
  - Net Profit margin is calculated correctly per site.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Confirms branch network operational viability.

### TC-DASH-01: Dashboard KPI cards & charts
* **Requirement Reference**: REQ-08 (Section 9 - Main Dashboard)
* **Page / API to Test**: `/dashboard`
* **Test Steps**:
  1. Click "Dashboard" in sidebar.
  2. Observe KPI cards: Revenue, Gross Profit %, Net Profit, Cash Balance.
  3. Verify chart components load.
* **Expected Result**: 
  - Values match summary indicators from database.
  - Charts (Revenue trend, expenses trend) render accurately based on selected company ID.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Interactive dashboard serves as the administrative entry point.

---

## 9. Platform Integrations & System Logs

### TC-INT-01: Connection setup and Sync execution
* **Requirement Reference**: REQ-12 (Section 12 - External connectors & scheduling)
* **Page / API to Test**: `/integrations` -> Connections tab
* **Test Steps**:
  1. Select "Connections" tab, click "Add Connection".
  2. Enter Name: `Oracle Cloud Connector`, Connection Type: `Oracle ERP`, Host: `oracle.idiibi.local`. Save.
  3. Click "Test Connection".
  4. Navigate to "Import Mappings", confirm default templates load.
  5. Click "Manual Sync".
* **Expected Result**: 
  - Connection test returns `Success` banner.
  - Manual sync initiates a background execution job and logs `Posted` status upon completion.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Integrates with legacy enterprise databases.

### TC-NOT-01: Alerts & Notifications Threshold
* **Requirement Reference**: REQ-08 (Section 9 - Alert Configurations & Notifications)
* **Page / API to Test**: `/notifications` | `GET /api/notifications`
* **Test Steps**:
  1. Navigate to `/notifications` page.
  2. Select "Alert Rules Configuration" tab.
  3. Verify alert rule triggers: `variance_pct` exceeds `10%`.
  4. Switch to "Notifications Inbox" and select the "Unread" tab.
  5. Review listed alerts.
* **Expected Result**: 
  - Notifications list loads without any `400 Bad Request` errors.
  - Unread notifications filter correctly.
  - Mark as read button clears unread status.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Client-side filtering verified to work around NestJS global query constraints.

### TC-AUD-01: Audit Log Viewer
* **Requirement Reference**: REQ-08 (Section 9 - Audit Trails)
* **Page / API to Test**: `/audit-logs`
* **Test Steps**:
  1. Navigate to `/audit-logs`.
  2. Locate an audit action (e.g. `update` on `NotificationRule` or `post` on `ActualImport`).
  3. Click the "View Details" icon.
* **Expected Result**: 
  - Shows action metadata (User, date, IP address, entity type).
  - Renders a clean side-by-side JSON diff highlighting differences between old values and new values.
* **Test Status**: `[ ] Pass  [ ] Fail`
* **Notes**: Critical compliance requirement.
