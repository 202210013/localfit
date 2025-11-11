-- Migration: Add pickup_date column to carts table
-- Date: September 10, 2025
-- Description: Add pickup_date field to support customer pickup date selection

-- Check if the pickup_date column already exists before adding it
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'carts'
    AND COLUMN_NAME = 'pickup_date'
);

-- Add the pickup_date column if it doesn't exist
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE carts ADD COLUMN pickup_date DATE NULL AFTER size',
    'SELECT "Column pickup_date already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add an index on pickup_date for better query performance
SET @index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'carts'
    AND INDEX_NAME = 'idx_pickup_date'
);

SET @sql = IF(@index_exists = 0,
    'ALTER TABLE carts ADD INDEX idx_pickup_date (pickup_date)',
    'SELECT "Index idx_pickup_date already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show the updated table structure
DESCRIBE carts;
