const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================================
// --- CATEGORIES ---
// ============================================================

// Barcha kategoriyalarni olish — public
router.get('/', (req, res) => {
  db.all('SELECT * FROM categories', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Yangi kategoriya qo'shish — faqat admin
router.post('/', (req, res) => {
  const { name, name_ru, emoji, color, bg, available, is_quick } = req.body;
  db.run(
    'INSERT INTO categories (name, name_ru, emoji, color, bg, available, is_quick) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, name_ru || '', emoji, color || 'text-gray-500', bg || 'bg-gray-100', available === undefined ? true : !!available, !!is_quick],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

// Kategoriyani yangilash — faqat admin
router.put('/:id', (req, res) => {
  const { name, name_ru, emoji, color, bg, available, is_quick } = req.body;
  db.run(
    'UPDATE categories SET name=?, name_ru=?, emoji=?, color=?, bg=?, available=?, is_quick=? WHERE id=?',
    [name, name_ru || '', emoji, color, bg, !!available, !!is_quick, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: req.params.id });
    }
  );
});

// Kategoriyani o'chirish — faqat admin
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM categories WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Toggle category availability — faqat admin
router.patch('/:id/toggle-available', (req, res) => {
  db.get('SELECT available FROM categories WHERE id=?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Topilmadi' });
    const newAvailable = !row.available;
    db.run('UPDATE categories SET available=? WHERE id=?', [newAvailable, req.params.id], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true, available: newAvailable });
    });
  });
});

module.exports = router;
