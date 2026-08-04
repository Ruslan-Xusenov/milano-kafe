const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================================
// --- ANALYTICS ---
// ============================================================

// Top 5 mijozlar — faqat staff, sensitive ma'lumotlar olib tashlangan
router.get('/top-customers', (req, res) => {
  const sql = `
    SELECT 
      MAX(o.customer_name) as customer_name, 
      o.phone, 
      SUM(o.total - COALESCE(o.cashback_used, 0)) as total_spent, 
      COUNT(o.id) as order_count,
      MAX(u.id) as user_id,
      MAX(u.telegram_id) as telegram_id,
      MAX(u.push_token) as push_token
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id OR o.phone = u.phone
    WHERE o.status = 'completed' AND (o.payment_method != 'sovga' OR o.payment_method IS NULL)
    GROUP BY o.phone 
    ORDER BY total_spent DESC 
    LIMIT 5
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Sovg'alar hisoboti — kimga qancha sovg'a yuborilgan
router.get('/gifts', (req, res) => {
  const sql = `
    SELECT 
      MAX(o.customer_name) as customer_name, 
      o.phone, 
      COUNT(o.id) as gift_count,
      MAX(o.created_at) as last_gift_date
    FROM orders o
    WHERE o.payment_method = 'sovga' OR o.status = 'Sovg''a yuborildi'
    GROUP BY o.phone 
    ORDER BY gift_count DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
