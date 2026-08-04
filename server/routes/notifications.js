const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================================
// --- NOTIFICATIONS ---
// ============================================================

router.get('/', (req, res) => {
  db.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.put('/:id/read', (req, res) => {
  db.run(
    'UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

module.exports = router;
