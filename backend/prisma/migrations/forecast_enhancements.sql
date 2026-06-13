-- ============================================================================
-- FP&A Forecast Engine Enhancements
-- Target: MariaDB 11.8.6
-- Adds: seasonal_indices, forecast_accuracy_logs, enum values
-- ============================================================================

-- 1. Add new ForecastMethod enum values (ALTER ENUM requires table rebuild in MariaDB)
-- We use a safe approach: alter the column to support the new values
ALTER TABLE forecast_cycles
  MODIFY COLUMN method ENUM(
    'manual','rolling','driver_based','ai_assisted',
    'seasonal_adjusted','hybrid'
  ) DEFAULT 'manual';

-- 2. Create seasonal_indices table
CREATE TABLE IF NOT EXISTS seasonal_indices (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id  BIGINT UNSIGNED NOT NULL,
  account_id  BIGINT UNSIGNED NOT NULL,
  month       TINYINT NOT NULL COMMENT '1=Jan .. 12=Dec',
  factor      DECIMAL(7,4) NOT NULL COMMENT 'Seasonal multiplier (1.0 = average)',
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_seasonal_idx (company_id, account_id, month),
  CONSTRAINT fk_seasonal_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_seasonal_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create forecast_accuracy_logs table
CREATE TABLE IF NOT EXISTS forecast_accuracy_logs (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id        BIGINT UNSIGNED NOT NULL,
  forecast_cycle_id BIGINT UNSIGNED NOT NULL,
  account_id        BIGINT UNSIGNED NOT NULL,
  fiscal_year       INT NOT NULL,
  period_month      TINYINT NOT NULL,
  forecast_amount   DECIMAL(16,2) NOT NULL DEFAULT 0,
  actual_amount     DECIMAL(16,2) NOT NULL DEFAULT 0,
  variance_pct      DECIMAL(7,2) NOT NULL DEFAULT 0,
  method_used       VARCHAR(60) NOT NULL,
  confidence_score  DECIMAL(5,2) DEFAULT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_accuracy_entry (company_id, forecast_cycle_id, account_id, period_month),
  KEY idx_accuracy_lookup (company_id, fiscal_year, account_id),
  CONSTRAINT fk_accuracy_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_accuracy_cycle FOREIGN KEY (forecast_cycle_id) REFERENCES forecast_cycles(id) ON DELETE CASCADE,
  CONSTRAINT fk_accuracy_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
