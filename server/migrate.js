const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const sqliteDbPath = path.resolve(__dirname, 'cafebot.db');
const sqlite = new sqlite3.Database(sqliteDbPath, sqlite3.OPEN_READONLY);

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://kali@localhost/cafebot',
});

const tables = [
  {
    name: 'users',
    schema: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        phone TEXT UNIQUE,
        password TEXT,
        google_id TEXT,
        telegram_id TEXT,
        role TEXT DEFAULT 'client',
        cashback_balance INTEGER DEFAULT 0,
        push_token TEXT,
        birthday TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
  },
  {
    name: 'orders',
    schema: `
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_name TEXT,
        phone TEXT,
        items TEXT,
        total INTEGER,
        status TEXT DEFAULT 'new',
        address TEXT,
        printed BOOLEAN DEFAULT false,
        user_id INTEGER,
        is_rated INTEGER DEFAULT 0,
        cashback_used INTEGER DEFAULT 0,
        cashback_earned INTEGER DEFAULT 0,
        payment_method TEXT DEFAULT 'naqd',
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
  },
  {
    name: 'menu_items',
    schema: `
      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        name_ru TEXT,
        description TEXT,
        description_ru TEXT,
        price INTEGER NOT NULL,
        category TEXT,
        emoji TEXT,
        color TEXT,
        weight TEXT,
        available BOOLEAN DEFAULT true
      )
    `
  },
  {
    name: 'staff',
    schema: `
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        username TEXT UNIQUE,
        password TEXT,
        phone TEXT,
        salary REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
  },
  {
    name: 'categories',
    schema: `
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        name_ru TEXT,
        emoji TEXT,
        color TEXT,
        bg TEXT,
        available BOOLEAN DEFAULT true,
        is_quick BOOLEAN DEFAULT false
      )
    `
  },
  {
    name: 'inventory',
    schema: `
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        unit TEXT NOT NULL,
        quantity REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
  },
  {
    name: 'recipe_ingredients',
    schema: `
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id SERIAL PRIMARY KEY,
        menu_item_id INTEGER NOT NULL,
        inventory_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        FOREIGN KEY(menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
        FOREIGN KEY(inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
      )
    `
  },
  {
    name: 'work_sessions',
    schema: `
      CREATE TABLE IF NOT EXISTS work_sessions (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL,
        start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        earned REAL DEFAULT 0,
        FOREIGN KEY(staff_id) REFERENCES staff(id) ON DELETE CASCADE
      )
    `
  },
  {
    name: 'banners',
    schema: `
      CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        bg_color TEXT,
        text_color TEXT,
        sub_text_color TEXT,
        emoji1 TEXT,
        emoji2 TEXT,
        emoji3 TEXT,
        link_type TEXT DEFAULT 'none',
        link_id TEXT
      )
    `
  },
  {
    name: 'reviews',
    schema: `
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        rating INTEGER,
        comment TEXT,
        order_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
  },
  {
    name: 'settings',
    schema: `
      CREATE TABLE IF NOT EXISTS settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT
      )
    `
  },
  {
    name: 'notifications',
    schema: `
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        title TEXT,
        body TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
  }
];

async function migrate() {
  console.log("Starting migration to PostgreSQL...");
  const client = await pgPool.connect();

  try {
    // 1. Create tables
    console.log("Creating tables...");
    for (const table of tables) {
      await client.query(table.schema);
      console.log(`Created schema for: ${table.name}`);
    }

    // 2. Copy data
    console.log("Copying data...");
    
    const orderedTables = [
      'users', 'staff', 'categories', 'menu_items', 'inventory', 'banners', 
      'settings', 'reviews', 'orders', 'recipe_ingredients', 'work_sessions'
    ];

    for (const tableName of orderedTables) {
      const rows = await new Promise((resolve, reject) => {
        sqlite.all(`SELECT * FROM ${tableName}`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      if (rows.length === 0) {
        console.log(`No data in ${tableName}, skipping.`);
        continue;
      }

      console.log(`Migrating ${rows.length} rows for ${tableName}...`);
      
      const columns = Object.keys(rows[0]);
      
      for (const row of rows) {
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        // Convert JS booleans from SQLite INTEGER 0/1 to postgres BOOLEAN 
        // if column type requires it. Actually node-pg handles a lot natively.
        const values = columns.map(c => row[c]);

        // Specific conflict handlers for unique constraints
        let conflictClause = 'ON CONFLICT DO NOTHING';
        if (tableName === 'users') {
          conflictClause = 'ON CONFLICT (email) DO NOTHING';
          // Also need phone... PostgreSQL allows only 1 constraint in ON CONFLICT usually.
          // Simplest is DO NOTHING if any conflict happens since it's a migration to empty DB anyway.
          conflictClause = 'ON CONFLICT (id) DO NOTHING'; 
          // wait, users unique on id? Yes, we copy ID. We can just disable ON CONFLICT or use ID.
        }
        if (tableName === 'settings') {
          conflictClause = 'ON CONFLICT (setting_key) DO NOTHING';
        }

        const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ${tableName === 'settings' ? conflictClause : 'ON CONFLICT (id) DO NOTHING'}`;
        
        try {
          await client.query(query, values);
        } catch(e) {
          console.error(`Row error in ${tableName}: ${e.message}`);
        }
      }

      // Update sequence to max id
      if (columns.includes('id')) {
        await client.query(`SELECT setval('${tableName}_id_seq', COALESCE((SELECT MAX(id)+1 FROM ${tableName}), 1), false)`);
      }
    }

    console.log("Migration finished successfully!");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    client.release();
    sqlite.close();
    pgPool.end();
  }
}

migrate();