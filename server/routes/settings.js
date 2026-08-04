const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================================
// --- SETTINGS ---
// ============================================================

// Barcha sozlamalarni olish — public
router.get('/', (req, res) => {
  db.all('SELECT * FROM settings', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const settings = {};
    rows.forEach(r => (settings[r.setting_key] = r.setting_value));
    res.json(settings);
  });
});

// Sozlamalarni yangilash — faqat admin
router.put('/', (req, res) => {
  const settings = req.body;
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (setting_key, setting_value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(settings)) {
    stmt.run(key, value);
  }
  stmt.finalize();
  res.json({ success: true });
});

module.exports = router;
