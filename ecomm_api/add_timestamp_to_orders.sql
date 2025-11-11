-- SQL Script to add created_at timestamp column to orders table
-- Run this in phpMyAdmin or MySQL command line

-- First, add the created_at column with default CURRENT_TIMESTAMP
ALTER TABLE `orders` 
ADD COLUMN `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing orders to have a realistic timestamp
-- This will set all existing orders to have different timestamps spread over the last 30 days
UPDATE `orders` 
SET `created_at` = DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY)
WHERE `created_at` IS NULL;

-- You can also set specific dates for existing orders if you prefer
-- For example, to set completed orders to recent dates:
-- UPDATE `orders` 
-- SET `created_at` = '2025-09-08 10:30:00'
-- WHERE `id` = 66 AND `status` = 'completed';

-- UPDATE `orders` 
-- SET `created_at` = '2025-09-07 14:15:00'
-- WHERE `id` = 67 AND `status` = 'completed';

-- UPDATE `orders` 
-- SET `created_at` = '2025-09-06 09:45:00'
-- WHERE `id` = 68 AND `status` = 'completed';

-- UPDATE `orders` 
-- SET `created_at` = '2025-09-05 16:20:00'
-- WHERE `id` = 69 AND `status` = 'completed';

-- UPDATE `orders` 
-- SET `created_at` = '2025-09-04 11:10:00'
-- WHERE `id` = 71 AND `status` = 'completed';

-- UPDATE `orders` 
-- SET `created_at` = '2025-09-03 13:25:00'
-- WHERE `id` = 72 AND `status` = 'completed';

-- Verify the changes
SELECT id, customer, product, status, created_at 
FROM orders 
WHERE status = 'completed' 
ORDER BY created_at DESC;
