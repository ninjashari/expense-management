-- Add credit card specific fields to accounts table
ALTER TABLE accounts 
ADD COLUMN credit_limit DECIMAL(12, 2),
ADD COLUMN bill_generation_date INTEGER CHECK (bill_generation_date >= 1 AND bill_generation_date <= 31),
ADD COLUMN payment_due_date INTEGER CHECK (payment_due_date >= 1 AND payment_due_date <= 31);