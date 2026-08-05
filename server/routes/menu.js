const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================================
// --- MENU ---
// ============================================================

// Barcha menu itemlarni olish — public
router.get('/', (req, res) => {
  db.all('SELECT * FROM menu_items', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = rows.map(r => {
      let parsedVariants = [];
      if (r.variants) {
        try {
          parsedVariants = typeof r.variants === 'string' ? JSON.parse(r.variants) : r.variants;
        } catch (e) {}
      }
      return { ...r, variants: parsedVariants };
    });
    res.json(formatted);
  });
});

// Yangi menu item qo'shish — faqat admin
router.post('/', (req, res) => {
  const { name, name_ru, description, description_ru, price, category, emoji, color, weight, available, variants } = req.body;
  if (!name || !price || !category) return res.status(400).json({ error: 'name, price, category majburiy' });
  const variantsStr = typeof variants === 'string' ? variants : JSON.stringify(variants || []);
  const sql = `INSERT INTO menu_items (name, name_ru, description, description_ru, price, category, emoji, color, weight, available, variants) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.run(
    sql,
    [name, name_ru || '', description, description_ru || '', price, category, emoji, color, weight, available === undefined ? true : !!available, variantsStr],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

// Menu itemni yangilash — faqat admin
router.put('/:id', (req, res) => {
  const { name, name_ru, description, description_ru, price, category, emoji, color, weight, available, variants } = req.body;
  const variantsStr = typeof variants === 'string' ? variants : JSON.stringify(variants || []);
  const sql = `UPDATE menu_items SET name=?, name_ru=?, description=?, description_ru=?, price=?, category=?, emoji=?, color=?, weight=?, available=?, variants=? WHERE id=?`;
  db.run(
    sql,
    [name, name_ru || '', description, description_ru || '', price, category, emoji, color, weight, !!available, variantsStr, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: req.params.id });
    }
  );
});

// Menu itemni o'chirish — faqat admin
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM menu_items WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Toggle menu item availability
router.patch('/:id/toggle-available', (req, res) => {
  db.get('SELECT available FROM menu_items WHERE id=?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Topilmadi' });
    const newAvailable = !row.available;
    db.run('UPDATE menu_items SET available=? WHERE id=?', [newAvailable, req.params.id], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true, available: newAvailable });
    });
  });
});

// Set discount on menu item — faqat admin
router.patch('/:id/discount', (req, res) => {
  const { discount_percent } = req.body;
  const pct = parseInt(discount_percent, 10);
  if (isNaN(pct) || pct < 0 || pct > 99) {
    return res.status(400).json({ error: 'discount_percent 0-99 orasida bo\'lishi kerak' });
  }
  // discount_percent ustuni migration'da qo'shilgan (startup migration orqali)
  db.run('UPDATE menu_items SET discount_percent=? WHERE id=?', [pct, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, discount_percent: pct });
  });
});

// ============================================================
// --- RECIPE (Ingredients) ---
// ============================================================

// Menu item ingredientlarini olish — faqat staff
router.get('/:id/ingredients', (req, res) => {
  db.all(
    `SELECT ri.id, ri.inventory_id, ri.amount, i.name, i.unit 
     FROM recipe_ingredients ri 
     JOIN inventory i ON ri.inventory_id = i.id 
     WHERE ri.menu_item_id = ?`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Ingredient qo'shish — faqat admin
router.post('/:id/ingredients', (req, res) => {
  const { inventory_id, amount } = req.body;
  db.run(
    'INSERT INTO recipe_ingredients (menu_item_id, inventory_id, amount) VALUES (?, ?, ?)',
    [req.params.id, inventory_id, amount],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, menu_item_id: req.params.id, inventory_id, amount });
    }
  );
});

// Ingredient o'chirish — faqat admin
router.delete('/ingredients/:id', (req, res) => {
  db.run('DELETE FROM recipe_ingredients WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
