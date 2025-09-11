// backend/src/config/init-db.js
const db = require('./database');
const fs = require('fs').promises;
const path = require('path');

async function initDatabase() {
  try {
    console.log('📦 Initializing database...');
    
    // Read schema file
    const schema = await fs.readFile(
      path.join(__dirname, 'schema.sql'), 
      'utf8'
    );
    
    // Execute schema
    const statements = schema.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await db.query(statement);
      }
    }
    
    console.log('✅ Database initialized successfully');
    
    // Create default organization and user
    const orgResult = await db.query(
      'INSERT INTO organizations (name) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id',
      ['Default Organization']
    );
    
    if (orgResult.rows.length > 0) {
      console.log('✅ Default organization created');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initDatabase();