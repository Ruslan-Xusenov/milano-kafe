const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://kali@localhost/cafebot',
});

// Helper to convert SQLite ? to PostgreSQL $1, $2, etc.
function convertQuery(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

function normalizeParams(params) {
  if (params === undefined || params === null) {
    return [];
  }
  if (!Array.isArray(params)) {
    return [params];
  }
  return params;
}

const db = {
  run: (sql, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    params = normalizeParams(params);
    let pgSql = convertQuery(sql);
    let isInsert = false;
    
    if (/^\s*INSERT\s+INTO/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
      pgSql += ' RETURNING id';
      isInsert = true;
    }
    
    pool.query(pgSql, params, (err, result) => {
      if (err) {
        if (callback) callback(err);
        return;
      }
      const context = {};
      if (isInsert && result.rows && result.rows.length > 0) {
        context.lastID = result.rows[0].id;
      }
      if (callback) callback.call(context, null);
    });
  },
  
  get: (sql, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    params = normalizeParams(params);
    const pgSql = convertQuery(sql);
    pool.query(pgSql, params, (err, result) => {
      if (err) {
        if (callback) callback(err, null);
        return;
      }
      if (callback) callback(null, result.rows[0] || null);
    });
  },
  
  all: (sql, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    params = normalizeParams(params);
    const pgSql = convertQuery(sql);
    pool.query(pgSql, params, (err, result) => {
      if (err) {
        if (callback) callback(err, null);
        return;
      }
      if (callback) callback(null, result.rows);
    });
  },
  
  prepare: (sql) => {
    const pgSql = convertQuery(sql);
    return {
      run: (p1, p2, cb) => {
        let q = pgSql;
        if (q.includes('INSERT OR REPLACE INTO settings')) {
          q = `INSERT INTO settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`;
        }
        pool.query(q, [p1, p2], (err) => {
          if (cb) cb(err);
        });
      },
      finalize: () => {}
    };
  },

  /**
   * Run multiple queries in a single PostgreSQL transaction.
   * @param {function(txDb): Promise<any>} asyncCallback - Receives a tx-bound db object.
   *        Must return a Promise. On rejection, transaction is rolled back automatically.
   * @returns {Promise<any>} Resolves with the callback's return value.
   */
  transaction: async (asyncCallback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Provide a db-compatible object that uses the dedicated transaction client
      const txDb = {
        run: (sql, params, callback) => {
          if (typeof params === 'function') { callback = params; params = []; }
          params = normalizeParams(params);
          let pgSql = convertQuery(sql);
          let isInsert = false;
          if (/^\s*INSERT\s+INTO/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
            pgSql += ' RETURNING id';
            isInsert = true;
          }
          return client.query(pgSql, params).then(result => {
            const ctx = {};
            if (isInsert && result.rows && result.rows.length > 0) ctx.lastID = result.rows[0].id;
            if (callback) callback.call(ctx, null);
            return ctx;
          }).catch(err => {
            if (callback) callback(err);
            throw err;
          });
        },
        get: (sql, params, callback) => {
          if (typeof params === 'function') { callback = params; params = []; }
          params = normalizeParams(params);
          const pgSql = convertQuery(sql);
          return client.query(pgSql, params).then(result => {
            const row = result.rows[0] || null;
            if (callback) callback(null, row);
            return row;
          }).catch(err => {
            if (callback) callback(err, null);
            throw err;
          });
        },
        all: (sql, params, callback) => {
          if (typeof params === 'function') { callback = params; params = []; }
          params = normalizeParams(params);
          const pgSql = convertQuery(sql);
          return client.query(pgSql, params).then(result => {
            if (callback) callback(null, result.rows);
            return result.rows;
          }).catch(err => {
            if (callback) callback(err, null);
            throw err;
          });
        },
        // Raw client query (for FOR UPDATE, etc.)
        query: (sql, params) => client.query(convertQuery(sql), normalizeParams(params)),
      };

      const result = await asyncCallback(txDb);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

console.log('Connected to the PostgreSQL database.');

module.exports = db;
