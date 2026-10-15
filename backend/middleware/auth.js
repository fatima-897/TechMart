const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protects a route: requires a valid "Authorization: Bearer <token>" header.
// On success, attaches req.userId for the route to use.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Blocks non-admins. Must run AFTER requireAuth, since it needs req.userId to already be set.
async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'failed to verify admin status' });
  }
}

module.exports = { requireAuth, requireAdmin };
