-- Enterprise Costing & Profitability Engine Schema Changes
-- Safe to run directly on Hostinger MySQL / MariaDB

-- 1. Add fields to materials table
ALTER TABLE `materials` ADD COLUMN `material_type` VARCHAR(50) DEFAULT 'raw_material' NULL;

-- 2. Add fields to bom_lines table
ALTER TABLE `bom_lines` ADD COLUMN `yield_pct` DECIMAL(6, 3) DEFAULT 100.000 NULL;
ALTER TABLE `bom_lines` ADD COLUMN `cost_category` VARCHAR(50) NULL;

-- 3. Create product_cost_snapshots table
CREATE TABLE IF NOT EXISTS `product_cost_snapshots` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `bom_id` BIGINT UNSIGNED NULL,
    `period` VARCHAR(30) NOT NULL,
    `snapshot_date` DATE NOT NULL,
    `raw_material_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `packaging_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `manufacturing_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `labor_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `utilities_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `overhead_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `warehouse_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `freight_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `selling_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `total_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `selling_price` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `gross_profit` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `gross_margin_pct` DECIMAL(6, 3) NOT NULL DEFAULT 0.000,
    `net_profit` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `net_margin_pct` DECIMAL(6, 3) NOT NULL DEFAULT 0.000,
    `actual_raw_material_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `actual_packaging_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `actual_manufacturing_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `actual_labor_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `actual_utilities_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `actual_overhead_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `actual_warehouse_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `actual_freight_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `actual_selling_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `actual_total_cost` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `actual_selling_price` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `actual_gross_profit` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `actual_gross_margin_pct` DECIMAL(6, 3) NOT NULL DEFAULT 0.000,
    `actual_net_profit` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `actual_net_margin_pct` DECIMAL(6, 3) NOT NULL DEFAULT 0.000,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL ON UPDATE CURRENT_TIMESTAMP(0),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_product_cost_snapshot` (`company_id`, `product_id`, `period`),
    CONSTRAINT `fk_snapshots_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_snapshots_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_snapshots_bom` FOREIGN KEY (`bom_id`) REFERENCES `bom_recipes`(`id`) ON DELETE SET NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. Create production_cost_allocations table
CREATE TABLE IF NOT EXISTS `production_cost_allocations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` BIGINT UNSIGNED NOT NULL,
    `site_id` BIGINT UNSIGNED NULL,
    `product_id` BIGINT UNSIGNED NULL,
    `period` VARCHAR(30) NOT NULL,
    `cost_category` VARCHAR(50) NOT NULL,
    `allocated_amount` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `allocation_method` VARCHAR(80) NOT NULL DEFAULT 'production_volume',
    `description` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL ON UPDATE CURRENT_TIMESTAMP(0),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_allocations_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_allocations_site` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_allocations_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. Create cost_drivers table
CREATE TABLE IF NOT EXISTS `cost_drivers` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `driver_type` VARCHAR(50) NOT NULL,
    `impact_pct` DECIMAL(6, 3) NOT NULL DEFAULT 0.000,
    `affected_entity_id` BIGINT UNSIGNED NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL ON UPDATE CURRENT_TIMESTAMP(0),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_drivers_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
