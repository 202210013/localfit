-- Add remarks column to orders table if it doesn't exist
SET @query = 'SELECT COUNT(*) INTO @column_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = "orders" AND COLUMN_NAME = "remarks"';
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @query = IF(@column_exists = 0, 'ALTER TABLE orders ADD COLUMN remarks TEXT NULL AFTER status', 'SELECT "Column already exists" as message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
