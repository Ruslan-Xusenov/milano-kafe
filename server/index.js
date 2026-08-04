require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const { sendOrderToTelegram, sendStatusUpdateToTelegram, sendSecurityAlertToUser, bot } = require('./bot');
const { printReceipt } = require('./printer');
const { sendPushNotification } = require('./notifications');

// --- Startup checks ---
if (!process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is not set. Server will not start.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy_client_id';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const BOT_TOKEN = process.env.BOT_TOKEN;

// --- CORS ---
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['https://milano.securehub.uz'];

const app = express();
app.set('trust proxy', 1);
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.) or local development origins
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
}));

// --- Body size limit ---
app.use(express.json({ limit: '100kb' }));

// --- Rate limiting ---
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Increased for Kanban polling
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'So\'rovlar juda ko\'p. 15 daqiqadan so\'ng qayta urinib ko\'ring.' },
  validate: { xForwardedForHeader: false, trustProxy: false }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  legacyHeaders: false,
  message: { error: 'Xavfsizlik nuqtai nazaridan vaqtinchalik cheklov. Keyinroq urinib ko\'ring.' },
  validate: { xForwardedForHeader: false, trustProxy: false }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

app.get('/api/test-ip', (req, res) => {
  res.json({
    ip: req.ip,
    ips: req.ips,
    xff: req.headers['x-forwarded-for'],
    trustProxy: req.app.get('trust proxy'),
    trustProxyFn: !!req.app.get('trust proxy fn')
  });
});

// Public config — bot username va boshqa ommaviy ma'lumotlar
app.get('/api/config', async (req, res) => {
  if (!global.botUsername && process.env.BOT_TOKEN) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getMe`);
      const data = await r.json();
      if (data.ok) global.botUsername = data.result.username;
    } catch (_) {}
  }
  res.json({ bot_username: global.botUsername || null });
});

// Telegram login uchun bir martalik token yaratish
global.telegramLoginTokens = {};
app.post('/api/auth/telegram/init-login', (req, res) => {
  const token = crypto.randomBytes(10).toString('hex');
  global.telegramLoginTokens[token] = { expires: Date.now() + 10 * 60 * 1000 }; // 10 daqiqa
  // Eskirgan tokenlarni tozalash
  const now = Date.now();
  Object.keys(global.telegramLoginTokens).forEach(k => {
    if (global.telegramLoginTokens[k].expires < now) delete global.telegramLoginTokens[k];
  });
  res.json({ token });
});

// ============================================================
// --- AUTH MIDDLEWARE ---
// ============================================================

/**
 * requireAuth(allowedRoles)
 * Checks JWT from Authorization header and verifies role.
 * @param {string[]} allowedRoles - e.g. ['admin','superadmin'] or ['client'] or [] for any authenticated user
 */
function requireAuth(allowedRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Autentifikatsiya talab qilinadi' });
    }
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // { id, role, iat, exp }
      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role?.toLowerCase())) {
        return res.status(403).json({ error: 'Ruxsat yo\'q' });
      }
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Token yaroqsiz yoki muddati o\'tgan' });
    }
  };
}

const requireStaff = requireAuth(['admin', 'superadmin', 'waiter', 'cashier']);
const requireAdmin = requireAuth(['admin', 'superadmin']);
const requireClient = requireAuth(['client']);
const requireAnyAuth = requireAuth([]);

// Token bo'lsa tekshiradi, bo'lmasa anonim sifatida davom etadi
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    // Invalid token — treat as anonymous
  }
  next();
}

// Printer client authentication — X-Printer-Token header bilan
const PRINTER_SECRET = process.env.PRINTER_SECRET;
function requirePrinter(req, res, next) {
  // Also allow staff token as fallback
  const printerToken = req.headers['x-printer-token'];
  if (PRINTER_SECRET && printerToken === PRINTER_SECRET) return next();
  // Fallback: staff JWT
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
      const role = decoded.role?.toLowerCase();
      if (['admin','superadmin','waiter','cashier'].includes(role)) return next();
    } catch (e) {}
  }
  // IP allowlist fallback: localhost printer client
  const clientIp = req.ip || req.connection?.remoteAddress;
  if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1') return next();
  return res.status(401).json({ error: 'Printer autentifikatsiya talab qilinadi' });
}

// ============================================================
// --- ORDERS API ---
// ============================================================

// Barcha buyurtmalarni olish — faqat staff
app.get('/api/orders', requireStaff, (req, res) => {
  db.all("SELECT * FROM orders ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const orders = rows.map(row => ({
      ...row,
      items: JSON.parse(row.items)
    }));
    res.json(orders);
  });
});

// Yangi buyurtma yaratish — server-side narx hisoblash, optionalAuth
app.post('/api/orders', optionalAuth, async (req, res) => {
  const { customer_name, phone, items, cashback_used, payment_method, comment, address } = req.body;

  // user_id faqat token orqali — client yuborgan qiymat e'tiborga olinmaydi
  const authenticatedUserId = req.user?.role === 'client' ? req.user.id : null;

  if (!customer_name || !phone || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Majburiy maydonlar to\'ldirilmagan' });
  }

  for (const item of items) {
    const qty = parseInt(item.quantity);
    if (!item.id || isNaN(qty) || qty < 1) {
      return res.status(400).json({ error: 'Mahsulot ma\'lumotlari noto\'g\'ri' });
    }
  }

  const method = payment_method || 'naqd';
  const itemIds = items.map(i => i.id);
  const placeholders = itemIds.map(() => '?').join(',');

  db.all(`SELECT id, price FROM menu_items WHERE id IN (${placeholders}) AND available = true`, itemIds, async (err, menuRows) => {
    if (err) return res.status(500).json({ error: err.message });

    const priceMap = {};
    menuRows.forEach(m => { priceMap[m.id] = m.price; });

    for (const item of items) {
      if (!priceMap[item.id]) {
        return res.status(400).json({ error: `Mahsulot topilmadi yoki mavjud emas: ID ${item.id}` });
      }
    }

    const verifiedItems = items.map(item => ({
      ...item,
      price: priceMap[item.id],
      quantity: parseInt(item.quantity),
    }));
    const serverTotal = verifiedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemsJson = JSON.stringify(verifiedItems);

    try {
      const newOrder = await db.transaction(async (tx) => {
        let finalUsed = 0;
        let finalEarned = 0;

        if (authenticatedUserId) {
          // Row-level lock — concurrent requests uchun xavfsiz
          const freshUser = await tx.query(
            'SELECT cashback_balance FROM users WHERE id = $1 FOR UPDATE',
            [authenticatedUserId]
          ).then(r => r.rows[0]);

          if (freshUser) {
            let usedAmount = parseInt(cashback_used) || 0;
            const maxUsable = Math.floor(serverTotal / 2);
            finalUsed = Math.min(usedAmount, freshUser.cashback_balance || 0, maxUsable);
            if (finalUsed < 0) finalUsed = 0;

            if (finalUsed === 0 && serverTotal > 0) {
              if (serverTotal >= 999000) finalEarned = Math.floor(serverTotal * 0.06);
              else if (serverTotal >= 599000) finalEarned = Math.floor(serverTotal * 0.05);
              else if (serverTotal >= 299000) finalEarned = Math.floor(serverTotal * 0.04);
              else if (serverTotal >= 99000) finalEarned = Math.floor(serverTotal * 0.03);
              else finalEarned = Math.floor(serverTotal * 0.02);
            }

            if (finalUsed > 0) {
              const updateResult = await tx.query(
                'UPDATE users SET cashback_balance = cashback_balance - $1 WHERE id = $2 AND cashback_balance >= $1',
                [finalUsed, authenticatedUserId]
              );
              if (updateResult.rowCount === 0) {
                // Muvozanat yetarli emas — cashbacksiz davom etadi
                finalUsed = 0;
                finalEarned = Math.floor(serverTotal * 0.02);
              }
            }
          }
        }

        const ctx = await tx.run(
          `INSERT INTO orders (customer_name, phone, items, total, status, address, user_id, cashback_used, cashback_earned, payment_method, comment) VALUES (?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?)`,
          [customer_name, phone, itemsJson, serverTotal, address || 'Kiritilmagan', authenticatedUserId, finalUsed, finalEarned, method, comment || null]
        );

        return {
          id: ctx.lastID,
          customer_name, phone,
          items: verifiedItems,
          total: serverTotal,
          address: address || 'Kiritilmagan',
          status: 'new',
          user_id: authenticatedUserId,
          cashback_used: finalUsed,
          cashback_earned: finalEarned,
          payment_method: method,
          comment: comment || null
        };
      });

      sendOrderToTelegram(newOrder);
      res.status(201).json(newOrder);
    } catch (err) {
      console.error('Order creation failed:', err);
      res.status(500).json({ error: err.message || 'Buyurtma yaratishda xatolik' });
    }
  });
});

// Foydalanuvchining o'z buyurtmalarini olish — IDOR fix
app.get('/api/orders/user/:id', requireClient, (req, res) => {
  // Client faqat o'zining buyurtmalarini ko'rishi mumkin
  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Ruxsat yo\'q' });
  }
  db.all("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const orders = rows.map(row => ({
      ...row,
      items: JSON.parse(row.items)
    }));
    res.json(orders);
  });
});

// Bajarilgan buyurtmani anonim baholash — duplicate防止 transaction bilan
app.post('/api/orders/:id/rate', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Baho 1 dan 5 gacha bo\'lishi kerak' });
  }

  try {
    await db.transaction(async (tx) => {
      // Row lock — parallel requestlarni bloklaydi
      const order = await tx.query(
        "SELECT is_rated, status, user_id FROM orders WHERE id = $1 FOR UPDATE", [id]
      ).then(r => r.rows[0]);

      if (!order) throw Object.assign(new Error('Buyurtma topilmadi'), { status: 404 });
      if (order.status !== 'completed') throw Object.assign(new Error('Faqat bajarilgan buyurtmalarni baholash mumkin'), { status: 400 });
      if (order.is_rated) throw Object.assign(new Error('Bu buyurtma allaqachon baholangan'), { status: 400 });

      if (order.user_id && (!req.user || req.user.id !== order.user_id)) {
        throw Object.assign(new Error('Siz bu buyurtmani baholay olmaysiz'), { status: 403 });
      }

      await tx.run("INSERT INTO reviews (rating, comment, order_id) VALUES (?, ?, ?)", [rating, comment || '', id]);
      await tx.run("UPDATE orders SET is_rated = 1 WHERE id = ?", [id]);
    });

    res.json({ status: 'success', message: 'Baholandi' });
  } catch (err) {
    const code = err.status || 500;
    res.status(code).json({ error: err.message });
  }
});

// Admin uchun barcha anonim baholarni olish — faqat staff
app.get('/api/reviews', requireStaff, (req, res) => {
  db.all("SELECT * FROM reviews ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// To'lov turini o'zgartirish — faqat staff
app.put('/api/orders/:id/payment', requireStaff, (req, res) => {
  const { id } = req.params;
  const { payment_method } = req.body;

  const allowed = ['naqd', 'karta', 'click', 'payme', 'uzum'];
  if (!allowed.includes(payment_method)) {
    return res.status(400).json({ error: 'Noto\'g\'ri to\'lov turi' });
  }

  db.run("UPDATE orders SET payment_method = ? WHERE id = ?", [payment_method, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: 'success', payment_method });
  });
});

// Buyurtma holatini yangilash — faqat staff
app.put('/api/orders/:id/status', requireStaff, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['new', 'preparing', 'delivering', 'completed', 'rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Noto\'g\'ri status' });
  }

  try {
    await db.transaction(async (tx) => {
      const oldOrder = await tx.get(
        'SELECT status, user_id, cashback_earned, cashback_used, items FROM orders WHERE id = ?', [id]
      );
      if (!oldOrder) throw Object.assign(new Error('Order not found'), { status: 404 });

      if (oldOrder.status === 'completed' || oldOrder.status === 'rejected') {
        throw Object.assign(new Error('Yakunlangan yoki bekor qilingan buyurtma statusini o\'zgartirib bo\'lmaydi'), { status: 400 });
      }

      const updateResult = await tx.query(
        'UPDATE orders SET status = $1 WHERE id = $2 AND status != $1',
        [status, id]
      );

      if (updateResult.rowCount === 0) {
        // Already this status — no-op (not an error)
        return { alreadySet: true };
      }

      // completed → keshback qo'shish + inventory kamaytirish
      if (status === 'completed' && oldOrder.status !== 'completed' && oldOrder.user_id) {
        await tx.run(
          'UPDATE users SET cashback_balance = cashback_balance + ? WHERE id = ?',
          [oldOrder.cashback_earned || 0, oldOrder.user_id]
        );

        // Inventory deduction
        try {
          const orderItems = typeof oldOrder.items === 'string' ? JSON.parse(oldOrder.items) : oldOrder.items;
          for (const item of orderItems) {
            const recipes = await tx.all(
              'SELECT inventory_id, amount FROM recipe_ingredients WHERE menu_item_id = ?', [item.id]
            );
            for (const recipe of recipes) {
              await tx.run(
                'UPDATE inventory SET quantity = quantity - ? WHERE id = ?',
                [recipe.amount * item.quantity, recipe.inventory_id]
              );
            }
          }
        } catch (e) {
          console.error('Inventory deduction error (non-fatal):', e);
        }
      }

      // rejected → cashback qaytarish
      if (status === 'rejected' && oldOrder.status !== 'rejected' && oldOrder.user_id && oldOrder.cashback_used > 0) {
        await tx.run(
          'UPDATE users SET cashback_balance = cashback_balance + ? WHERE id = ?',
          [oldOrder.cashback_used, oldOrder.user_id]
        );
      }

      return { alreadySet: false };
    }).then(({ alreadySet }) => {
      if (alreadySet) {
        return res.json({ message: 'Status already set', id, status });
      }
      // Telegram — transaction tashqarisida (side-effects)
      sendStatusUpdateToTelegram(id, status);
      res.json({ message: 'Status updated', id, status });
    });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    console.error('Status update failed:', err);
    res.status(500).json({ error: err.message || 'Status yangilashda xatolik' });
  }
});

// Mahalliy Print Client uchun API — requirePrinter bilan himoyalangan
app.get('/api/print-jobs', requirePrinter, (req, res) => {
  db.all("SELECT * FROM orders WHERE status = 'preparing' AND (printed = false OR printed IS NULL)", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const parsedRows = rows.map(r => {
      try { r.items = typeof r.items === 'string' ? JSON.parse(r.items) : r.items; } catch(e) {}
      return r;
    });
    res.json(parsedRows);
  });
});

app.post('/api/print-jobs/:id/done', requirePrinter, (req, res) => {
  const { id } = req.params;
  db.run("UPDATE orders SET printed = true WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Top 5 mijozlar — faqat staff, sensitive ma'lumotlar olib tashlangan
app.get('/api/analytics/top-customers', requireStaff, (req, res) => {
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
app.get('/api/analytics/gifts', requireStaff, (req, res) => {
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

// Push tokenni saqlash — faqat autentifikatsiya qilingan client o'z tokenini saqlaydi
app.post('/api/users/push-token', requireClient, (req, res) => {
  const { user_id, push_token } = req.body;
  if (!user_id || !push_token) return res.status(400).json({ error: "Missing required fields" });

  // IDOR fix: client faqat o'zining tokenini saqlashi mumkin
  if (req.user.id !== parseInt(user_id)) {
    return res.status(403).json({ error: 'Ruxsat yo\'q' });
  }

  db.run("UPDATE users SET push_token = ? WHERE id = ?", [push_token, user_id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Bepul buyurtma (sovg'a) yaratish — faqat staff
app.post('/api/orders/gift', requireStaff, (req, res) => {
  const { user_id, customer_name, phone, items, message_text, telegram_id, push_token } = req.body;

  if (!phone || !items || !items.length) {
    return res.status(400).json({ error: "Phone and items are required" });
  }

  const itemsJson = JSON.stringify(items);
  const sql = `INSERT INTO orders (customer_name, phone, items, total, status, address, user_id, cashback_used, cashback_earned, payment_method) VALUES (?, ?, ?, 0, 'delivering', ?, ?, 0, 0, 'sovga')`;

  db.run(sql, [customer_name || 'Mijoz', phone, itemsJson, "Sovg'a yuborildi", user_id || null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    const orderId = this.lastID;

    if (push_token) {
      sendPushNotification(
        push_token,
        "🎁 Sizga sovg'a keldi!",
        message_text || "Milano Foods tomonidan sizga bepul ovqat jo'natildi."
      );
    }

    if (telegram_id) {
      const msg = `🎁 *Sizga sovg'a keldi!*\n\n${message_text || "Milano Foods tomonidan sizga bepul ovqat jo'natildi."}\n\n*Buyurtma:*\n${items.map(i => `- ${i.name} x${i.quantity}`).join('\n')}`;
      bot.sendMessage(telegram_id, msg, { parse_mode: 'Markdown' }).catch(e => console.error("Tg bot error:", e));
    }

    if (user_id) {
      db.run("INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)", [
        user_id,
        "🎁 Sizga sovg'a keldi!",
        message_text || "Milano Foods tomonidan sizga bepul ovqat jo'natildi."
      ]);
    }

    res.status(201).json({ success: true, orderId });
  });
});

// ============================================================
// --- NOTIFICATIONS API ---
// ============================================================

app.get('/api/notifications', requireAnyAuth, (req, res) => {
  db.all("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/api/notifications/:id/read', requireAnyAuth, (req, res) => {
  db.run("UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ============================================================
// --- MENU API ---
// ============================================================

app.get('/api/menu', (req, res) => {
  db.all("SELECT * FROM menu_items", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/menu', requireAdmin, (req, res) => {
  const { name, name_ru, description, description_ru, price, category, emoji, color, weight, available } = req.body;
  if (!name || !price || !category) return res.status(400).json({ error: 'name, price, category majburiy' });
  const sql = `INSERT INTO menu_items (name, name_ru, description, description_ru, price, category, emoji, color, weight, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.run(sql, [name, name_ru || '', description, description_ru || '', price, category, emoji, color, weight, available === undefined ? true : !!available], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, ...req.body });
  });
});

app.put('/api/menu/:id', requireAdmin, (req, res) => {
  const { name, name_ru, description, description_ru, price, category, emoji, color, weight, available } = req.body;
  const sql = `UPDATE menu_items SET name=?, name_ru=?, description=?, description_ru=?, price=?, category=?, emoji=?, color=?, weight=?, available=? WHERE id=?`;
  db.run(sql, [name, name_ru || '', description, description_ru || '', price, category, emoji, color, weight, !!available, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: req.params.id });
  });
});

app.delete('/api/menu/:id', requireAdmin, (req, res) => {
  db.run("DELETE FROM menu_items WHERE id=?", req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Toggle menu item availability (vaqtincha o'chirish/qayta qo'shish)
app.patch('/api/menu/:id/toggle-available', requireAdmin, (req, res) => {
  db.get("SELECT available FROM menu_items WHERE id=?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Topilmadi' });
    const newAvailable = !row.available;
    db.run("UPDATE menu_items SET available=? WHERE id=?", [newAvailable, req.params.id], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true, available: newAvailable });
    });
  });
});

// Set discount on menu item (aksiya elon qilish)
app.patch('/api/menu/:id/discount', requireAdmin, (req, res) => {
  const { discount_percent } = req.body;
  const pct = parseInt(discount_percent, 10);
  if (isNaN(pct) || pct < 0 || pct > 99) {
    return res.status(400).json({ error: 'discount_percent 0-99 orasida bo\'lishi kerak' });
  }
  // Add column if not exists (idempotent)
  db.run(
    "ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0",
    [],
    () => {
      db.run("UPDATE menu_items SET discount_percent=? WHERE id=?", [pct, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, discount_percent: pct });
      });
    }
  );
});

// ============================================================
// --- STAFF API ---
// ============================================================

app.get('/api/staff', requireStaff, (req, res) => {
  // password maydoni qaytarilmaydi, strftime → to_char (PostgreSQL)
  db.all(`
    SELECT s.id, s.name, s.role, s.phone, s.username, s.salary,
      COALESCE((SELECT SUM(earned) FROM work_sessions w WHERE w.staff_id = s.id AND to_char(w.start_time, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM')), 0) as current_month_earned
    FROM staff s
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/staff', requireAdmin, async (req, res) => {
  const { name, role, phone, username, password, salary } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'name, username, password majburiy' });
  }

  // Role whitelist — superadmin faqat boshqa superadmin tomonidan yaratilishi mumkin emas
  const allowedRoles = ['waiter', 'cashier', 'admin'];
  const requestorRole = req.user?.role?.toLowerCase();
  if (requestorRole !== 'superadmin') allowedRoles.splice(allowedRoles.indexOf('admin'), 1); // faqat superadmin admin yarata oladi
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
    db.run("INSERT INTO staff (name, role, phone, username, password, salary) VALUES (?, ?, ?, ?, ?, ?)",
      [name, finalRole, phone, username, hashedPassword, salary || 0],
      function(err) {
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

app.delete('/api/staff/:id', requireAdmin, (req, res) => {
  db.run("DELETE FROM staff WHERE id=?", req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ============================================================
// --- WORK SESSIONS API ---
// ============================================================

app.get('/api/work-sessions/current/:staffId', requireStaff, (req, res) => {
  db.get("SELECT * FROM work_sessions WHERE staff_id = ? AND end_time IS NULL", [req.params.staffId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || null);
  });
});

app.post('/api/work-sessions/start', requireStaff, (req, res) => {
  // IDOR: faqat o'zining sessionini boshlashi mumkin (admin istisnosi bilan)
  const { staff_id } = req.body;
  const requestorRole = req.user?.role?.toLowerCase();
  if (!['admin', 'superadmin'].includes(requestorRole) && req.user.id !== parseInt(staff_id)) {
    return res.status(403).json({ error: 'Faqat o\'z sessioningizni boshqarish mumkin' });
  }
  db.run("INSERT INTO work_sessions (staff_id) VALUES (?)", [staff_id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, staff_id });
  });
});

app.post('/api/work-sessions/end', requireStaff, (req, res) => {
  // IDOR: faqat o'zining sessionini tugatishi mumkin (admin istisnosi bilan)
  const { id, staff_id } = req.body;
  const requestorRole = req.user?.role?.toLowerCase();
  if (!['admin', 'superadmin'].includes(requestorRole) && req.user.id !== parseInt(staff_id)) {
    return res.status(403).json({ error: 'Faqat o\'z sessioningizni boshqarish mumkin' });
  }
  db.get("SELECT salary FROM staff WHERE id = ?", [staff_id], (err, staff) => {
    if (err) return res.status(500).json({ error: err.message });
    const hourlyWage = staff?.salary || 0;

    // STRFTIME PostgreSQL-ga mos: EXTRACT epoch
    db.run(`
      UPDATE work_sessions 
      SET end_time = NOW(), 
          earned = EXTRACT(EPOCH FROM (NOW() - start_time)) / 3600.0 * ?
      WHERE id = ? AND end_time IS NULL
    `, [hourlyWage, id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

app.get('/api/work-sessions/earned/:staffId', requireStaff, (req, res) => {
  // strftime → to_char (PostgreSQL)
  db.get(`
    SELECT COALESCE(SUM(earned), 0) as total_earned 
    FROM work_sessions 
    WHERE staff_id = ? AND to_char(start_time, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM')
  `, [req.params.staffId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// ============================================================
// --- INVENTORY API ---
// ============================================================

app.get('/api/inventory', requireStaff, (req, res) => {
  db.all("SELECT * FROM inventory ORDER BY name ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/inventory', requireAdmin, (req, res) => {
  const { name, unit, quantity } = req.body;
  if (!name || !unit) return res.status(400).json({ error: 'name va unit majburiy' });
  db.run("INSERT INTO inventory (name, unit, quantity) VALUES (?, ?, ?)",
    [name, unit, quantity || 0], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, unit, quantity });
    });
});

app.put('/api/inventory/:id', requireAdmin, (req, res) => {
  const { name, unit, quantity } = req.body;
  db.run("UPDATE inventory SET name=?, unit=?, quantity=? WHERE id=?",
    [name, unit, quantity, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
});

app.delete('/api/inventory/:id', requireAdmin, (req, res) => {
  db.run("DELETE FROM inventory WHERE id=?", req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ============================================================
// --- RECIPE API ---
// ============================================================

app.get('/api/menu/:id/ingredients', requireStaff, (req, res) => {
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

app.post('/api/menu/:id/ingredients', requireAdmin, (req, res) => {
  const { inventory_id, amount } = req.body;
  db.run("INSERT INTO recipe_ingredients (menu_item_id, inventory_id, amount) VALUES (?, ?, ?)",
    [req.params.id, inventory_id, amount], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, menu_item_id: req.params.id, inventory_id, amount });
    });
});

app.delete('/api/menu/ingredients/:id', requireAdmin, (req, res) => {
  db.run("DELETE FROM recipe_ingredients WHERE id=?", req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ============================================================
// --- AUTH API (STAFF) ---
// ============================================================

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username va password majburiy' });

  db.get("SELECT id, name, role, username, salary, password FROM staff WHERE username = ?", [username], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: "Login yoki parol noto'g'ri" });

    if (!row.password || !row.password.startsWith('$2')) {
      return res.status(401).json({ error: "Xavfsizlik talablari yangilandi. Iltimos adminga murojaat qilib parolingizni yangilang." });
    }

    const isValid = await bcrypt.compare(password, row.password);
    if (!isValid) return res.status(401).json({ error: "Login yoki parol noto'g'ri" });

    const { password: _, ...staffData } = row;
    const token = jwt.sign({ id: row.id, role: row.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: staffData, token });
  });
});

// ============================================================
// --- AUTH API (CLIENT) ---
// ============================================================

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
        const token = jwt.sign({ id: user.id, role: user.role || 'client' }, JWT_SECRET, { expiresIn: '30d' });
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

  // auth_date expiry tekshiruvi — 5 daqiqadan eski tokenlar rad etiladi
  const authDate = parseInt(authData.auth_date);
  if (!authDate || (Math.floor(Date.now() / 1000) - authDate) > 300) {
    return res.status(401).json({ error: "Telegram autentifikatsiya muddati tugagan. Qaytadan kiring." });
  }

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
      const token = jwt.sign({ id: user.id, role: user.role || 'client' }, JWT_SECRET, { expiresIn: '30d' });
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
  if (!authData || (authData.expires_at && Date.now() > authData.expires_at)) {
    if (authData) delete global.telegramVerificationCodes[code];
    return res.status(400).json({ error: "Kod noto'g'ri yoki vaqti o'tib ketgan" });
  }

  const { telegram_id, first_name, last_name, username, phone } = authData;
  const name = `${first_name || ''} ${last_name || ''}`.trim() || username || 'Telegram Foydalanuvchisi';

  let query = "SELECT * FROM users WHERE telegram_id = ?";
  let params = [telegram_id];
  
  if (phone) {
    query = "SELECT * FROM users WHERE telegram_id = ? OR phone = ?";
    params = [telegram_id, phone];
  }

  db.get(query, params, (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    delete global.telegramVerificationCodes[code];

    if (user) {
      let updates = [];
      let updateParams = [];
      if (!user.telegram_id && telegram_id) {
        updates.push("telegram_id = ?");
        updateParams.push(telegram_id);
        user.telegram_id = telegram_id;
      }
      if (!user.phone && phone) {
        updates.push("phone = ?");
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

// Profile update — faqat o'zining ma'lumotlarini o'zgartirish
app.put('/api/auth/client/update', requireClient, (req, res) => {
  const { id, name, phone, email, birthday } = req.body;
  if (!id) return res.status(400).json({ error: "Foydalanuvchi IDsi kerak" });

  // IDOR fix
  if (req.user.id !== parseInt(id)) {
    return res.status(403).json({ error: 'Ruxsat yo\'q' });
  }

  db.run(
    "UPDATE users SET name = ?, phone = ?, email = ?, birthday = ? WHERE id = ?",
    [name, phone, email, birthday || null, id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed: users.email') || err.message.includes('users_email')) {
          return res.status(400).json({ error: "Bu email allaqachon band" });
        }
        if (err.message.includes('UNIQUE constraint failed: users.phone') || err.message.includes('users_phone')) {
          return res.status(400).json({ error: "Bu raqam allaqachon band" });
        }
        return res.status(500).json({ error: err.message });
      }

      db.get("SELECT * FROM users WHERE id = ?", [id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        const { password: _, ...userData } = user;
        res.json(userData);
      });
    }
  );
});

// O'zining profil ma'lumotlarini olish — IDOR fix
app.get('/api/auth/client/me/:id', requireClient, (req, res) => {
  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Ruxsat yo\'q' });
  }
  db.get("SELECT * FROM users WHERE id = ?", [req.params.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    const { password: _, ...userData } = user;
    res.json(userData);
  });
});

// ============================================================
// --- CATEGORIES API ---
// ============================================================

app.get('/api/categories', (req, res) => {
  db.all("SELECT * FROM categories", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/categories', requireAdmin, (req, res) => {
  const { name, name_ru, emoji, color, bg, available, is_quick } = req.body;
  db.run("INSERT INTO categories (name, name_ru, emoji, color, bg, available, is_quick) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [name, name_ru || '', emoji, color || 'text-gray-500', bg || 'bg-gray-100', available === undefined ? true : !!available, !!is_quick],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

app.put('/api/categories/:id', requireAdmin, (req, res) => {
  const { name, name_ru, emoji, color, bg, available, is_quick } = req.body;
  db.run("UPDATE categories SET name=?, name_ru=?, emoji=?, color=?, bg=?, available=?, is_quick=? WHERE id=?",
    [name, name_ru || '', emoji, color, bg, !!available, !!is_quick, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: req.params.id });
    }
  );
});

app.delete('/api/categories/:id', requireAdmin, (req, res) => {
  db.run("DELETE FROM categories WHERE id=?", req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Toggle category availability
app.patch('/api/categories/:id/toggle-available', requireAdmin, (req, res) => {
  db.get("SELECT available FROM categories WHERE id=?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Topilmadi' });
    const newAvailable = !row.available;
    db.run("UPDATE categories SET available=? WHERE id=?", [newAvailable, req.params.id], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true, available: newAvailable });
    });
  });
});

// ============================================================
// --- BANNERS API ---
// ============================================================

app.get('/api/banners', (req, res) => {
  db.all("SELECT * FROM banners", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/banners', requireAdmin, (req, res) => {
  const { title, subtitle, bg_color, text_color, sub_text_color, emoji1, emoji2, emoji3, link_type, link_id } = req.body;
  db.run("INSERT INTO banners (title, subtitle, bg_color, text_color, sub_text_color, emoji1, emoji2, emoji3, link_type, link_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [title, subtitle, bg_color, text_color, sub_text_color, emoji1, emoji2, emoji3, link_type || 'none', link_id || null],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

app.put('/api/banners/:id', requireAdmin, (req, res) => {
  const { title, subtitle, bg_color, text_color, sub_text_color, emoji1, emoji2, emoji3, link_type, link_id } = req.body;
  db.run("UPDATE banners SET title=?, subtitle=?, bg_color=?, text_color=?, sub_text_color=?, emoji1=?, emoji2=?, emoji3=?, link_type=?, link_id=? WHERE id=?",
    [title, subtitle, bg_color, text_color, sub_text_color, emoji1, emoji2, emoji3, link_type || 'none', link_id || null, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: req.params.id });
    }
  );
});

app.delete('/api/banners/:id', requireAdmin, (req, res) => {
  db.run("DELETE FROM banners WHERE id=?", req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ============================================================
// --- SETTINGS API ---
// ============================================================

app.get('/api/settings', (req, res) => {
  db.all('SELECT * FROM settings', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const settings = {};
    rows.forEach(r => settings[r.setting_key] = r.setting_value);
    res.json(settings);
  });
});

app.put('/api/settings', requireAdmin, (req, res) => {
  const settings = req.body;
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (setting_key, setting_value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(settings)) {
    stmt.run(key, value);
  }
  stmt.finalize();
  res.json({ success: true });
});

// ============================================================
// --- STARTUP MIGRATION (idempotent) ---
// ============================================================
async function runStartupMigrations() {
  return new Promise((resolve) => {
    db.run(
      'ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0',
      [],
      (err) => {
        if (err) console.warn('[migration] discount_percent:', err.message);
        else console.log('[migration] discount_percent ustuni tayyor');
        resolve();
      }
    );
  });
}

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  runStartupMigrations().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server http://localhost:${PORT} da ishga tushdi`);
    });
  });
}

module.exports = app;