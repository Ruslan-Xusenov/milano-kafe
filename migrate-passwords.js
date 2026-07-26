/**
 * Staff password migration: plaintext → bcrypt
 * Run once: node server/migrate-passwords.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'server', 'cafebot.db');
const db = new sqlite3.Database(DB_PATH);

console.log('Staff parollarini bcrypt\'ga o\'tkazish boshlandi...\n');

db.all("SELECT id, username, password FROM staff", [], async (err, rows) => {
  if (err) {
    console.error('DB xatosi:', err.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log('Staff topilmadi.');
    db.close();
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row.password && row.password.startsWith('$2')) {
      console.log(`  ✓ ${row.username} — allaqachon hash qilingan, o'tkazib yuborildi`);
      skipped++;
      continue;
    }

    try {
      const hashed = await bcrypt.hash(row.password || '', 12);
      await new Promise((resolve, reject) => {
        db.run("UPDATE staff SET password = ? WHERE id = ?", [hashed, row.id], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log(`  ✓ ${row.username} — muvaffaqiyatli hash qilindi`);
      migrated++;
    } catch (e) {
      console.error(`  ✗ ${row.username} — xatolik:`, e.message);
    }
  }

  console.log(`\nNatija: ${migrated} ta hash qilindi, ${skipped} ta o'tkazib yuborildi.`);
  db.close();
});
