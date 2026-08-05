const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

// ============================================================
// --- STAFF ---
// ============================================================

// Barcha xodimlarni olish — faqat staff
router.get('/', (req, res) => {
  // password maydoni qaytarilmaydi
  db.all(
    `SELECT s.id, s.name, s.role, s.phone, s.username, s.salary,
      COALESCE((SELECT SUM(earned) FROM work_sessions w WHERE w.staff_id = s.id AND to_char(w.start_time, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM')), 0) as current_month_earned
    FROM staff s`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Yangi xodim qo'shish — faqat admin
router.post('/', async (req, res) => {
  const { name, role, phone, username, password, salary } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'name, username, password majburiy' });
  }

  // Role whitelist — superadmin faqat boshqa superadmin tomonidan yaratilishi mumkin emas
  const requestorRole = req.user?.role?.toLowerCase();
  const finalRole = role || 'waiter';

  if (!['waiter', 'cashier', 'admin', 'superadmin'].includes(finalRole)) {
    return res.status(400).json({ error: 'Noto\'g\'ri rol' });
  }
  if (finalRole === 'superadmin' && requestorRole !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmin yaratishga ruxsat yo\'q' });
  }
  if (finalRole === 'admin' && requestorRole !== 'superadmin') {
    return res.status(403).json({ error: 'Admin yaratish uchun superadmin huquqi kerak' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    db.run(
      'INSERT INTO staff (name, role, phone, username, password, salary) VALUES (?, ?, ?, ?, ?, ?)',
      [name, finalRole, phone, username, hashedPassword, salary || 0],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Bu username band' });
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, name, role: finalRole, phone, username, salary });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// Xodimni o'chirish — faqat admin
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM staff WHERE id=?', req.params.id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ============================================================
// --- WORK SESSIONS ---
// ============================================================

// Joriy sessiyani olish — faqat staff
router.get('/work-sessions/current/:staffId', (req, res) => {
  db.get('SELECT * FROM work_sessions WHERE staff_id = ? AND end_time IS NULL', [req.params.staffId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || null);
  });
});

// Sessiyani boshlash — faqat staff
router.post('/work-sessions/start', (req, res) => {
  const { staff_id } = req.body;
  const requestorRole = req.user?.role?.toLowerCase();
  // IDOR: faqat o'zining sessionini boshlashi mumkin (admin istisnosi bilan)
  if (!['admin', 'superadmin', 'owner', 'boss'].includes(requestorRole) && Number(req.user?.id) !== Number(staff_id)) {
    return res.status(403).json({ error: 'Faqat o\'z sessioningizni boshqarish mumkin' });
  }
  db.run('INSERT INTO work_sessions (staff_id) VALUES (?)', [staff_id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, staff_id });
  });
});

// Sessiyani tugatish — faqat staff
router.post('/work-sessions/end', (req, res) => {
  const { id, staff_id } = req.body;
  const requestorRole = req.user?.role?.toLowerCase();
  // IDOR: faqat o'zining sessionini tugatishi mumkin (admin istisnosi bilan)
  if (!['admin', 'superadmin', 'owner', 'boss'].includes(requestorRole) && Number(req.user?.id) !== Number(staff_id)) {
    return res.status(403).json({ error: 'Faqat o\'z sessioningizni boshqarish mumkin' });
  }
  db.get('SELECT salary FROM staff WHERE id = ?', [staff_id], (err, staff) => {
    if (err) return res.status(500).json({ error: err.message });
    const hourlyWage = staff?.salary || 0;
    db.run(
      `UPDATE work_sessions 
       SET end_time = NOW(), 
           earned = EXTRACT(EPOCH FROM (NOW() - start_time)) / 3600.0 * ?
       WHERE id = ? AND end_time IS NULL`,
      [hourlyWage, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  });
});

// Oylik daromadni olish — faqat staff
router.get('/work-sessions/earned/:staffId', (req, res) => {
  db.get(
    `SELECT COALESCE(SUM(earned), 0) as total_earned 
     FROM work_sessions 
     WHERE staff_id = ? AND to_char(start_time, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM')`,
    [req.params.staffId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    }
  );
});

module.exports = router;
