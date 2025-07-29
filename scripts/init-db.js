const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function initDatabase() {
  try {
    console.log('Connecting to database...');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Creating database schema...');
    await pool.query(schema);
    console.log('✅ Database schema created successfully!');
    
    // Check if we should run seed data
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('Database is empty, would you like to add sample data? (Run seed separately)');
    }
    
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    
    if (error.code === '42P06') {
      console.log('Note: Some objects already exist - this is normal on subsequent runs');
    } else if (error.code === '3D000') {
      console.error('Database does not exist. Please create the database first:');
      console.error('createdb expenses');
    } else if (error.code === '28P01' || error.code === '28000') {
      console.error('Authentication failed. Please check your DATABASE_URL in .env.local');
    }
  } finally {
    await pool.end();
  }
}

initDatabase();