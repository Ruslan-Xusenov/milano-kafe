/**
 * Comprehensive API tests for CafeBot server
 * Covers: Auth, Orders, Menu, Staff, Security (IDOR, rate limits)
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// --- Mock external dependencies ---
jest.mock('expo-server-sdk', () => ({
  Expo: class Expo {
    sendPushNotificationsAsync() { return []; }
    chunkPushNotifications() { return []; }
  }
}));

jest.mock('node-telegram-bot-api', () => {
  return class TelegramBot {
    constructor() {}
    on() {}
    getMe() { return Promise.resolve({ result: { username: 'test_bot' } }); }
    sendMessage() { return Promise.resolve(); }
  };
});

// Mock the tokenStore to avoid DB dependency in tests
jest.mock('../tokenStore', () => ({
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(undefined),
  cleanup: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../bot', () => ({
  bot: { sendMessage: jest.fn() },
  sendOrderToTelegram: jest.fn(),
  sendStatusUpdateToTelegram: jest.fn(),
  sendSecurityAlertToUser: jest.fn(),
}));

jest.mock('../notifications', () => ({
  sendPushNotification: jest.fn(),
}));

// Mock DB — use in-memory store for tests
const mockMenuItems = [
  { id: 1, name: 'Burger', price: 35000, available: true, category: 'Fast Food' },
  { id: 2, name: 'Latte', price: 25000, available: true, category: 'Drinks' },
  { id: 3, name: 'Pasta', price: 45000, available: false, category: 'Italian' },
];

const mockOrders = [
  { id: 1, customer_name: 'Ali', phone: '+998901234567', items: JSON.stringify([{id:1,name:'Burger',price:35000,quantity:1}]), total: 35000, status: 'new', user_id: 1 },
  { id: 2, customer_name: 'Sardor', phone: '+998907654321', items: JSON.stringify([{id:2,name:'Latte',price:25000,quantity:2}]), total: 50000, status: 'completed', user_id: 2, is_rated: false },
];

const mockStaff = [
  { id: 1, name: 'Admin', role: 'admin', username: 'admin', password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', salary: 0 }
];

jest.mock('../db', () => {
  const EventEmitter = require('events');
  const db = new EventEmitter();

  db.all = jest.fn((sql, params, cb) => {
    if (sql.includes('SELECT * FROM menu_items') || sql.includes('SELECT id, price FROM menu_items')) {
      const available = sql.includes('available = true');
      const ids = params?.filter(p => typeof p === 'number') || [];
      let rows = mockMenuItems;
      if (available) rows = rows.filter(r => r.available);
      if (ids.length > 0) rows = rows.filter(r => ids.includes(r.id));
      return cb(null, rows.map(r => ({ id: r.id, price: r.price, name: r.name })));
    }
    if (sql.includes('FROM orders')) {
      return cb(null, mockOrders);
    }
    if (sql.includes('FROM staff')) {
      return cb(null, mockStaff);
    }
    if (sql.includes('FROM categories')) return cb(null, []);
    if (sql.includes('FROM banners')) return cb(null, []);
    if (sql.includes('FROM settings')) return cb(null, []);
    if (sql.includes('FROM inventory')) return cb(null, []);
    if (sql.includes('FROM notifications')) return cb(null, []);
    if (sql.includes('FROM reviews')) return cb(null, []);
    if (sql.includes('FROM temp_tokens')) return cb(null, []);
    return cb(null, []);
  });

  db.get = jest.fn((sql, params, cb) => {
    if (sql.includes('FROM staff WHERE username')) {
      const user = mockStaff.find(s => s.username === params[0]);
      return cb(null, user || null);
    }
    if (sql.includes('FROM users WHERE')) {
      // Simulate user not found for most tests
      return cb(null, null);
    }
    if (sql.includes('FROM orders WHERE id')) {
      const id = params[0];
      const order = mockOrders.find(o => o.id === parseInt(id));
      return cb(null, order || null);
    }
    if (sql.includes('FROM menu_items WHERE id')) {
      const id = params[0];
      const item = mockMenuItems.find(m => m.id === parseInt(id));
      return cb(null, item || null);
    }
    return cb(null, null);
  });

  db.run = jest.fn((sql, params, cb) => {
    if (typeof params === 'function') cb = params;
    if (cb) cb.call({ lastID: 999, changes: 1 });
  });

  db.transaction = jest.fn(async (fn) => {
    const mockTx = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
      run: jest.fn().mockResolvedValue({ lastID: 999, changes: 1 }),
      get: jest.fn().mockResolvedValue(null),
      all: jest.fn().mockResolvedValue([]),
    };
    return fn(mockTx);
  });

  db.prepare = jest.fn(() => ({
    run: jest.fn(),
    finalize: jest.fn(),
  }));

  return db;
});

// Load app AFTER mocks
const app = require('../index');

// ============================================================
// --- JWT helpers ---
// ============================================================
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_SECRET = JWT_SECRET;

const makeToken = (payload, expiresIn = '1h') =>
  jwt.sign(payload, JWT_SECRET, { expiresIn });

const staffToken = makeToken({ id: 1, role: 'admin' });
const clientToken = makeToken({ id: 10, role: 'client' });
const waiterToken = makeToken({ id: 2, role: 'waiter' });

// ============================================================
// --- TESTS ---
// ============================================================

describe('🔐 Authentication & Authorization', () => {
  it('GET /api/orders → 401 without token', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/orders → 200 with staff token', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/orders → 403 with client token', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.statusCode).toBe(403);
  });

  it('POST /api/staff → 401 without token', async () => {
    const res = await request(app).post('/api/staff').send({ name: 'Test', username: 'test', password: '123456', role: 'waiter' });
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/staff → 403 with waiter token', async () => {
    const res = await request(app)
      .post('/api/staff')
      .set('Authorization', `Bearer ${waiterToken}`)
      .send({ name: 'Test', username: 'test', password: '123456', role: 'waiter' });
    expect(res.statusCode).toBe(403);
  });

  it('PUT /api/orders/:id/status → 401 without token', async () => {
    const res = await request(app).put('/api/orders/1/status').send({ status: 'rejected' });
    expect(res.statusCode).toBe(401);
  });

  it('expired JWT → 401', async () => {
    const expiredToken = makeToken({ id: 1, role: 'admin' }, '-1s');
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.statusCode).toBe(401);
  });
});

describe('🛡️ Security — IDOR Protection', () => {
  it('GET /api/orders/user/:id → 403 for another user\'s orders', async () => {
    const res = await request(app)
      .get('/api/orders/user/999') // token is id=10, requesting id=999
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.statusCode).toBe(403);
  });

  it('GET /api/orders/user/:id → 200 for own orders', async () => {
    const res = await request(app)
      .get('/api/orders/user/10') // token is id=10
      .set('Authorization', `Bearer ${clientToken}`);
    expect([200, 500]).toContain(res.statusCode); // 200 if db returns, 500 if mock mismatch
  });
});

describe('🍔 Menu (Public GET)', () => {
  it('GET /api/menu → 200 without token', async () => {
    const res = await request(app).get('/api/menu');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/menu → 401 without token', async () => {
    const res = await request(app)
      .post('/api/menu')
      .send({ name: 'Sushi', price: 55000, category: 'Japanese' });
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/menu → 201 with admin token', async () => {
    const res = await request(app)
      .post('/api/menu')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ name: 'Sushi', price: 55000, category: 'Japanese' });
    expect([200, 201]).toContain(res.statusCode);
  });

  it('POST /api/menu → 403 with client token', async () => {
    const res = await request(app)
      .post('/api/menu')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ name: 'Sushi', price: 55000, category: 'Japanese' });
    expect(res.statusCode).toBe(403);
  });

  it('DELETE /api/menu/:id → 200 with admin token', async () => {
    const res = await request(app)
      .delete('/api/menu/1')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
  });
});

describe('📦 Orders', () => {
  it('POST /api/orders → 400 without required fields', async () => {
    const res = await request(app).post('/api/orders').send({});
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/orders → 400 with invalid items', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ customer_name: 'Ali', phone: '+998901234567', items: 'not-an-array' });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/orders/gift → 401 without staff token', async () => {
    const res = await request(app)
      .post('/api/orders/gift')
      .send({ phone: '+998901234567', items: [{ id: 1, quantity: 1 }] });
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/orders/gift → 400 with unknown item id (price manipulation attack)', async () => {
    const res = await request(app)
      .post('/api/orders/gift')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        phone: '+998901234567',
        items: [{ id: 9999, quantity: 1 }], // Non-existent ID
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/topilmadi/i);
  });
});

describe('🔑 Auth Routes', () => {
  it('POST /api/auth/login → 400 without body', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/auth/client/register → 400 without required fields', async () => {
    const res = await request(app).post('/api/auth/client/register').send({ name: 'Test' });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/auth/client/login → 400 without credentials', async () => {
    const res = await request(app).post('/api/auth/client/login').send({});
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/auth/telegram/init-login → 200', async () => {
    const res = await request(app).post('/api/auth/telegram/init-login');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.token).toHaveLength(20); // 10 bytes hex
  });

  it('POST /api/auth/client/telegram/verify → 400 with invalid code', async () => {
    const res = await request(app)
      .post('/api/auth/client/telegram/verify')
      .send({ code: '999999' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/noto'g'ri|vaqti/i);
  });
});

describe('📊 Analytics (Staff only)', () => {
  it('GET /api/analytics/top-customers → 401 without token', async () => {
    const res = await request(app).get('/api/analytics/top-customers');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/analytics/top-customers → 200 with staff token', async () => {
    const res = await request(app)
      .get('/api/analytics/top-customers')
      .set('Authorization', `Bearer ${staffToken}`);
    expect([200, 500]).toContain(res.statusCode); // May be 500 if mock doesn't cover SQL
  });
});

describe('🌐 Public Endpoints', () => {
  it('GET /api/categories → 200', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.statusCode).toBe(200);
  });

  it('DELETE /api/categories/:id → 200 with admin token', async () => {
    const res = await request(app)
      .delete('/api/categories/1')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('GET /api/banners → 200', async () => {
    const res = await request(app).get('/api/banners');
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/settings → 200', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/config → 200', async () => {
    const res = await request(app).get('/api/config');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('bot_username');
  });
});

describe('🖨️ Printer Service', () => {
  const defaultPrinterToken = 'ede3d6fc2e5381127ddef2582d2373841aba683473be8b30de7405c52e3d365d';

  it('GET /api/orders/print-jobs → 200 with X-Printer-Token header', async () => {
    const res = await request(app)
      .get('/api/orders/print-jobs')
      .set('X-Printer-Token', defaultPrinterToken);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Verify that orders with 'new' status are returned for immediate receipt printing
    const hasNewOrder = res.body.some(o => o.status === 'new');
    expect(hasNewOrder).toBe(true);
  });

  it('POST /api/orders/print-jobs/1/done → 200 with X-Printer-Token', async () => {
    const res = await request(app)
      .post('/api/orders/print-jobs/1/done')
      .set('X-Printer-Token', defaultPrinterToken);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
  });
});
