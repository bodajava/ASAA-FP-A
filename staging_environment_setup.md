# Staging/Production-like Data Environment Setup Guide

This guide provides step-by-step instructions to set up 100% free staging environments for both the application database (Aiven MySQL Free Tier) and the external Oracle integration database (Oracle Cloud Always Free Autonomous Database) for the FP&A SaaS.

---

## 1. MySQL App Database Setup (Aiven Free Tier)

Aiven offers a truly free tier for MySQL that does not expire and does not require a paid credit card upgrade.

### Step-by-Step Setup
1. **Sign Up**: Go to [aiven.io](https://aiven.io/) and create a free account.
2. **Create Project**: Name your new project (e.g., `idiibi-fpa-staging`).
3. **Launch Service**:
   - Click **Create service**.
   - Select **MySQL** as the service type.
   - Under the plan options, choose the **Free** tier (available in AWS regions like `eu-west-1` Ireland or `us-east-1` N. Virginia).
   - Click **Create service**.
4. **Download CA Certificate**:
   - Once the service status turns to `RUNNING`, navigate to the service Overview page.
   - Locate the **Connection information** section.
   - Click **Download CA certificate** and save it as `ca.pem` in your application (if you intend to verify certificates strictly, e.g. under `backend/certs/ca.pem`).
5. **Construct the Connection URL**:
   - Get the Host, Port, User (`avnadmin`), and Password from the dashboard.
   - Construct your `DATABASE_URL` for `backend/.env`.
   - Since Aiven enforces SSL, append standard SSL parameters. For Prisma, the URL structure is:
     ```env
     DATABASE_URL="mysql://avnadmin:<YOUR_PASSWORD>@<AIVEN_HOST>:<AIVEN_PORT>/defaultdb?sslaccept=strict"
     ```
     *(Note: If you do not wish to verify the CA certificate explicitly, you can set `sslaccept=accept_invalid_certs` or rely on default SSL support).*

---

## 2. Oracle Source Database Setup (Oracle Cloud Always Free ATP)

Oracle Cloud offers two "Always Free" Autonomous Databases (Autonomous Transaction Processing - ATP, or Autonomous Data Warehouse - ADW). These include 20 GB of storage each and 1 OCPU, which is ideal for an integration data source.

### Step-by-Step Setup
1. **Sign Up**: Register for an Oracle Cloud Free Tier account at [oracle.com/cloud/free/](https://oracle.com/cloud/free/).
2. **Create Autonomous Database**:
   - Search for **Autonomous Database** in the search bar or menu.
   - Click **Create Autonomous Database**.
   - **Compartment**: Choose your default root compartment.
   - **Display Name & Database Name**: Set to `FREEPDB1` or similar.
   - **Workload Type**: Select **Transaction Processing** (ATP).
   - **Deployment Type**: Select **Shared Infrastructure**.
   - **Always Free**: Ensure the **Always Free** toggle is switched **ON** (this locks the CPU to 1 OCPU and storage to 20 GB).
   - **Database Version**: Select `19c` or `21c` or `23ai`.
   - **Admin Credentials**: Set a strong password for the `ADMIN` user.
3. **Network Configuration (Crucial for Connection)**:
   - Under **Access Type**, choose **Secure access from everywhere** (Public Endpoint).
   - *Optionally*, restrict access to your server's IP address by configuring Access Control Rules.
   - Under **Mutual TLS (mTLS) Authentication**:
     - Uncheck **Require Mutual TLS (mTLS) authentication** if you want to use standard **walletless TLS**. 
     - **Recommendation**: Enabling walletless TLS simplifies backend connection strings since it eliminates the need to download and configure a wallet `.zip` file on your NestJS server.
4. **Retrieve Connection Strings**:
   - Once the database is provisioned (`Available` state), click on **Database Connection**.
   - Find the Connection Strings table.
   - Under **TLS** (walletless), copy the connection string for the `_low` or `_medium` profile.
   - It will look like this:
     ```
     (description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=adb.us-ashburn-1.oraclecloud.com))(connect_data=(service_name=g12a34b56c7d_freepdb1_low.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))
     ```

### Node-oracledb Thin Mode Connection Configuration
The application backend uses `oracledb` in Thin Mode, which runs entirely in pure JavaScript and does not require Oracle Instant Client binaries.

* **Walletless TLS Connection (Recommended)**:
  Provide the Host, Port, and Service Name directly in the connection options:
  ```typescript
  const connection = await oracledb.getConnection({
    user: 'fpuat',
    password: 'YourPasswordHere',
    connectString: 'adb.us-ashburn-1.oraclecloud.com:1522/g12a34b56c7d_freepdb1_low.adb.oraclecloud.com?ssl=true'
  });
  ```

* **mTLS Wallet Connection (If Wallet is required)**:
  1. Download the Client Credentials wallet `Wallet_<dbname>.zip` from the Oracle Console.
  2. Extract it to a secure folder on the server (e.g. `/opt/oracle/wallet`).
  3. Reference the directory in the connection options using the `configDir` property:
     ```typescript
     oracledb.initOracleClient({ configDir: '/opt/oracle/wallet' });
     ```
     Or pass the wallet path in the connection string:
     ```
     admin/YourPassword@db_high?wallet=/opt/oracle/wallet
     ```

---

## 3. DDL Schema for Oracle Database (`FP_*` Tables)

Run the following SQL commands in your Oracle SQL Developer, Database Actions (SQL Worksheet in Oracle Cloud Console), or other Oracle clients to create the staging schema:

```sql
-- 1. Companies Table
CREATE TABLE FP_COMPANIES (
    COMPANY_CODE VARCHAR2(60) PRIMARY KEY,
    COMPANY_NAME VARCHAR2(200) NOT NULL,
    INDUSTRY_TYPE VARCHAR2(60),
    CURRENCY_CODE CHAR(3) DEFAULT 'EGP'
);

-- 2. Accounts Table
CREATE TABLE FP_ACCOUNTS (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    ACCOUNT_CODE VARCHAR2(60) NOT NULL,
    ACCOUNT_NAME VARCHAR2(180) NOT NULL,
    ACCOUNT_TYPE VARCHAR2(60) NOT NULL,
    CONSTRAINT PK_FP_ACCOUNTS PRIMARY KEY (COMPANY_CODE, ACCOUNT_CODE),
    CONSTRAINT FK_FP_ACCOUNTS_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 3. Sites Table
CREATE TABLE FP_SITES (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    SITE_CODE VARCHAR2(60) NOT NULL,
    SITE_NAME VARCHAR2(180) NOT NULL,
    SITE_TYPE VARCHAR2(60) NOT NULL,
    REGION VARCHAR2(120),
    CONSTRAINT PK_FP_SITES PRIMARY KEY (COMPANY_CODE, SITE_CODE),
    CONSTRAINT FK_FP_SITES_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 4. Customers Table
CREATE TABLE FP_CUSTOMERS (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    CUSTOMER_CODE VARCHAR2(60) NOT NULL,
    CUSTOMER_NAME VARCHAR2(200) NOT NULL,
    CUSTOMER_TYPE VARCHAR2(60),
    REGION VARCHAR2(120),
    CONSTRAINT PK_FP_CUSTOMERS PRIMARY KEY (COMPANY_CODE, CUSTOMER_CODE),
    CONSTRAINT FK_FP_CUSTOMERS_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 5. Cost Centers Table
CREATE TABLE FP_COST_CENTERS (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    COST_CENTER_CODE VARCHAR2(60) NOT NULL,
    COST_CENTER_NAME VARCHAR2(180) NOT NULL,
    COST_CENTER_TYPE VARCHAR2(60),
    CONSTRAINT PK_FP_COST_CENTERS PRIMARY KEY (COMPANY_CODE, COST_CENTER_CODE),
    CONSTRAINT FK_FP_CC_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 6. Product Categories Table
CREATE TABLE FP_PRODUCT_CATEGORIES (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    CATEGORY_CODE VARCHAR2(60) NOT NULL,
    CATEGORY_NAME VARCHAR2(180) NOT NULL,
    CONSTRAINT PK_FP_PROD_CAT PRIMARY KEY (COMPANY_CODE, CATEGORY_CODE),
    CONSTRAINT FK_FP_CAT_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 7. Units Table
CREATE TABLE FP_UNITS (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    UNIT_CODE VARCHAR2(20) NOT NULL,
    UNIT_NAME VARCHAR2(80) NOT NULL,
    CONSTRAINT PK_FP_UNITS PRIMARY KEY (COMPANY_CODE, UNIT_CODE),
    CONSTRAINT FK_FP_UNITS_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 8. Suppliers Table
CREATE TABLE FP_SUPPLIERS (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    SUPPLIER_CODE VARCHAR2(60) NOT NULL,
    SUPPLIER_NAME VARCHAR2(200) NOT NULL,
    SUPPLIER_PHONE VARCHAR2(40),
    SUPPLIER_EMAIL VARCHAR2(190),
    CONSTRAINT PK_FP_SUPPLIERS PRIMARY KEY (COMPANY_CODE, SUPPLIER_CODE),
    CONSTRAINT FK_FP_SUPPLIERS_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 9. Products Table
CREATE TABLE FP_PRODUCTS (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    PRODUCT_CODE VARCHAR2(60) NOT NULL,
    PRODUCT_NAME VARCHAR2(180) NOT NULL,
    CATEGORY VARCHAR2(120),
    UNIT VARCHAR2(20),
    SALE_PRICE NUMBER(12,2) DEFAULT 0.00,
    STANDARD_COST NUMBER(12,2) DEFAULT 0.00,
    CONSTRAINT PK_FP_PRODUCTS PRIMARY KEY (COMPANY_CODE, PRODUCT_CODE),
    CONSTRAINT FK_FP_PRODUCTS_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 10. Materials Table
CREATE TABLE FP_MATERIALS (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    MATERIAL_CODE VARCHAR2(60) NOT NULL,
    MATERIAL_NAME VARCHAR2(180) NOT NULL,
    UNIT VARCHAR2(20),
    PURCHASE_PRICE NUMBER(12,2) DEFAULT 0.00,
    SUPPLIER_CODE VARCHAR2(60),
    CONSTRAINT PK_FP_MATERIALS PRIMARY KEY (COMPANY_CODE, MATERIAL_CODE),
    CONSTRAINT FK_FP_MATERIALS_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 11. BOM Recipes Table
CREATE TABLE FP_BOM_RECIPES (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    RECIPE_CODE VARCHAR2(60) NOT NULL,
    PRODUCT_CODE VARCHAR2(60) NOT NULL,
    VERSION VARCHAR2(20) NOT NULL,
    OUTPUT_QTY NUMBER(12,4) DEFAULT 1.0000,
    LABOR_COST NUMBER(12,2) DEFAULT 0.00,
    OVERHEAD_COST NUMBER(12,2) DEFAULT 0.00,
    CONSTRAINT PK_FP_BOM_RECIPES PRIMARY KEY (COMPANY_CODE, RECIPE_CODE),
    CONSTRAINT FK_FP_RECIPES_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 12. BOM Lines Table
CREATE TABLE FP_BOM_LINES (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    LINE_ID VARCHAR2(60) NOT NULL,
    RECIPE_CODE VARCHAR2(60) NOT NULL,
    MATERIAL_CODE VARCHAR2(60) NOT NULL,
    QTY_PER_OUTPUT NUMBER(12,4) NOT NULL,
    UNIT_COST NUMBER(12,4) DEFAULT 0.0000,
    CONSTRAINT PK_FP_BOM_LINES PRIMARY KEY (COMPANY_CODE, LINE_ID),
    CONSTRAINT FK_FP_BOM_LINES_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 13. Inventory Snapshots Table
CREATE TABLE FP_INVENTORY_SNAPSHOTS (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    SITE_CODE VARCHAR2(60) NOT NULL,
    PRODUCT_CODE VARCHAR2(60),
    MATERIAL_CODE VARCHAR2(60),
    SNAPSHOT_DATE DATE NOT NULL,
    QTY_ON_HAND NUMBER(12,4) NOT NULL,
    INVENTORY_VALUE NUMBER(12,2) DEFAULT 0.00,
    CONSTRAINT FK_FP_INV_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 14. Budget Lines Table
CREATE TABLE FP_BUDGET_LINES (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    ACCOUNT_CODE VARCHAR2(60) NOT NULL,
    SITE_CODE VARCHAR2(60) NOT NULL,
    COST_CENTER_CODE VARCHAR2(60) NOT NULL,
    PRODUCT_CODE VARCHAR2(60),
    MATERIAL_CODE VARCHAR2(60),
    CUSTOMER_CODE VARCHAR2(60),
    PERIOD_MONTH VARCHAR2(7) NOT NULL, -- Format: YYYY-MM
    QUANTITY NUMBER(12,4) DEFAULT 0.0000,
    UNIT_PRICE NUMBER(12,2) DEFAULT 0.00,
    AMOUNT NUMBER(12,2) DEFAULT 0.00,
    NOTES VARCHAR2(500),
    CONSTRAINT FK_FP_BUDGET_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 15. Forecast Lines Table
CREATE TABLE FP_FORECAST_LINES (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    ACCOUNT_CODE VARCHAR2(60) NOT NULL,
    SITE_CODE VARCHAR2(60) NOT NULL,
    COST_CENTER_CODE VARCHAR2(60) NOT NULL,
    PRODUCT_CODE VARCHAR2(60),
    MATERIAL_CODE VARCHAR2(60),
    CUSTOMER_CODE VARCHAR2(60),
    PERIOD_MONTH VARCHAR2(7) NOT NULL, -- Format: YYYY-MM
    QUANTITY NUMBER(12,4) DEFAULT 0.0000,
    UNIT_PRICE NUMBER(12,2) DEFAULT 0.00,
    AMOUNT NUMBER(12,2) DEFAULT 0.00,
    DRIVER_TYPE VARCHAR2(60),
    NOTES VARCHAR2(500),
    CONSTRAINT FK_FP_FORECAST_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 16. Production Plans Table
CREATE TABLE FP_PRODUCTION_PLANS (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    SITE_CODE VARCHAR2(60) NOT NULL,
    PRODUCT_CODE VARCHAR2(60) NOT NULL,
    PLAN_SOURCE VARCHAR2(60),
    FISCAL_YEAR NUMBER(4) NOT NULL,
    PERIOD_MONTH VARCHAR2(7) NOT NULL,
    PLANNED_QTY NUMBER(12,4) DEFAULT 0.0000,
    ACTUAL_QTY NUMBER(12,4) DEFAULT 0.0000,
    ESTIMATED_COST NUMBER(12,2) DEFAULT 0.00,
    ACTUAL_COST NUMBER(12,2) DEFAULT 0.00,
    CONSTRAINT FK_FP_PROD_PLANS_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 17. Headcount Plans Table
CREATE TABLE FP_HEADCOUNT_PLANS (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    SITE_CODE VARCHAR2(60) NOT NULL,
    COST_CENTER_CODE VARCHAR2(60) NOT NULL,
    JOB_TITLE VARCHAR2(120) NOT NULL,
    DEPARTMENT VARCHAR2(120) NOT NULL,
    EMPLOYMENT_TYPE VARCHAR2(60),
    HEADCOUNT NUMBER(8,2) DEFAULT 1.00,
    PERIOD_MONTH VARCHAR2(7) NOT NULL,
    BASIC_SALARY NUMBER(12,2) DEFAULT 0.00,
    ALLOWANCES NUMBER(12,2) DEFAULT 0.00,
    SOCIAL_INSURANCE NUMBER(12,2) DEFAULT 0.00,
    TOTAL_COST NUMBER(12,2) DEFAULT 0.00,
    NOTES VARCHAR2(500),
    CONSTRAINT FK_FP_HC_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 18. Promotions Table
CREATE TABLE FP_PROMOTIONS (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    NAME VARCHAR2(120) NOT NULL,
    DESCRIPTION VARCHAR2(500),
    PRODUCT_CODE VARCHAR2(60),
    CUSTOMER_CODE VARCHAR2(60),
    DISCOUNT_PCT NUMBER(5,2) DEFAULT 0.00,
    DISCOUNT_AMOUNT NUMBER(12,2) DEFAULT 0.00,
    START_DATE DATE,
    END_DATE DATE,
    BUDGET_AMOUNT NUMBER(12,2) DEFAULT 0.00,
    ACTUAL_COST NUMBER(12,2) DEFAULT 0.00,
    INCREMENTAL_REVENUE NUMBER(12,2) DEFAULT 0.00,
    ROI NUMBER(8,2) DEFAULT 0.00,
    IS_ACTIVE NUMBER(1) DEFAULT 1, -- Oracle uses 1/0 for boolean flags
    CONSTRAINT FK_FP_PROM_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 19. Raw Material Prices Table
CREATE TABLE FP_RAW_MATERIAL_PRICES (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    MATERIAL_CODE VARCHAR2(60) NOT NULL,
    PRICE NUMBER(12,4) NOT NULL,
    PRICE_DATE DATE NOT NULL,
    SOURCE VARCHAR2(120),
    CONSTRAINT FK_FP_RMP_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);

-- 20. General Ledger Actuals Table
CREATE TABLE FP_GL_ACTUALS (
    COMPANY_CODE VARCHAR2(60) NOT NULL,
    ACCOUNT_CODE VARCHAR2(60) NOT NULL,
    SITE_CODE VARCHAR2(60) NOT NULL,
    PRODUCT_CODE VARCHAR2(60),
    CUSTOMER_CODE VARCHAR2(60),
    QUANTITY NUMBER(12,4) DEFAULT 0.0000,
    AMOUNT NUMBER(12,2) DEFAULT 0.00,
    TRANSACTION_DATE DATE NOT NULL,
    REFERENCE_NO VARCHAR2(120),
    CONSTRAINT FK_FP_GLA_COMP FOREIGN KEY (COMPANY_CODE) REFERENCES FP_COMPANIES(COMPANY_CODE) ON DELETE CASCADE
);
```
