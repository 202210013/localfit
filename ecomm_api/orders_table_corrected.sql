-- Updated Orders Table Structure with created_at timestamp
-- This is the corrected version of the orders table

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `customer` varchar(255) DEFAULT NULL,
  `product` varchar(255) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `size` varchar(10) DEFAULT 'M',
  `status` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- If you need to recreate the table from scratch, use this:
-- DROP TABLE IF EXISTS `orders`;
-- Then create with the structure above

-- If you have an existing table without created_at, just run:
-- ALTER TABLE `orders` ADD COLUMN `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing records with realistic timestamps (optional)
-- UPDATE `orders` SET `created_at` = DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30) DAY) WHERE `created_at` IS NULL;
