


const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false 
  }
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL Database.');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});


const dbQuery = {
  
  
  _transformQuery(sql) {
    let index = 1;
    let pgSql = sql.replace(/\?/g, () => `$${index++}`);
    
    
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING ID')) {
      pgSql += ' RETURNING id';
    }
    return pgSql;
  },

  
  async run(sql, params = []) {
    const pgSql = this._transformQuery(sql);
    try {
      const result = await pool.query(pgSql, params);
      return { 
        id: result.rows.length > 0 ? result.rows[0].id : null, 
        changes: result.rowCount 
      };
    } catch (err) {
      console.error('DB Run Error: ', err.message);
      throw err;
    }
  },

  
  async get(sql, params = []) {
    const pgSql = this._transformQuery(sql);
    try {
      const result = await pool.query(pgSql, params);
      return result.rows[0] || null;
    } catch (err) {
      console.error('DB Get Error: ', err.message);
      throw err;
    }
  },

  
  async all(sql, params = []) {
    const pgSql = this._transformQuery(sql);
    try {
      const result = await pool.query(pgSql, params);
      return result.rows;
    } catch (err) {
      console.error('DB All Error: ', err.message);
      throw err;
    }
  },

  
  async exec(sql) {
    
    try {
      await pool.query(sql);
    } catch (err) {
      console.error('DB Exec Error: ', err.message);
      throw err;
    }
  }
};

const initDatabase = async () => {
  try {
    
    const checkTableSql = "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') as exists";
    const result = await pool.query(checkTableSql);
    const tableExists = result.rows[0].exists;

    if (!tableExists) {
      console.log('Database tables not found. Initializing PostgreSQL schema...');
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await dbQuery.exec(schemaSql);
      console.log('PostgreSQL Database tables created successfully. Starting fresh!');
    } else {
      console.log('PostgreSQL Database already initialized.');
    }

    
    const checkFeedbackSentSql = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='bookings' AND column_name='feedback_sent'
    `;
    const checkColRes = await pool.query(checkFeedbackSentSql);
    if (checkColRes.rows.length === 0) {
      console.log("Migration: Adding 'feedback_sent' column to 'bookings' table...");
      await pool.query("ALTER TABLE bookings ADD COLUMN feedback_sent INTEGER DEFAULT 0");
    }
  } catch (err) {
    console.error('Error during database auto-initialization:', err);
    throw err;
  }
};

module.exports = {
  pool,
  dbQuery,
  initDatabase
};
