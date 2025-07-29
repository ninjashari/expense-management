-- Simplify payees table to only include name
ALTER TABLE payees 
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS address;