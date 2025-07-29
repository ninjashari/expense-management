const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://expense_user:nezuko@localhost:5432/expenses',
});

async function seedDatabase() {
  try {
    console.log('Connecting to database...');
    
    // Check if database has users (to avoid duplicate seeding)
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) > 0) {
      console.log('Database already has data. Skipping seed.');
      return;
    }
    
    // Note: The seed.sql file references users, so we'll create a simple demo user first
    console.log('Creating demo user...');
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id`,
      ['Demo User', 'demo@example.com', hashedPassword]
    );
    
    const userId = userResult.rows[0].id;
    console.log('✅ Demo user created with email: demo@example.com and password: password123');
    
    // Insert sample categories
    console.log('Creating sample categories...');
    await pool.query(`
      INSERT INTO categories (user_id, name, color) VALUES 
      ($1, 'Food & Dining', '#ef4444'),
      ($1, 'Transportation', '#f97316'),
      ($1, 'Shopping', '#eab308'),
      ($1, 'Entertainment', '#22c55e'),
      ($1, 'Bills & Utilities', '#3b82f6'),
      ($1, 'Healthcare', '#a855f7'),
      ($1, 'Travel', '#06b6d4'),
      ($1, 'Education', '#84cc16'),
      ($1, 'Personal Care', '#f59e0b'),
      ($1, 'Income', '#10b981')
    `, [userId]);
    
    // Insert sample payees
    console.log('Creating sample payees...');
    await pool.query(`
      INSERT INTO payees (user_id, name, email) VALUES 
      ($1, 'Walmart', 'billing@walmart.com'),
      ($1, 'Shell Gas Station', 'support@shell.com'),
      ($1, 'Netflix', 'billing@netflix.com'),
      ($1, 'Electric Company', 'billing@electricco.com'),
      ($1, 'Internet Provider', 'billing@isp.com'),
      ($1, 'Employer', 'payroll@company.com')
    `, [userId]);
    
    // Insert sample accounts
    console.log('Creating sample accounts...');
    await pool.query(`
      INSERT INTO accounts (user_id, name, type, balance) VALUES 
      ($1, 'Main Checking', 'checking', 2500.00),
      ($1, 'Savings Account', 'savings', 10000.00),
      ($1, 'Credit Card', 'credit', -1250.75),
      ($1, 'Cash Wallet', 'cash', 150.00)
    `, [userId]);
    
    console.log('✅ Sample data created successfully!');
    console.log('');
    console.log('🚀 You can now login with:');
    console.log('   Email: demo@example.com');
    console.log('   Password: password123');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
  } finally {
    await pool.end();
  }
}

seedDatabase();