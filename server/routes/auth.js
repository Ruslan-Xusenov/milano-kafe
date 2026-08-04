const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db');
const tokenStore = require('../tokenStore');
const { sendSecurityAlertToUser } = require('../bot');

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy_client_id';
const BOT_TOKEN = process.env.BOT_TOKEN;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ============================================================
// --- STAFF AUTH ---
// ============================================================

// Staff login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username va password majburiy' });

  db.get('SELECT id, name, role, username, salary, password FROM staff WHERE username = ?', [username], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: "Login yoki parol noto'g'ri" });

    if (!row.password || !row.password.startsWith('$2')) {
      return res.status(401).json({ error: 'Xavfsizlik talablari yangilandi. Iltimos adminga murojaat qilib parolingizni yangilang.' });
    }

    const isValid = await bcrypt.compare(password, row.password);
    if (!isValid) return res.status(401).json({ error: "Login yoki parol noto'g'ri" });

    const { password: _, ...staffData } = row;
    const token = jwt.sign({ id: row.id, role: row.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: staffData, token });
  });
});

// ============================================================
// --- CLIENT AUTH ---
// ============================================================

// Client register
router.post('/client/register', async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)`;

    db.run(sql, [name, email, phone || null, hashedPassword], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed: users.email') || err.message.includes('users_email')) {
          return res.status(400).json({ error: "Bu email avval ro'yxatdan o'tgan" });
        }
        if (err.message.includes('UNIQUE constraint failed: users.phone') || err.message.includes('users_phone')) {
          return res.status(400).json({ error: "Bu telefon raqam avval ro'yxatdan o'tgan" });
        }
        return res.status(500).json({ error: err.message });
      }

      const user = { id: this.lastID, name, email, phone, role: 'client' };
      const token = jwt.sign({ id: user.id, role: 'client' }, JWT_SECRET, { expiresIn: '30d' });
      res.status(201).json({ user, token });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi yuz berdi' });
  }
});

// Client login (email yoki phone bilan)
router.post('/client/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email va parolni kiriting' });
  }

  db.get('SELECT * FROM users WHERE email = ? OR phone = ?', [email, email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });

    if (!user.password) {
      if (user.google_id || user.telegram_id) {
        return res.status(401).json({ error: "Siz avval Google yoki Telegram orqali kirgansiz. O'sha orqali kiring." });
      }
      return res.status(401).json({ error: "Parol o'rnatilmagan. Iltimos parolni tiklang yoki qaytadan ro'yxatdan o'ting." });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: "Parol noto'g'ri" });

    const { password: _, ...userData } = user;
    const token = jwt.sign({ id: user.id, role: user.role || 'client' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user: userData, token });
  });
});

// Google OAuth login
router.post('/client/google', async (req, res) => {
  const { idToken, accessToken } = req.body;
  try {
    let payload;
    if (idToken) {
      const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } else if (accessToken) {
      const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      payload = await response.json();
      payload.sub = payload.id;
    } else {
      return res.status(400).json({ error: 'Token topilmadi' });
    }

    const { sub: google_id, email, name } = payload;
    if (!google_id || !email) {
      return res.status(400).json({ error: "Google ma'lumotlari to'liq emas" });
    }

    db.get('SELECT * FROM users WHERE google_id = ? OR email = ?', [google_id, email], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });

      if (user) {
        if (!user.google_id) {
          db.run('UPDATE users SET google_id = ? WHERE id = ?', [google_id, user.id]);
        }
        const { password: _, ...userData } = user;
        const token = jwt.sign({ id: user.id, role: user.role || 'client' }, JWT_SECRET, { expiresIn: '30d' });
        return res.json({ user: userData, token });
      } else {
        db.run('INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)', [name, email, google_id], function (err) {
          if (err) return res.status(500).json({ error: err.message });
          const newUser = { id: this.lastID, name, email, google_id, role: 'client' };
          const token = jwt.sign({ id: newUser.id, role: 'client' }, JWT_SECRET, { expiresIn: '30d' });
          res.status(201).json({ user: newUser, token });
        });
      }
    });
  } catch (err) {
    res.status(401).json({ error: "Google tokenni tasdiqlab bo'lmadi" });
  }
});

// Telegram Widget auth (hash-verified)
router.post('/client/telegram', (req, res) => {
  const data = req.body;
  const { hash, ...authData } = data;

  if (!hash) return res.status(400).json({ error: 'Telegram Hash topilmadi' });
  if (!BOT_TOKEN) return res.status(500).json({ error: 'Serverda Telegram Bot Token topilmadi' });

  // auth_date expiry tekshiruvi — 5 daqiqadan eski tokenlar rad etiladi
  const authDate = parseInt(authData.auth_date);
  if (!authDate || (Math.floor(Date.now() / 1000) - authDate) > 300) {
    return res.status(401).json({ error: 'Telegram autentifikatsiya muddati tugagan. Qaytadan kiring.' });
  }

  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
  const dataCheckString = Object.keys(authData).sort().map(key => `${key}=${authData[key]}`).join('\n');
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (hmac !== hash) {
    return res.status(401).json({ error: "Telegram ma'lumotlari haqiqiy emas" });
  }

  const { id: telegram_id, first_name, last_name, username } = authData;
  const name = `${first_name || ''} ${last_name || ''}`.trim() || username || 'Telegram Foydalanuvchisi';

  db.get('SELECT * FROM users WHERE telegram_id = ?', [telegram_id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    if (user) {
      const { password: _, ...userData } = user;
      const token = jwt.sign({ id: user.id, role: user.role || 'client' }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ user: userData, token });
    } else {
      db.run('INSERT INTO users (name, telegram_id) VALUES (?, ?)', [name, telegram_id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        const newUser = { id: this.lastID, name, telegram_id, role: 'client' };
        const token = jwt.sign({ id: newUser.id, role: 'client' }, JWT_SECRET, { expiresIn: '30d' });
        res.status(201).json({ user: newUser, token });
      });
    }
  });
});

// ============================================================
// --- TELEGRAM BOT LOGIN FLOW (DB-backed tokenStore) ---
// ============================================================

// Bir martalik login token yaratish — DB'ga saqlandi
router.post('/telegram/init-login', async (req, res) => {
  const token = crypto.randomBytes(10).toString('hex');
  await tokenStore.set(token, 'telegram_login', {}, 10 * 60 * 1000); // 10 daqiqa
  res.json({ token });
});

// Telegram phone verification code bilan login
router.post('/client/telegram/verify', async (req, res) => {
  const { code, device, os, location, time } = req.body;
  if (!code) return res.status(400).json({ error: 'Kodni kiriting' });

  // DB'dan o'qib o'chirish (consume=true)
  const authData = await tokenStore.get(code, true);
  if (!authData) {
    return res.status(400).json({ error: "Kod noto'g'ri yoki vaqti o'tib ketgan" });
  }

  const { telegram_id, first_name, last_name, username, phone } = authData;
  const name = `${first_name || ''} ${last_name || ''}`.trim() || username || 'Telegram Foydalanuvchisi';

  let query = 'SELECT * FROM users WHERE telegram_id = ?';
  let params = [telegram_id];

  if (phone) {
    query = 'SELECT * FROM users WHERE telegram_id = ? OR phone = ?';
    params = [telegram_id, phone];
  }

  db.get(query, params, (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    if (user) {
      let updates = [];
      let updateParams = [];
      if (!user.telegram_id && telegram_id) {
        updates.push('telegram_id = ?');
        updateParams.push(telegram_id);
        user.telegram_id = telegram_id;
      }
      if (!user.phone && phone) {
        updates.push('phone = ?');
        updateParams.push(phone);
        user.phone = phone;
      }
      if (updates.length > 0) {
        updateParams.push(user.id);
        db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, updateParams);
      }

      const { password: _, ...userData } = user;
      const jwtToken = jwt.sign({ id: user.id, role: user.role || 'client' }, JWT_SECRET, { expiresIn: '30d' });

      sendSecurityAlertToUser(telegram_id, { device, os, location, time });

      return res.json({ status: 'success', user: userData, token: jwtToken });
    } else {
      db.run('INSERT INTO users (name, telegram_id, phone) VALUES (?, ?, ?)', [name, telegram_id, phone || null], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        const newUser = { id: this.lastID, name, telegram_id, phone: phone || null, role: 'client' };
        const jwtToken = jwt.sign({ id: newUser.id, role: 'client' }, JWT_SECRET, { expiresIn: '30d' });

        sendSecurityAlertToUser(telegram_id, { device, os, location, time });

        res.status(201).json({ status: 'success', user: newUser, token: jwtToken });
      });
    }
  });
});

// ============================================================
// --- CLIENT PROFILE ---
// ============================================================

// Profil ma'lumotlarini yangilash — faqat o'zi
router.put('/client/update', (req, res) => {
  const { id, name, phone, email, birthday } = req.body;
  if (!id) return res.status(400).json({ error: 'Foydalanuvchi IDsi kerak' });

  // IDOR fix
  if (req.user.id !== parseInt(id)) {
    return res.status(403).json({ error: 'Ruxsat yo\'q' });
  }

  db.run(
    'UPDATE users SET name = ?, phone = ?, email = ?, birthday = ? WHERE id = ?',
    [name, phone, email, birthday || null, id],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed: users.email') || err.message.includes('users_email')) {
          return res.status(400).json({ error: 'Bu email allaqachon band' });
        }
        if (err.message.includes('UNIQUE constraint failed: users.phone') || err.message.includes('users_phone')) {
          return res.status(400).json({ error: 'Bu raqam allaqachon band' });
        }
        return res.status(500).json({ error: err.message });
      }

      db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        const { password: _, ...userData } = user;
        res.json(userData);
      });
    }
  );
});

// O'zining profil ma'lumotlarini olish — IDOR fix
router.get('/client/me/:id', (req, res) => {
  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Ruxsat yo\'q' });
  }
  db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    const { password: _, ...userData } = user;
    res.json(userData);
  });
});

module.exports = router;
