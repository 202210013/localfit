-- Add size column to carts table
ALTER TABLE `carts` ADD COLUMN `size` VARCHAR(10) DEFAULT 'M' AFTER `quantity`;

-- Add size column to orders table
ALTER TABLE `orders` ADD COLUMN `size` VARCHAR(10) DEFAULT 'M' AFTER `quantity`;

-- Update existing orders to have a default size (since they don't have size data)
UPDATE `orders` SET `size` = 'M' WHERE `size` IS NULL OR `size` = '';
