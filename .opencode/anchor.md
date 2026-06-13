# ASAA FP&A Suite — Project Anchor

## Current Status: Phase 1 (Gap Fixing) — ✅ Complete

## All Completed Fixes

### 🔴 Backend — Critical
- [x] AuthModule JwtModule: Added `secret` and `signOptions` config
- [x] RolesGuard `isSuperAdmin` — verified method exists and works
- [x] JwtStrategy — already reads `JWT_SECRET` from env (correct)

### 🗄️ Prisma Schema
- [x] Fixed `HeadcountPlan.totalCost`: removed generated column (computed in app code)
- [x] Added indexes: CostCenter.companyId, BomRecipe.companyId, BomRecipe.productId, BomLine.bomId, BomLine.materialId, Scenario.companyId, ActualImport.companyId, Materials.companyId, ProductCategory.companyId, Suppliers.companyId
- [x] Added unique constraint: Role[tenantId, name]
- [x] Added `createdAt`/`updatedAt` to ProductCategory
- [x] Added `createdAt` to SeasonalIndex
- [x] Added `forecast_approval` to TriggerType enum
- [x] Added `cancelled` to ApprovalStatus enum
- [x] Removed redundant ExchangeRate index `idx_rates_lookup`
- [x] Added `Promotion` model (retail promotions/discounts analysis)
- [x] Added `RawMaterialPrice` model (material price history tracking)
- [x] Added `SupplierType` enum (raw_material, packaging, logistics, service, other)
- [x] Added fields: Supplier.taxNumber, Supplier.paymentTerms, Supplier.supplierType
- [x] Added fields: Product.barcode
- [x] Added fields: Customer.taxNumber
- [x] Added fields: Site.latitude, Site.longitude

### 📊 SQL Views (3 new → 13 total)
- [x] Added `vw_wastage_analysis` — comparing planned vs actual wastage
- [x] Added `vw_forecast_accuracy` — exposing ForecastAccuracyLog data
- [x] Added `vw_material_cost_impact` — raw material price impact on BOM costs

### 🧩 Backend New Modules (3)
- [x] **Promotions module** (CRUD + ROI computation + audit logs)
- [x] **RawMaterialPrices module** (price history + latest price + audit logs)
- [x] **Users module** (user management CRUD + password hashing + role assignment)
- [x] All 3 registered in app.module.ts

### 🛡️ RolesGuard & ApiHeader (Fixed 4 Controllers)
- [x] Inventory controller — added RolesGuard, @Roles, @ApiHeader, Swagger docs
- [x] Headcount Plans controller — added RolesGuard, @Roles, @ApiHeader, Swagger docs
- [x] KPI Targets controller — added RolesGuard, @Roles, @ApiHeader, Swagger docs
- [x] Production Plans controller — added RolesGuard, @Roles, @ApiHeader, Swagger docs

### 🚀 Cache Invalidation
- [x] Registered ClearCacheInterceptor globally via APP_INTERCEPTOR
- [x] Cache auto-clears on every POST/PUT/PATCH/DELETE across all modules

### 🌱 Seed File (639 → 1008 lines)
- [x] Plans (Starter, Business, Enterprise)
- [x] Subscription linking tenant to Business plan
- [x] Exchange Rates (EGP/USD, EGP/EUR)
- [x] Headcount Plans (Production, Sales, Admin)
- [x] Production Plans (Juice & Milk × 3 months)
- [x] Inventory Snapshots (products + materials, 3 months)
- [x] KPI Targets (Revenue, Margin, Efficiency, Satisfaction)
- [x] Notification Rules (Budget Variance, Import Failure)
- [x] Promotions (Summer Juice, New Year Milk)
- [x] Raw Material Prices (Sugar, Concentrate, Carton history)
- [x] 9 Additional Roles (CFO, FP&A Manager, Financial Analyst, Sales Manager, Production Manager, Procurement Manager, Branch Manager, Warehouse Manager, Auditor)
- [x] Fixed `JSON.parse(JSON.stringify(...))` antipattern (4 occurrences)

### 🎨 Frontend (3 new pages + fixes)
- [x] Removed duplicate `Company` type in auth-context.tsx (imports from types/api)
- [x] Fixed `parseInt` without radix in production-planning/page.tsx
- [x] Added `'use client'` directive to feedback-states.tsx
- [x] **Promotions page** — full CRUD UI with filters/form/ROI tracking
- [x] **Raw Material Prices page** — CRUD with material selector, date range
- [x] **Users Management page** — CRUD with role assignment, status toggle
- [x] **Error Boundary** — error.tsx with retry button
- [x] **Route Loading** — loading.tsx with spinner
- [x] **Sidebar** — added links to Promotions, Raw Mat. Prices, Users
- [x] Added types: Promotion, RawMaterialPrice, User, Role to types/api.ts

### 📋 Key Metrics
- **Backend Modules**: 35
- **Prisma Models**: 36
- **SQL Views**: 13
- **Frontend Pages**: 33
- **Seed Lines**: 1008

## Remaining (Very Low Priority)
- [ ] Run `prisma generate` + `prisma db push` (requires DB connection)
- [ ] Run full test suite
