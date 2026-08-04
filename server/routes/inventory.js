const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================================
// --- INVENTORY ---
// ============================================================

// Barcha inventarni olish — faqat staff
router.get('/', (req, res) => {
  db.all('SELECT * FROM inventory ORDER BY name ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Yangi inventar qo'shish — faqat admin
router.post('/', (req, res) => {
  const { name, unit, quantity } = req.body;
  if (!name || !unit) return res.status(400).json({ error: 'name va unit majburiy' });
  db.run(
    'INSERT INTO inventory (name, unit, quantity) VALUES (?, ?, ?)',
    [name, unit, quantity || 0],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, unit, quantity });
    }
  );
});

// Inventarni yangilash — faqat admin
router.put('/:id', (req, res) => {
  const { name, unit, quantity } = req.body;
  db.run(
    'UPDATE inventory SET name=?, unit=?, quantity=? WHERE id=?',
    [name, unit, quantity, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Inventarni o'chirish — faqat admin
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM inventory WHERE id=?', req.params.id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
