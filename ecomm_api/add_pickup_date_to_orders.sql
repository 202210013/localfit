-- Add pickup_date column to orders table
ALTER TABLE orders ADD COLUMN pickup_date DATE NULL AFTER status;

-- Update existing orders with pickup_date if they are approved or ready-for-pickup
UPDATE orders 
SET pickup_date = DATE_ADD(created_at, INTERVAL 3 DAY) 
WHERE status IN ('approved', 'ready-for-pickup', 'completed') 
AND pickup_date IS NULL;
