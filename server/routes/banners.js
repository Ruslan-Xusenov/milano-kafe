const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================================
// --- BANNERS ---
// ============================================================

// Barcha bannerlarni olish — public
router.get('/', (req, res) => {
  db.all('SELECT * FROM banners', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Yangi banner qo'shish — faqat admin
router.post('/', (req, res) => {
  const { title, subtitle, bg_color, text_color, sub_text_color, emoji1, emoji2, emoji3, link_type, link_id } = req.body;
  db.run(
    'INSERT INTO banners (title, subtitle, bg_color, text_color, sub_text_color, emoji1, emoji2, emoji3, link_type, link_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [title, subtitle, bg_color, text_color, sub_text_color, emoji1, emoji2, emoji3, link_type || 'none', link_id || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

// Bannerni yangilash — faqat admin
router.put('/:id', (req, res) => {
  const { title, subtitle, bg_color, text_color, sub_text_color, emoji1, emoji2, emoji3, link_type, link_id } = req.body;
  db.run(
    'UPDATE banners SET title=?, subtitle=?, bg_color=?, text_color=?, sub_text_color=?, emoji1=?, emoji2=?, emoji3=?, link_type=?, link_id=? WHERE id=?',
    [title, subtitle, bg_color, text_color, sub_text_color, emoji1, emoji2, emoji3, link_type || 'none', link_id || null, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: req.params.id });
    }
  );
});

// Bannerni o'chirish — faqat admin
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM banners WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
