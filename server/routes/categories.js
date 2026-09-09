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

// Kategoriyadagi barcha mahsulotlarga chegirma o'rnatish
router.patch('/:id/discount', (req, res) => {
  const { discount_percent } = req.body;
  const pct = parseInt(discount_percent, 10);
  if (isNaN(pct) || pct < 0 || pct > 99) {
    return res.status(400).json({ error: 'discount_percent 0-99 orasida bo\'lishi kerak' });
  }
  
  db.get('SELECT name FROM categories WHERE id=?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Kategoriya topilmadi' });
    
    db.run('UPDATE menu_items SET discount_percent=? WHERE category=?', [pct, row.name], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true, updated_count: this.changes, discount_percent: pct });
    });
  });
});

module.exports = router;
