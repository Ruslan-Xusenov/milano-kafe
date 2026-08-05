const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendOrderToTelegram, sendStatusUpdateToTelegram, bot } = require('../bot');
const { sendPushNotification } = require('../notifications');

// ============================================================
// --- ORDERS ---
// ============================================================

// Barcha buyurtmalarni olish — faqat staff
router.get('/', (req, res) => {
  db.all('SELECT * FROM orders ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const orders = rows.map(row => ({
      ...row,
      items: JSON.parse(row.items),
    }));
    res.json(orders);
  });
});

// Yangi buyurtma yaratish — server-side narx hisoblash, optionalAuth
router.post('/', async (req, res) => {
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
  const getBaseId = (id) => (typeof id === 'string' && id.includes('_')) ? parseInt(id.split('_')[0], 10) : parseInt(id, 10);
  const itemIds = [...new Set(items.map(i => getBaseId(i.id)).filter(id => !isNaN(id)))];
  if (itemIds.length === 0) {
    return res.status(400).json({ error: "Mahsulot ma'lumotlari noto'g'ri" });
  }
  const placeholders = itemIds.map(() => '?').join(',');

  db.all(`SELECT id, price, name, variants FROM menu_items WHERE id IN (${placeholders}) AND available = true`, itemIds, async (err, menuRows) => {
    if (err) return res.status(500).json({ error: err.message });

    const menuMap = {};
    menuRows.forEach(m => { menuMap[m.id] = m; });

    for (const item of items) {
      const baseId = getBaseId(item.id);
      if (!menuMap[baseId]) {
        return res.status(400).json({ error: `Mahsulot topilmadi yoki mavjud emas: ID ${item.id}` });
      }
    }

    const verifiedItems = items.map(item => {
      const baseId = getBaseId(item.id);
      const menuItem = menuMap[baseId];
      let finalPrice = menuItem.price;
      let finalName = item.name || menuItem.name;

      const variantName = item.selectedVariant || (typeof item.id === 'string' && item.id.includes('_') ? item.id.split('_')[1] : null);
      if (variantName) {
        let variants = [];
        try {
          variants = typeof menuItem.variants === 'string' ? JSON.parse(menuItem.variants || '[]') : (menuItem.variants || []);
        } catch (e) {}
        const foundVar = variants.find(v => v.name === variantName || v.name_uz === variantName || v.name_ru === variantName);
        if (foundVar && foundVar.price !== undefined) {
          finalPrice = parseInt(foundVar.price, 10);
        }
        if (!finalName.includes(variantName)) {
          finalName = `${menuItem.name} (${variantName})`;
        }
      }

      return {
        ...item,
        id: item.id,
        productId: baseId,
        name: finalName,
        price: finalPrice,
        quantity: parseInt(item.quantity),
      };
    });
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
          comment: comment || null,
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
router.get('/user/:id', (req, res) => {
  // Client faqat o'zining buyurtmalarini ko'rishi mumkin
  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Ruxsat yo\'q' });
  }
  db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const orders = rows.map(row => ({
      ...row,
      items: JSON.parse(row.items),
    }));
    res.json(orders);
  });
});

// Buyurtmani anonim baholash — duplicate防止 transaction bilan
router.post('/:id/rate', async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Baho 1 dan 5 gacha bo\'lishi kerak' });
  }

  try {
    await db.transaction(async (tx) => {
      const order = await tx.query(
        'SELECT is_rated, status, user_id FROM orders WHERE id = $1 FOR UPDATE', [id]
      ).then(r => r.rows[0]);

      if (!order) throw Object.assign(new Error('Buyurtma topilmadi'), { status: 404 });
      if (order.status !== 'completed') throw Object.assign(new Error('Faqat bajarilgan buyurtmalarni baholash mumkin'), { status: 400 });
      if (order.is_rated) throw Object.assign(new Error('Bu buyurtma allaqachon baholangan'), { status: 400 });

      if (order.user_id && (!req.user || req.user.id !== order.user_id)) {
        throw Object.assign(new Error('Siz bu buyurtmani baholay olmaysiz'), { status: 403 });
      }

      await tx.run('INSERT INTO reviews (rating, comment, order_id) VALUES (?, ?, ?)', [rating, comment || '', id]);
      await tx.run('UPDATE orders SET is_rated = 1 WHERE id = ?', [id]);
    });

    res.json({ status: 'success', message: 'Baholandi' });
  } catch (err) {
    const code = err.status || 500;
    res.status(code).json({ error: err.message });
  }
});

// Admin uchun barcha baholarni olish — faqat staff
router.get('/reviews-list', (req, res) => {
  db.all('SELECT * FROM reviews ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// To'lov turini o'zgartirish — faqat staff
router.put('/:id/payment', (req, res) => {
  const { id } = req.params;
  const { payment_method } = req.body;

  const allowed = ['naqd', 'karta', 'click', 'payme', 'uzum'];
  if (!allowed.includes(payment_method)) {
    return res.status(400).json({ error: 'Noto\'g\'ri to\'lov turi' });
  }

  db.run('UPDATE orders SET payment_method = ? WHERE id = ?', [payment_method, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: 'success', payment_method });
  });
});

// Buyurtma holatini yangilash — faqat staff
router.put('/:id/status', async (req, res) => {
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
        return { alreadySet: true };
      }

      // completed → keshback qo'shish + inventory kamaytirish
      if (status === 'completed' && oldOrder.status !== 'completed' && oldOrder.user_id) {
        await tx.run(
          'UPDATE users SET cashback_balance = cashback_balance + ? WHERE id = ?',
          [oldOrder.cashback_earned || 0, oldOrder.user_id]
        );

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
      sendStatusUpdateToTelegram(id, status);
      res.json({ message: 'Status updated', id, status });
    });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    console.error('Status update failed:', err);
    res.status(500).json({ error: err.message || 'Status yangilashda xatolik' });
  }
});

// Printer uchun print jobs — requirePrinter bilan himoyalangan (index.js'da)
router.get('/print-jobs', (req, res) => {
  db.all("SELECT * FROM orders WHERE status IN ('new', 'preparing') AND (printed = false OR printed IS NULL)", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const parsedRows = rows.map(r => {
      try { r.items = typeof r.items === 'string' ? JSON.parse(r.items) : r.items; } catch (e) {}
      return r;
    });
    res.json(parsedRows);
  });
});

router.post('/print-jobs/:id/done', (req, res) => {
  const { id } = req.params;
  db.run('UPDATE orders SET printed = true WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Push tokenni saqlash — faqat autentifikatsiya qilingan client
router.post('/push-token', (req, res) => {
  const { user_id, push_token } = req.body;
  if (!user_id || !push_token) return res.status(400).json({ error: 'Missing required fields' });

  // IDOR fix: client faqat o'zining tokenini saqlashi mumkin
  if (req.user.id !== parseInt(user_id)) {
    return res.status(403).json({ error: 'Ruxsat yo\'q' });
  }

  db.run('UPDATE users SET push_token = ? WHERE id = ?', [push_token, user_id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ============================================================
// --- GIFT ORDERS (🔴 FIX: Server-side price verification) ---
// ============================================================

// Bepul buyurtma (sovg'a) yaratish — faqat staff
// FIX: items menu_items dan tekshiriladi, client yuborgan name/price o'rnatilmaydi
router.post('/gift', async (req, res) => {
  const { user_id, customer_name, phone, items, message_text, telegram_id, push_token } = req.body;

  if (!phone || !items || !items.length) {
    return res.status(400).json({ error: 'Phone and items are required' });
  }

  // Server-side item verification — barcha item IDlar menudan tekshiriladi
  const getBaseId = (id) => (typeof id === 'string' && id.includes('_')) ? parseInt(id.split('_')[0], 10) : parseInt(id, 10);
  const itemIds = [...new Set(items.map(i => getBaseId(i.id)).filter(Boolean))];
  if (itemIds.length === 0) {
    return res.status(400).json({ error: 'Kamida bitta to\'g\'ri item ID kerak' });
  }

  const placeholders = itemIds.map(() => '?').join(',');
  db.all(`SELECT id, name, price, variants FROM menu_items WHERE id IN (${placeholders})`, itemIds, (err, menuRows) => {
    if (err) return res.status(500).json({ error: err.message });

    const menuMap = {};
    menuRows.forEach(m => { menuMap[m.id] = m; });

    for (const item of items) {
      const baseId = getBaseId(item.id);
      if (!menuMap[baseId]) {
        return res.status(400).json({ error: `Mahsulot topilmadi: ID ${item.id}` });
      }
    }

    // Server-side verified items — narx va nom menudan olinadi
    const verifiedItems = items.map(item => {
      const baseId = getBaseId(item.id);
      const menuItem = menuMap[baseId];
      let finalPrice = menuItem.price;
      let finalName = menuItem.name;
      const variantName = item.selectedVariant || (typeof item.id === 'string' && item.id.includes('_') ? item.id.split('_')[1] : null);
      if (variantName) {
        let variants = [];
        try {
          variants = typeof menuItem.variants === 'string' ? JSON.parse(menuItem.variants || '[]') : (menuItem.variants || []);
        } catch (e) {}
        const foundVar = variants.find(v => v.name === variantName || v.name_uz === variantName || v.name_ru === variantName);
        if (foundVar && foundVar.price !== undefined) finalPrice = parseInt(foundVar.price, 10);
        finalName = `${menuItem.name} (${variantName})`;
      }
      return {
        id: item.id,
        productId: baseId,
        name: finalName,
        price: finalPrice,
        quantity: parseInt(item.quantity) || 1,
      };
    });

    const itemsJson = JSON.stringify(verifiedItems);
    const sql = `INSERT INTO orders (customer_name, phone, items, total, status, address, user_id, cashback_used, cashback_earned, payment_method) VALUES (?, ?, ?, 0, 'delivering', ?, ?, 0, 0, 'sovga')`;

    db.run(sql, [customer_name || 'Mijoz', phone, itemsJson, "Sovg'a yuborildi", user_id || null], function (err) {
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
        const msg = `🎁 *Sizga sovg'a keldi!*\n\n${message_text || "Milano Foods tomonidan sizga bepul ovqat jo'natildi."}\n\n*Buyurtma:*\n${verifiedItems.map(i => `- ${i.name} x${i.quantity}`).join('\n')}`;
        bot.sendMessage(telegram_id, msg, { parse_mode: 'Markdown' }).catch(e => console.error('Tg bot error:', e));
      }

      if (user_id) {
        db.run('INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)', [
          user_id,
          "🎁 Sizga sovg'a keldi!",
          message_text || "Milano Foods tomonidan sizga bepul ovqat jo'natildi.",
        ]);
      }

      res.status(201).json({ success: true, orderId });
    });
  });
});

module.exports = router;
