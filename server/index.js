require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const db = require('./db');
const { sendOrderToTelegram, sendStatusUpdateToTelegram, sendSecurityAlertToUser } = require('./bot');
const { printReceipt } = require('./printer');

const JWT_SECRET = process.env.JWT_SECRET || 'milano_kafe_super_secret_key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy_client_id';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const BOT_TOKEN = process.env.BOT_TOKEN;

const app = express();
app.use(cors());
app.use(express.json());

// Barcha buyurtmalarni olish
app.get('/api/orders', (req, res) => {
  db.all("SELECT * FROM orders ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Parse items from JSON string
    const orders = rows.map(row => ({
      ...row,
      items: JSON.parse(row.items)
    }));
    res.json(orders);
  });
});

// Yangi buyurtma yaratish
app.post('/api/orders', (req, res) => {
  const { customer_name, phone, items, total, address, user_id, cashback_used } = req.body;
  const itemsJson = JSON.stringify(items);
  let usedAmount = parseInt(cashback_used) || 0;
  
  const insertOrder = (earned, used) => {
    const sql = `INSERT INTO orders (customer_name, phone, items, total, status, address, user_id, cashback_used, cashback_earned) VALUES (?, ?, ?, ?, 'new', ?, ?, ?, ?)`;
    db.run(sql, [customer_name, phone, itemsJson, total, address || 'Kiritilmagan', user_id || null, used, earned], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const newOrder = {
        id: this.lastID,
        customer_name,
        phone,
        items,
        total,
        address: address || 'Kiritilmagan',
        status: 'new',
        user_id,
        cashback_used: used,
        cashback_earned: earned
      };
      
      // Telegramga xabar yuborish
      sendOrderToTelegram(newOrder);
      res.status(201).json(newOrder);
    });
  };

  if (user_id) {
    db.get("SELECT cashback_balance FROM users WHERE id = ?", [user_id], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return insertOrder(0, 0);

      const maxUsable = Math.floor(total / 2);
      if (usedAmount > user.cashback_balance || usedAmount > maxUsable) {
         usedAmount = Math.min(user.cashback_balance || 0, maxUsable);
      }

      let earnedAmount = 0;
      // Keshbek endi to'langan summa (total - usedAmount) asosida beriladi
      const paidAmount = total - usedAmount;
      if (paidAmount > 0) {
        if (paidAmount >= 999000) earnedAmount = Math.floor(paidAmount * 0.06);
        else if (paidAmount >= 599000) earnedAmount = Math.floor(paidAmount * 0.05);
        else if (paidAmount >= 299000) earnedAmount = Math.floor(paidAmount * 0.04);
        else if (paidAmount >= 99000) earnedAmount = Math.floor(paidAmount * 0.03);
        else earnedAmount = Math.floor(paidAmount * 0.02); // 99,000 dan kam bo'lsa 2% keshbek
      }

      db.run("UPDATE users SET cashback_balance = cashback_balance - ? + ? WHERE id = ?", [usedAmount, earnedAmount, user_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        insertOrder(earnedAmount, usedAmount);
      });
    });
  } else {
    insertOrder(0, 0);
  }
});

// Foydalanuvchining o'z buyurtmalarini olish
app.get('/api/orders/user/:id', (req, res) => {
  db.all("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const orders = rows.map(row => ({
      ...row,
      items: JSON.parse(row.items)
    }));
    res.json(orders);
  });
});

// Bajarilgan buyurtmani anonim baholash
app.post('/api/orders/:id/rate', (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  
  // Tekshirish: buyurtma haqiqatan mavjudmi va oldin baholanmaganmi
  db.get("SELECT is_rated, status FROM orders WHERE id = ?", [id], (err, order) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!order) return res.status(404).json({ error: "Buyurtma topilmadi" });
    if (order.status !== 'completed') return res.status(400).json({ error: "Faqat bajarilgan buyurtmalarni baholash mumkin" });
    if (order.is_rated === 1) return res.status(400).json({ error: "Bu buyurtma allaqachon baholangan" });
    
    // Anonim reviews jadvaliga yozish
    db.run("INSERT INTO reviews (rating, comment) VALUES (?, ?)", [rating, comment || ''], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Orders jadvalida is_rated ni 1 qilish
      db.run("UPDATE orders SET is_rated = 1 WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: 'success', message: 'Baholandi' });
      });
    });
  });
});

// Admin uchun barcha anonim baholarni olish
app.get('/api/reviews', (req, res) => {
  db.all("SELECT * FROM reviews ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Buyurtma holatini yangilash
app.put('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'new', 'preparing', 'delivering', 'completed', 'rejected'

  const sql = `UPDATE orders SET status = ? WHERE id = ?`;
  db.run(sql, [status, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // Agar buyurtma yakunlangan bo'lsa, ombordan mahsulotlarni ayirib tashlash
    if (status === 'completed') {
      db.get(`SELECT items FROM orders WHERE id = ?`, [id], (err, row) => {
        if (!err && row && row.items) {
          try {
            const items = JSON.parse(row.items);
            items.forEach(item => {
              // Har bir ovqat uchun retseptni olib, ombordan ayirish
              db.all(`SELECT inventory_id, amount FROM recipe_ingredients WHERE menu_item_id = ?`, [item.id], (err, recipes) => {
                if (!err && recipes) {
                  recipes.forEach(recipe => {
                    const decrementAmount = recipe.amount * item.quantity;
                    db.run(`UPDATE inventory SET quantity = quantity - ? WHERE id = ?`, [decrementAmount, recipe.inventory_id]);
                  });
                }
              });
            });
          } catch (e) { console.error("Error parsing order items", e); }
        }
      });
    }

    // Agar buyurtma admin tomonidan tasdiqlansa (preparing)
    if (status === 'preparing') {
      db.get(`SELECT * FROM orders WHERE id = ?`, [id], (err, row) => {
        if (!err && row) {
          printReceipt(row);
        }
      });
    }

    // Agar status yangilangan bo'lsa
    sendStatusUpdateToTelegram(id, status);
    
    res.json({ message: "Status updated", id, status });
  });
});

// Mahalliy Print Client uchun API
app.get('/api/print-jobs', (req, res) => {
  db.all("SELECT * FROM orders WHERE status = 'preparing' AND printed = 0", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Parse items back to JSON
    const parsedRows = rows.map(r => {
        try { r.items = JSON.parse(r.items); } catch(e) {}
        return r;
    });
    res.json(parsedRows);
  });
});

app.post('/api/print-jobs/:id/done', (req, res) => {
  const { id } = req.params;
  db.run("UPDATE orders SET printed = 1 WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// --- MENU API ---
app.get('/api/menu', (req, res) => {
  db.all("SELECT * FROM menu_items", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/menu', (req, res) => {
  const { name, description, price, category, emoji, color, weight, available } = req.body;
  const sql = `INSERT INTO menu_items (name, description, price, category, emoji, color, weight, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.run(sql, [name, description, price, category, emoji, color, weight, available === undefined ? 1 : available], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, ...req.body });
  });
});

app.put('/api/menu/:id', (req, res) => {
  const { name, description, price, category, emoji, color, weight, available } = req.body;
  const sql = `UPDATE menu_items SET name=?, description=?, price=?, category=?, emoji=?, color=?, weight=?, available=? WHERE id=?`;
  db.run(sql, [name, description, price, category, emoji, color, weight, available, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: req.params.id });
  });
});

app.delete('/api/menu/:id', (req, res) => {
  db.run("DELETE FROM menu_items WHERE id=?", req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- STAFF API ---
app.get('/api/staff', (req, res) => {
  db.all(`
    SELECT s.*, 
      COALESCE((SELECT SUM(earned) FROM work_sessions w WHERE w.staff_id = s.id AND strftime('%Y-%m', w.start_time) = strftime('%Y-%m', 'now')), 0) as current_month_earned
    FROM staff s
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/staff', (req, res) => {
  const { name, role, phone, username, password, salary } = req.body;
  db.run("INSERT INTO staff (name, role, phone, username, password, salary) VALUES (?, ?, ?, ?, ?, ?)", 
    [name, role, phone, username, password, salary || 0], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

app.delete('/api/staff/:id', (req, res) => {
  db.run("DELETE FROM staff WHERE id=?", req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- WORK SESSIONS API ---
app.get('/api/work-sessions/current/:staffId', (req, res) => {
  db.get("SELECT * FROM work_sessions WHERE staff_id = ? AND end_time IS NULL", [req.params.staffId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || null);
  });
});

app.post('/api/work-sessions/start', (req, res) => {
  const { staff_id } = req.body;
  db.run("INSERT INTO work_sessions (staff_id) VALUES (?)", [staff_id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, staff_id });
  });
});

app.post('/api/work-sessions/end', (req, res) => {
  const { id, staff_id } = req.body;
  db.get("SELECT salary FROM staff WHERE id = ?", [staff_id], (err, staff) => {
    if (err) return res.status(500).json({ error: err.message });
    const hourlyWage = staff?.salary || 0;
    
    db.run(`
      UPDATE work_sessions 
      SET end_time = CURRENT_TIMESTAMP, 
          earned = (STRFTIME('%s', CURRENT_TIMESTAMP) - STRFTIME('%s', start_time)) / 3600.0 * ?
      WHERE id = ? AND end_time IS NULL
    `, [hourlyWage, id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

app.get('/api/work-sessions/earned/:staffId', (req, res) => {
  db.get(`
    SELECT COALESCE(SUM(earned), 0) as total_earned 
    FROM work_sessions 
    WHERE staff_id = ? AND strftime('%Y-%m', start_time) = strftime('%Y-%m', 'now')
  `, [req.params.staffId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// --- INVENTORY API ---
app.get('/api/inventory', (req, res) => {
  db.all("SELECT * FROM inventory ORDER BY name ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/inventory', (req, res) => {
  const { name, unit, quantity } = req.body;
  db.run("INSERT INTO inventory (name, unit, quantity) VALUES (?, ?, ?)", 
    [name, unit, quantity || 0], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, unit, quantity });
  });
});

app.put('/api/inventory/:id', (req, res) => {
  const { name, unit, quantity } = req.body;
  db.run("UPDATE inventory SET name=?, unit=?, quantity=? WHERE id=?", 
    [name, unit, quantity, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/inventory/:id', (req, res) => {
  db.run("DELETE FROM inventory WHERE id=?", req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- RECIPE API ---
app.get('/api/menu/:id/ingredients', (req, res) => {
  db.all(`
    SELECT ri.id, ri.inventory_id, ri.amount, i.name, i.unit 
    FROM recipe_ingredients ri 
    JOIN inventory i ON ri.inventory_id = i.id 
    WHERE ri.menu_item_id = ?
  `, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/menu/:id/ingredients', (req, res) => {
  const { inventory_id, amount } = req.body;
  db.run("INSERT INTO recipe_ingredients (menu_item_id, inventory_id, amount) VALUES (?, ?, ?)", 
    [req.params.id, inventory_id, amount], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, menu_item_id: req.params.id, inventory_id, amount });
  });
});

app.delete('/api/menu/ingredients/:id', (req, res) => {
  db.run("DELETE FROM recipe_ingredients WHERE id=?", req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- AUTH API (STAFF) ---
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT id, name, role, username, salary FROM staff WHERE username = ? AND password = ?", [username, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
    const token = jwt.sign({ id: row.id, role: row.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: row, token }); 
  });
});

// --- AUTH API (CLIENT) ---
app.post('/api/auth/client/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)`;
    
    db.run(sql, [name, email, phone || null, hashedPassword], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed: users.email')) {
          return res.status(400).json({ error: "Bu email avval ro'yxatdan o'tgan" });
        }
        if (err.message.includes('UNIQUE constraint failed: users.phone')) {
          return res.status(400).json({ error: "Bu telefon raqam avval ro'yxatdan o'tgan" });
        }
        return res.status(500).json({ error: err.message });
      }
      
      const user = { id: this.lastID, name, email, phone, role: 'client' };
      const token = jwt.sign({ id: user.id, role: 'client' }, JWT_SECRET, { expiresIn: '30d' });
      
      res.status(201).json({ user, token });
    });
  } catch (err) {
    res.status(500).json({ error: "Server xatosi yuz berdi" });
  }
});

app.post('/api/auth/client/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email va parolni kiriting" });
  }

  db.get("SELECT * FROM users WHERE email = ? OR phone = ?", [email, email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: "Foydalanuvchi topilmadi" });
    
    // Agar Google yoki Telegram orqali kirilgan bo'lsa va paroli yo'q bo'lsa
    if (!user.password && (user.google_id || user.telegram_id)) {
      return res.status(401).json({ error: "Siz avval Google yoki Telegram orqali kirgansiz. O'sha orqali kiring." });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: "Parol noto'g'ri" });
    
    const { password: _, ...userData } = user; // Parolni yashirish
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    
    res.json({ user: userData, token });
  });
});

app.post('/api/auth/client/google', async (req, res) => {
  const { idToken, accessToken } = req.body;
  try {
    let payload;
    if (idToken) {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } else if (accessToken) {
      const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      payload = await response.json();
      payload.sub = payload.id;
    } else {
      return res.status(400).json({ error: "Token topilmadi" });
    }

    const { sub: google_id, email, name } = payload;
    
    if (!google_id || !email) {
      return res.status(400).json({ error: "Google ma'lumotlari to'liq emas" });
    }
    
    db.get("SELECT * FROM users WHERE google_id = ? OR email = ?", [google_id, email], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (user) {
        if (!user.google_id) {
           db.run("UPDATE users SET google_id = ? WHERE id = ?", [google_id, user.id]);
        }
        const { password: _, ...userData } = user;
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        return res.json({ user: userData, token });
      } else {
        db.run("INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)", [name, email, google_id], function(err) {
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

app.post('/api/auth/client/telegram', (req, res) => {
  const data = req.body;
  const { hash, ...authData } = data;
  
  if (!hash) return res.status(400).json({ error: "Telegram Hash topilmadi" });
  if (!BOT_TOKEN) return res.status(500).json({ error: "Serverda Telegram Bot Token topilmadi" });

  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
  const dataCheckString = Object.keys(authData)
    .sort()
    .map(key => `${key}=${authData[key]}`)
    .join('\n');
    
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  if (hmac !== hash) {
    return res.status(401).json({ error: "Telegram ma'lumotlari haqiqiy emas" });
  }

  const { id: telegram_id, first_name, last_name, username } = authData;
  const name = `${first_name || ''} ${last_name || ''}`.trim() || username || 'Telegram Foydalanuvchisi';

  db.get("SELECT * FROM users WHERE telegram_id = ?", [telegram_id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (user) {
      const { password: _, ...userData } = user;
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ user: userData, token });
    } else {
      db.run("INSERT INTO users (name, telegram_id) VALUES (?, ?)", [name, telegram_id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const newUser = { id: this.lastID, name, telegram_id, role: 'client' };
        const token = jwt.sign({ id: newUser.id, role: 'client' }, JWT_SECRET, { expiresIn: '30d' });
        res.status(201).json({ user: newUser, token });
      });
    }
  });
});

app.post('/api/auth/client/telegram/verify', (req, res) => {
  const { code, device, os, location, time } = req.body;
  if (!code) return res.status(400).json({ error: "Kodni kiriting" });
  
  const authData = global.telegramVerificationCodes?.[code];
  if (!authData) {
    return res.status(400).json({ error: "Kod noto'g'ri yoki yaroqsiz" });
  }

  const { telegram_id, first_name, last_name, username, phone } = authData;
  const name = `${first_name || ''} ${last_name || ''}`.trim() || username || 'Telegram Foydalanuvchisi';

  db.get("SELECT * FROM users WHERE telegram_id = ?", [telegram_id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    
    delete global.telegramVerificationCodes[code]; // Cleanup

    if (user) {
      // Agar bazada raqami bo'lmasa, uni saqlab qo'yamiz
      if (phone && !user.phone) {
         db.run("UPDATE users SET phone = ? WHERE id = ?", [phone, user.id]);
         user.phone = phone;
      }
      const { password: _, ...userData } = user;
      const jwtToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
      
      // Xavfsizlik xabarnomasi yuborish
      sendSecurityAlertToUser(telegram_id, { device, os, location, time });
      
      return res.json({ status: 'success', user: userData, token: jwtToken });
    } else {
      db.run("INSERT INTO users (name, telegram_id, phone) VALUES (?, ?, ?)", [name, telegram_id, phone || null], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const newUser = { id: this.lastID, name, telegram_id, phone: phone || null, role: 'client' };
        const jwtToken = jwt.sign({ id: newUser.id, role: 'client' }, JWT_SECRET, { expiresIn: '30d' });
        
        sendSecurityAlertToUser(telegram_id, { device, os, location, time });
        
        res.status(201).json({ status: 'success', user: newUser, token: jwtToken });
      });
    }
  });
});

app.put('/api/auth/client/update', (req, res) => {
  const { id, name, phone, email } = req.body;
  if (!id) return res.status(400).json({ error: "Foydalanuvchi IDsi kerak" });
  
  db.run("UPDATE users SET name = ?, phone = ?, email = ? WHERE id = ?", [name, phone, email, id], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed: users.email')) {
        return res.status(400).json({ error: "Bu email allaqachon band" });
      }
      if (err.message.includes('UNIQUE constraint failed: users.phone')) {
        return res.status(400).json({ error: "Bu raqam allaqachon band" });
      }
      return res.status(500).json({ error: err.message });
    }
    
    db.get("SELECT * FROM users WHERE id = ?", [id], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      const { password: _, ...userData } = user;
      res.json(userData);
    });
  });
});
app.get('/api/auth/client/me/:id', (req, res) => {
  db.get("SELECT * FROM users WHERE id = ?", [req.params.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    const { password: _, ...userData } = user;
    res.json(userData);
  });
});

// --- CATEGORIES API ---
app.get('/api/categories', (req, res) => {
  db.all("SELECT * FROM categories", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/categories', (req, res) => {
  const { name, emoji, color, bg, available, is_quick } = req.body;
  db.run("INSERT INTO categories (name, emoji, color, bg, available, is_quick) VALUES (?, ?, ?, ?, ?, ?)", 
    [name, emoji, color || 'text-gray-500', bg || 'bg-gray-100', available === undefined ? 1 : available, is_quick ? 1 : 0], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

app.put('/api/categories/:id', (req, res) => {
  const { name, emoji, color, bg, available, is_quick } = req.body;
  db.run("UPDATE categories SET name=?, emoji=?, color=?, bg=?, available=?, is_quick=? WHERE id=?", 
    [name, emoji, color, bg, available, is_quick ? 1 : 0, req.params.id], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: req.params.id });
    }
  );
});

app.delete('/api/categories/:id', (req, res) => {
  db.run("DELETE FROM categories WHERE id=?", req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- BANNERS API ---
app.get('/api/banners', (req, res) => {
  db.all("SELECT * FROM banners", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/banners', (req, res) => {
  const { title, subtitle, bg_color, text_color, sub_text_color, emoji1, emoji2, emoji3, link_type, link_id } = req.body;
  db.run("INSERT INTO banners (title, subtitle, bg_color, text_color, sub_text_color, emoji1, emoji2, emoji3, link_type, link_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
    [title, subtitle, bg_color, text_color, sub_text_color, emoji1, emoji2, emoji3, link_type || 'none', link_id || null], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

app.put('/api/banners/:id', (req, res) => {
  const { title, subtitle, bg_color, text_color, sub_text_color, emoji1, emoji2, emoji3, link_type, link_id } = req.body;
  db.run("UPDATE banners SET title=?, subtitle=?, bg_color=?, text_color=?, sub_text_color=?, emoji1=?, emoji2=?, emoji3=?, link_type=?, link_id=? WHERE id=?", 
    [title, subtitle, bg_color, text_color, sub_text_color, emoji1, emoji2, emoji3, link_type || 'none', link_id || null, req.params.id], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: req.params.id });
    }
  );
});

app.delete('/api/banners/:id', (req, res) => {
  db.run("DELETE FROM banners WHERE id=?", req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});