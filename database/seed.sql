-- Insert sample categories
INSERT INTO categories (user_id, name, color) VALUES 
((SELECT id FROM users LIMIT 1), 'Food & Dining', '#ef4444'),
((SELECT id FROM users LIMIT 1), 'Transportation', '#f97316'),
((SELECT id FROM users LIMIT 1), 'Shopping', '#eab308'),
((SELECT id FROM users LIMIT 1), 'Entertainment', '#22c55e'),
((SELECT id FROM users LIMIT 1), 'Bills & Utilities', '#3b82f6'),
((SELECT id FROM users LIMIT 1), 'Healthcare', '#a855f7'),
((SELECT id FROM users LIMIT 1), 'Travel', '#06b6d4'),
((SELECT id FROM users LIMIT 1), 'Education', '#84cc16'),
((SELECT id FROM users LIMIT 1), 'Personal Care', '#f59e0b'),
((SELECT id FROM users LIMIT 1), 'Income', '#10b981');

-- Insert sample payees
INSERT INTO payees (user_id, name, email) VALUES 
((SELECT id FROM users LIMIT 1), 'Walmart', 'billing@walmart.com'),
((SELECT id FROM users LIMIT 1), 'Shell Gas Station', 'support@shell.com'),
((SELECT id FROM users LIMIT 1), 'Netflix', 'billing@netflix.com'),
((SELECT id FROM users LIMIT 1), 'Electric Company', 'billing@electricco.com'),
((SELECT id FROM users LIMIT 1), 'Internet Provider', 'billing@isp.com'),
((SELECT id FROM users LIMIT 1), 'Employer', 'payroll@company.com');

-- Insert sample accounts
INSERT INTO accounts (user_id, name, type, balance) VALUES 
((SELECT id FROM users LIMIT 1), 'Main Checking', 'checking', 2500.00),
((SELECT id FROM users LIMIT 1), 'Savings Account', 'savings', 10000.00),
((SELECT id FROM users LIMIT 1), 'Credit Card', 'credit', -1250.75),
((SELECT id FROM users LIMIT 1), 'Cash Wallet', 'cash', 150.00);