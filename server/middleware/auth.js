require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const PRINTER_SECRET = process.env.PRINTER_SECRET;

/**
 * requireAuth(allowedRoles)
 * Checks JWT from Authorization header and verifies role.
 * @param {string[]} allowedRoles - e.g. ['admin','superadmin'] or [] for any authenticated user
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
      if (['admin', 'superadmin', 'waiter', 'cashier'].includes(role)) return next();
    } catch (e) {}
  }

  // IP allowlist fallback: localhost printer client
  const clientIp = req.ip || req.connection?.remoteAddress;
  if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1') return next();

  return res.status(401).json({ error: 'Printer autentifikatsiya talab qilinadi' });
}

const requireStaff = requireAuth(['admin', 'superadmin', 'waiter', 'cashier']);
const requireAdmin = requireAuth(['admin', 'superadmin']);
const requireClient = requireAuth(['client']);
const requireAnyAuth = requireAuth([]);

module.exports = {
  requireAuth,
  optionalAuth,
  requirePrinter,
  requireStaff,
  requireAdmin,
  requireClient,
  requireAnyAuth,
};
