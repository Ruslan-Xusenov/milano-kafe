require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// --- Startup checks ---
if (!process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is not set. Server will not start.');
  process.exit(1);
}

// --- Middleware ---
const { requireStaff, requireAdmin, requireClient, requireAnyAuth, optionalAuth, requirePrinter } = require('./middleware/auth');

// --- Routes ---
const ordersRouter     = require('./routes/orders');
const menuRouter       = require('./routes/menu');
const categoriesRouter = require('./routes/categories');
const bannersRouter    = require('./routes/banners');
const settingsRouter   = require('./routes/settings');
const inventoryRouter  = require('./routes/inventory');
const staffRouter      = require('./routes/staff');
const authRouter       = require('./routes/auth');
const notifRouter      = require('./routes/notifications');
const analyticsRouter  = require('./routes/analytics');

// --- DB / Bot / Push ---
const db = require('./db');

// --- CORS ---
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['https://milano.securehub.uz'];

const app = express();
app.set('trust proxy', 1);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/
        .test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));

// ============================================================
// --- Rate Limiting ---
// ============================================================

// General: 500 req / 15 min
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'So\'rovlar juda ko\'p. 15 daqiqadan so\'ng qayta urinib ko\'ring.' },
  validate: { xForwardedForHeader: false, trustProxy: false },
});

// Kanban polling: 2000 req / 15 min (staff GET /api/orders only)
const kanbanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: false,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, trustProxy: false },
});

// Auth: strict — 20 req / 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  legacyHeaders: false,
  message: { error: 'Xavfsizlik nuqtai nazaridan vaqtinchalik cheklov. Keyinroq urinib ko\'ring.' },
  validate: { xForwardedForHeader: false, trustProxy: false },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// ============================================================
// --- PUBLIC / UTILITY ENDPOINTS ---
// ============================================================

app.get('/api/test-ip', (req, res) => {
  res.json({ ip: req.ip, ips: req.ips, xff: req.headers['x-forwarded-for'] });
});

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

// ============================================================
// --- AUTH ROUTES (public + client) ---
// ============================================================
app.use('/api/auth', authRouter);

// ============================================================
// --- ORDERS ---
// ============================================================

// Create a sub-router for orders with middleware applied per-route
const ordersBase = express.Router();

// Kanban polling — staff only, special limiter
ordersBase.get('/', kanbanLimiter, requireStaff, (req, res, next) => {
  req.url = '/';
  ordersRouter(req, res, next);
});

// Print jobs — requirePrinter auth (must be before /:id routes)
ordersBase.get('/print-jobs', requirePrinter, (req, res, next) => {
  req.url = '/print-jobs'; ordersRouter(req, res, next);
});
ordersBase.post('/print-jobs/:id/done', requirePrinter, (req, res, next) => {
  req.url = `/print-jobs/${req.params.id}/done`; ordersRouter(req, res, next);
});

// Gift order — requireStaff (must be before /:id routes)
ordersBase.post('/gift', requireStaff, (req, res, next) => {
  req.url = '/gift'; ordersRouter(req, res, next);
});

// User orders — IDOR protected (must be before /:id routes)
ordersBase.get('/user/:id', requireClient, (req, res, next) => {
  req.url = `/user/${req.params.id}`; ordersRouter(req, res, next);
});

// Reviews — staff only
ordersBase.get('/reviews', requireStaff, (req, res) => {
  db.all('SELECT * FROM reviews ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// New order — optionalAuth
ordersBase.post('/', optionalAuth, (req, res, next) => {
  req.url = '/';
  ordersRouter(req, res, next);
});

// Rate order — optionalAuth
ordersBase.post('/:id/rate', optionalAuth, (req, res, next) => {
  req.url = `/${req.params.id}/rate`; ordersRouter(req, res, next);
});

// Status update — staff
ordersBase.put('/:id/status', requireStaff, (req, res, next) => {
  req.url = `/${req.params.id}/status`; ordersRouter(req, res, next);
});

// Payment update — staff
ordersBase.put('/:id/payment', requireStaff, (req, res, next) => {
  req.url = `/${req.params.id}/payment`; ordersRouter(req, res, next);
});

app.use('/api/orders', ordersBase);

// Reviews shortcut
app.get('/api/reviews', requireStaff, (req, res) => {
  db.all('SELECT * FROM reviews ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Push token — client auth
app.post('/api/users/push-token', requireClient, (req, res, next) => {
  req.url = '/push-token'; ordersRouter(req, res, next);
});

// ============================================================
// --- MENU ---
// ============================================================
const menuBase = express.Router();
menuBase.get('/', (req, res, next) => { req.url = '/'; menuRouter(req, res, next); });
menuBase.post('/', requireAdmin, (req, res, next) => { req.url = '/'; menuRouter(req, res, next); });
menuBase.get('/:id/ingredients', requireStaff, (req, res, next) => { req.url = `/${req.params.id}/ingredients`; menuRouter(req, res, next); });
menuBase.post('/:id/ingredients', requireAdmin, (req, res, next) => { req.url = `/${req.params.id}/ingredients`; menuRouter(req, res, next); });
menuBase.delete('/ingredients/:id', requireAdmin, (req, res, next) => { req.url = `/ingredients/${req.params.id}`; menuRouter(req, res, next); });
menuBase.put('/:id', requireAdmin, (req, res, next) => { req.url = `/${req.params.id}`; menuRouter(req, res, next); });
menuBase.delete('/:id', requireAdmin, (req, res, next) => { req.url = `/${req.params.id}`; menuRouter(req, res, next); });
menuBase.patch('/:id/toggle-available', requireAdmin, (req, res, next) => { req.url = `/${req.params.id}/toggle-available`; menuRouter(req, res, next); });
menuBase.patch('/:id/discount', requireAdmin, (req, res, next) => { req.url = `/${req.params.id}/discount`; menuRouter(req, res, next); });
app.use('/api/menu', menuBase);

// ============================================================
// --- CATEGORIES, BANNERS, SETTINGS (public GET) ---
// ============================================================
app.use('/api/categories', categoriesRouter);
app.use('/api/banners', bannersRouter);
app.use('/api/settings', settingsRouter);

// ============================================================
// --- INVENTORY (staff GET, admin WRITE) ---
// ============================================================
const inventoryBase = express.Router();
inventoryBase.get('/', requireStaff, (req, res, next) => { req.url = '/'; inventoryRouter(req, res, next); });
inventoryBase.post('/', requireAdmin, (req, res, next) => { req.url = '/'; inventoryRouter(req, res, next); });
inventoryBase.put('/:id', requireAdmin, (req, res, next) => { req.url = `/${req.params.id}`; inventoryRouter(req, res, next); });
inventoryBase.delete('/:id', requireAdmin, (req, res, next) => { req.url = `/${req.params.id}`; inventoryRouter(req, res, next); });
app.use('/api/inventory', inventoryBase);

// ============================================================
// --- STAFF + WORK SESSIONS ---
// ============================================================
const staffBase = express.Router();
staffBase.get('/', requireStaff, (req, res, next) => { req.url = '/'; staffRouter(req, res, next); });
staffBase.post('/', requireAdmin, (req, res, next) => { req.url = '/'; staffRouter(req, res, next); });
staffBase.delete('/:id', requireAdmin, (req, res, next) => { req.url = `/${req.params.id}`; staffRouter(req, res, next); });
staffBase.get('/work-sessions/current/:staffId', requireStaff, (req, res, next) => { req.url = `/work-sessions/current/${req.params.staffId}`; staffRouter(req, res, next); });
staffBase.post('/work-sessions/start', requireStaff, (req, res, next) => { req.url = '/work-sessions/start'; staffRouter(req, res, next); });
staffBase.post('/work-sessions/end', requireStaff, (req, res, next) => { req.url = '/work-sessions/end'; staffRouter(req, res, next); });
staffBase.get('/work-sessions/earned/:staffId', requireStaff, (req, res, next) => { req.url = `/work-sessions/earned/${req.params.staffId}`; staffRouter(req, res, next); });
app.use('/api/staff', staffBase);

// ============================================================
// --- NOTIFICATIONS ---
// ============================================================
app.use('/api/notifications', requireAnyAuth, notifRouter);

// ============================================================
// --- ANALYTICS ---
// ============================================================
app.use('/api/analytics', requireStaff, analyticsRouter);

// ============================================================
// --- STARTUP MIGRATION (idempotent) ---
// ============================================================
async function runStartupMigrations() {
  // discount_percent ustuni — menu_items
  await new Promise((resolve) => {
    db.run('ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0', [], (err) => {
      if (err && !err.message.includes('already exists')) console.warn('[migration] discount_percent:', err.message);
      resolve();
    });
  });

  // temp_tokens — tokenStore uchun (global.* o'rniga)
  await new Promise((resolve) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS temp_tokens (
        token TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        data JSONB,
        expires_at BIGINT NOT NULL
      )`,
      [],
      (err) => {
        if (err) console.warn('[migration] temp_tokens:', err.message);
        else console.log('[migration] temp_tokens jadval tayyor');
        resolve();
      }
    );
  });
}

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  runStartupMigrations().then(() => {
    // Bot ni lazy-load qilamiz (test muhitida yuklanmasin)
    require('./bot');
    app.listen(PORT, () => {
      console.log(`🚀 Server http://localhost:${PORT} da ishga tushdi`);
    });
  });
}

module.exports = app;