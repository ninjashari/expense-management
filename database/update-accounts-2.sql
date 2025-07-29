-- Add status, opening date and currency to accounts table
ALTER TABLE accounts 
ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
ADD COLUMN opening_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN currency VARCHAR(3) DEFAULT 'INR';