-- Enterprise Enhancement Tables: alerts, import_jobs, import_job_lines
-- Safe to run multiple times (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS `alerts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(80) NOT NULL DEFAULT 'general',
    `priority` VARCHAR(20) NOT NULL DEFAULT 'info',
    `severity` VARCHAR(20) NOT NULL DEFAULT 'low',
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `action_url` VARCHAR(500) NULL,
    `expires_at` TIMESTAMP(0) NULL,
    `entity_type` VARCHAR(80) NULL,
    `entity_id` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL,
    INDEX `idx_alerts_company_read`(`company_id`, `is_read`, `is_archived`, `created_at`),
    INDEX `idx_alerts_user_read`(`user_id`, `is_read`),
    INDEX `idx_alerts_category`(`category`),
    INDEX `idx_alerts_priority`(`priority`),
    INDEX `idx_alerts_expires`(`expires_at`),
    PRIMARY KEY (`id`),
    CONSTRAINT `alerts_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `alerts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `import_jobs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `module` VARCHAR(80) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
    `file_name` VARCHAR(255) NULL,
    `total_rows` INTEGER NOT NULL DEFAULT 0,
    `processed_rows` INTEGER NOT NULL DEFAULT 0,
    `success_rows` INTEGER NOT NULL DEFAULT 0,
    `failed_rows` INTEGER NOT NULL DEFAULT 0,
    `skipped_rows` INTEGER NOT NULL DEFAULT 0,
    `progress_pct` DOUBLE NOT NULL DEFAULT 0,
    `mapping_config` LONGTEXT NULL,
    `error_log` LONGTEXT NULL,
    `started_at` TIMESTAMP(0) NULL,
    `completed_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL,
    INDEX `idx_import_jobs_company_module`(`company_id`, `module`, `status`),
    INDEX `idx_import_jobs_company_date`(`company_id`, `created_at`),
    PRIMARY KEY (`id`),
    CONSTRAINT `import_jobs_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `import_jobs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `import_job_lines` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `job_id` BIGINT UNSIGNED NOT NULL,
    `row_number` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `errors` LONGTEXT NULL,
    `mapped_data` LONGTEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    INDEX `idx_import_lines_job_status`(`job_id`, `status`),
    INDEX `idx_import_lines_job_row`(`job_id`, `row_number`),
    PRIMARY KEY (`id`),
    CONSTRAINT `import_job_lines_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `import_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
