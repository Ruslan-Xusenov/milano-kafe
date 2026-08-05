/**
 * tokenStore.js — PostgreSQL-backed temporary token storage
 * Replaces global.telegramLoginTokens and global.telegramVerificationCodes
 *
 * Schema (created by startup migration):
 *   CREATE TABLE temp_tokens (
 *     token TEXT PRIMARY KEY,
 *     type  TEXT NOT NULL,
 *     data  JSONB,
 *     expires_at BIGINT NOT NULL
 *   );
 */

const db = require('./db');

const tokenStore = {
  /**
   * Save a token with associated data and TTL (ms)
   * @param {string} token
   * @param {string} type - 'telegram_login' | 'telegram_verify'
   * @param {object} data
   * @param {number} ttlMs - time to live in milliseconds
   */
  set: async (token, type, data, ttlMs) => {
    const expiresAt = Date.now() + ttlMs;
    await db.transaction(async (tx) => {
      // Upsert (on conflict replace)
      await tx.query(
        `INSERT INTO temp_tokens (token, type, data, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (token) DO UPDATE
           SET type = EXCLUDED.type,
               data = EXCLUDED.data,
               expires_at = EXCLUDED.expires_at`,
        [token, type, JSON.stringify(data), expiresAt]
      );
    });
  },

  /**
   * Get and optionally delete a token
   * Returns null if not found or expired
   * @param {string} token
   * @param {boolean} consume - if true, delete after reading
   */
  get: async (token, consume = false) => {
    const result = await db.transaction(async (tx) => {
      const row = await tx.query(
        'SELECT token, type, data, expires_at FROM temp_tokens WHERE token = $1',
        [token]
      ).then(r => r.rows[0]);

      if (!row) return null;

      // Check expiry
      if (Date.now() > row.expires_at) {
        await tx.query('DELETE FROM temp_tokens WHERE token = $1', [token]);
        return null;
      }

      if (consume) {
        await tx.query('DELETE FROM temp_tokens WHERE token = $1', [token]);
      }

      return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    });
    return result;
  },

  /**
   * Delete a token explicitly
   */
  del: async (token) => {
    await db.transaction(async (tx) => {
      await tx.query('DELETE FROM temp_tokens WHERE token = $1', [token]);
    });
  },

  /**
   * Cleanup expired tokens — run periodically
   */
  cleanup: async () => {
    try {
      await db.transaction(async (tx) => {
        const result = await tx.query('DELETE FROM temp_tokens WHERE expires_at < $1', [Date.now()]);
        if (result.rowCount > 0) {
          console.log(`[tokenStore] Cleaned up ${result.rowCount} expired tokens`);
        }
      });
    } catch (err) {
      console.error('[tokenStore] Cleanup error:', err.message);
    }
  },
};

// Cleanup expired tokens every 10 minutes
setInterval(tokenStore.cleanup, 10 * 60 * 1000);

module.exports = tokenStore;