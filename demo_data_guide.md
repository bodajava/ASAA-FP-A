# Demo Data & Integration Files Guide
**Project Name**: idiibi FP&A Suite SaaS Platform  
**Target Organization**: iDiibi Manufacturing Co.  
**Version**: 1.0  
**Date**: June 11, 2026  

---

## 1. Overview of Pre-loaded Demo Data

The database has been seeded with standard master data and planning records to simulate a real-world operational cycle of **iDiibi Manufacturing Co.**, a company specializing in food manufacturing (Beverages and Dairy).

### 1.1 Organizational Structure (Sites)
* **HQ Office** (Office - Cairo): Core administration, management, and corporate operations.
* **Main Factory** (Factory - Cairo): Location where Apple Juice and Full Cream Milk are processed and packed.
* **Main Warehouse** (Warehouse - Giza): Storage of finished goods and incoming raw materials.

### 1.2 General Ledger Chart of Accounts
* **`4000` (Sales Revenue)** - Revenue account tracking beverage and dairy sales.
* **`5000` (Cost of Goods Sold)** - Expenses directly associated with manufacturing products.
* **`6000` (Rent Expense)** - Monthly rental cost of offices, factories, and warehouses.
* **`6100` (Salaries Expense)** - Salaries paid to factory workers, sales reps, and admins.
* **`1000` (Inventory Asset)** - Balance sheet account for raw materials and finished goods.
* **`2000` (Accounts Payable)** - Liabilities due to raw material and packaging suppliers.

### 1.3 Cost Centers
* **`CC_ADMIN` (Administration)** - General overhead.
* **`CC_PROD` (Production Dept)** - Cost center mapping direct manufacturing labor/machinery.
* **`CC_SALES` (Sales & Marketing)** - Mapped to client acquisition and distribution expenses.

### 1.4 Suppliers & Customers
* **Suppliers**:
  * `Al-Hoda Raw Materials Co.` (Provides Sugar and Juice Concentrate)
  * `Delta Packaging Solutions` (Provides TetraPack Cartons)
* **Customers**:
  * `CUST-001` - Carrefour Wholesale (Wholesale buyer)
  * `CUST-002` - HyperOne Retail (Retail buyer)

---

## 2. Manufacturing Drivers (BOM & Recipes)

The system calculates standard product margins and forecasts raw material needs using the **Bill of Materials (BOM)** recipes.

### 2.1 Products
* **`PROD-JUICE` (Apple Juice 250ml)**: Sale Price = 15.00 EGP, Standard Cost = 8.00 EGP.
* **`PROD-MILK` (Full Cream Milk 1L)**: Sale Price = 35.00 EGP, Standard Cost = 20.00 EGP.

### 2.2 Raw Materials
* **`MAT-SUGAR` (Refined White Sugar)**: cost = 30.00 EGP / kg.
* **`MAT-CONCENTRATE` (Apple Juice Concentrate)**: cost = 150.00 EGP / Liter.
* **`MAT-CARTON` (TetraPack Carton 250ml)**: cost = 1.50 EGP / pcs.

### 2.3 Ingredient breakdown (Recipes)
1. **Apple Juice 250ml Recipe (v1)**:
   * **Target output**: 1 piece.
   * **Wastage allowance**: 2% (0.02)
   * **Labor Cost**: 0.50 EGP
   * **Overhead Cost**: 0.30 EGP
   * **Ingredients**:
     * Sugar: `0.02 kg` (Cost: 0.60 EGP)
     * Juice Concentrate: `0.05 L` (Cost: 7.50 EGP)
     * Carton: `1.00 pcs` (Cost: 1.50 EGP)
2. **Full Cream Milk 1L Recipe (v1)**:
   * **Target output**: 1 piece.
   * **Wastage allowance**: 1% (0.01)
   * **Labor Cost**: 1.00 EGP
   * **Overhead Cost**: 0.50 EGP
   * **Ingredients**:
     * Carton: `1.00 pcs` (Cost: 1.50 EGP)

---

## 3. Pre-loaded Cycle Records

### 3.1 FY2025 Annual Budget (Approved)
Contains pre-allocated monthly lines for 12 months in fiscal year 2025:
* **Monthly Revenue target**: 100,000 EGP (Account `4000`)
* **Monthly COGS allocation**: 55,000 EGP (Account `5000`)
* **Monthly Salaries allocation**: 20,000 EGP (Account `6100`)

### 3.2 January 2025 Actuals (Posted)
Represents the actual financial performance registered for January 2025:
* **Actual Sales Revenue**: 120,000 EGP (Positive variance of +20,000 EGP)
* **Actual COGS**: 70,000 EGP (Unfavorable variance of +15,000 EGP)
* **Actual Rent**: 10,000 EGP
* **Actual Salaries**: 21,500 EGP (Unfavorable variance of +1,500 EGP)

### 3.3 rolling Forecast & Scenarios
* **Forecast**: `FY2025 Q1 rolling Forecast` projecting Feb/March based on Jan actuals.
* **Scenarios**:
  * `Base Scenario` (5% material inflation, 10% volume growth)
  * `High Inflation Scenario` (20% sugar increase, 10% COGS growth)
  * `Demand Drop Scenario` (15% demand drop)

---

## 4. Sample Test Files for actual imports

Three sample CSV spreadsheets and two Excel templates are provided in the project root directory. You can copy the contents of the CSV files and paste them directly in the actuals wizard or use the Excel files to verify integrations.

### 4.1 Oracle GL Actuals (`oracle_actuals_sample.csv`)
* **Type**: General Ledger / actuals.
* **Purpose**: Tests import validation and postings of GL balances.
* **File Path**: [oracle_actuals_sample.csv](file:///Users/abdelrhmannounir/Desktop/ASAA-FB&A/oracle_actuals_sample.csv)
* **Headers**: `GL_Account_Code`, `Amount`, `Date`, `Quantity`, `UnitPrice`, `Reference_No`

### 4.2 POS Branch Sales (`pos_sales_sample.csv`)
* **Type**: Sales Transactions.
* **Purpose**: Tests granular product and site-level sales allocations.
* **File Path**: [pos_sales_sample.csv](file:///Users/abdelrhmannounir/Desktop/ASAA-FB&A/pos_sales_sample.csv)
* **Headers**: `SKU`, `Qty`, `Price`, `Total_Amount`, `Transaction_Date`, `Branch_Name`, `Customer_Code`

### 4.3 ERP Operating Expenses (`erp_expenses_sample.csv`)
* **Type**: Expenses.
* **Purpose**: Tests cost center allocations and payroll records.
* **File Path**: [erp_expenses_sample.csv](file:///Users/abdelrhmannounir/Desktop/ASAA-FB&A/erp_expenses_sample.csv)
* **Headers**: `GL_Account_Code`, `Cost_Center_Code`, `Expense_Amount`, `Expense_Date`, `Receipt_No`

### 4.4 Budget Excel Template (`budget_template_sample.xlsx`)
* **Purpose**: Excel upload template matching standard budget line properties.
* **File Path**: [budget_template_sample.xlsx](file:///Users/abdelrhmannounir/Desktop/ASAA-FB&A/budget_template_sample.xlsx)
* **Headers**: `Account Code`, `Site Name`, `Cost Center Code`, `Product SKU`, `Material Code`, `Customer Code`, `Month`, `Quantity`, `Unit Price`, `Amount`, `Notes`

### 4.5 Forecast Excel Template (`forecast_template_sample.xlsx`)
* **Purpose**: Excel upload template matching forecast drivers and rolling variables.
* **File Path**: [forecast_template_sample.xlsx](file:///Users/abdelrhmannounir/Desktop/ASAA-FB&A/forecast_template_sample.xlsx)
* **Headers**: `Account Code`, `Site Name`, `Cost Center Code`, `Product SKU`, `Material Code`, `Customer Code`, `Month`, `Quantity`, `Unit Price`, `Amount`, `Notes`, `Driver Type`
