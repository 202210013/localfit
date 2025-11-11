-- Add available_sizes column to products table
ALTER TABLE `products` ADD COLUMN `available_sizes` JSON DEFAULT NULL AFTER `category`;

-- Update existing products to have default available sizes (S, M, L, XL)
UPDATE `products` SET `available_sizes` = JSON_ARRAY('S', 'M', 'L', 'XL') WHERE `available_sizes` IS NULL;
