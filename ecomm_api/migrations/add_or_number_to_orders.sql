-- Migration: Add OR Number column to orders table
-- Date: September 11, 2025
-- Description: Add or_number field to support Official Receipt Number tracking

-- Check if the or_number column already exists before adding it
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'or_number'
);

-- Add the or_number column if it doesn't exist
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE orders ADD COLUMN or_number VARCHAR(50) NULL AFTER pickup_date',
    'SELECT "Column or_number already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add an index on or_number for better query performance
SET @index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND INDEX_NAME = 'idx_or_number'
);

SET @sql = IF(@index_exists = 0,
    'ALTER TABLE orders ADD INDEX idx_or_number (or_number)',
    'SELECT "Index idx_or_number already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show the updated table structure
DESCRIBE orders;
