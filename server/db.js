const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'cafebot.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      phone TEXT,
      items TEXT,
      total INTEGER,
      status TEXT DEFAULT 'new',
      address TEXT,
      printed INTEGER DEFAULT 0,
      user_id INTEGER,
      is_rated INTEGER DEFAULT 0,
      cashback_used INTEGER DEFAULT 0,
      cashback_earned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password TEXT,
      google_id TEXT,
      telegram_id TEXT,
      role TEXT DEFAULT 'client',
      cashback_balance INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rating INTEGER,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Add user_id to orders table if it doesn't exist
    db.run(`ALTER TABLE orders ADD COLUMN user_id INTEGER`, (err) => {
      if (!err) console.log('Added user_id column to orders table.');
    });
    
    // Add is_rated to orders table if it doesn't exist
    db.run(`ALTER TABLE orders ADD COLUMN is_rated INTEGER DEFAULT 0`, (err) => {
      if (!err) console.log('Added is_rated column to orders table.');
    });

    // Add cashback columns
    db.run(`ALTER TABLE users ADD COLUMN cashback_balance INTEGER DEFAULT 0`, (err) => {
      if (!err) console.log('Added cashback_balance column to users table.');
    });
    db.run(`ALTER TABLE orders ADD COLUMN cashback_used INTEGER DEFAULT 0`, (err) => {
      if (!err) console.log('Added cashback_used column to orders table.');
    });
    db.run(`ALTER TABLE orders ADD COLUMN cashback_earned INTEGER DEFAULT 0`, (err) => {
      if (!err) console.log('Added cashback_earned column to orders table.');
    });
  }
});

module.exports = db;
