const jwt = require('jsonwebtoken');

function issueToken(user){
  const payload = { user_id: String(user.user_id||user.id), username: user.username, email: user.email, role: user.role||null };
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'your_secret_key';
  return jwt.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES || '2h' });
}

function verifyToken(req){
  const auth = req.headers.authorization || '';
  const fromHeader = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const fromCookie = req.cookies && (req.cookies.token || req.cookies.jwt || null);
  const token = fromHeader || fromCookie;
  if (!token) return null;
  try {
    const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'your_secret_key';
    return jwt.verify(token, secret);
  } catch(e){
    return null;
  }
}

function requireJwt(req, res, next){
  const payload = verifyToken(req);
  if (!payload) {
    const wantsJson = (req.headers.accept && req.headers.accept.includes('application/json')) || req.get('X-Requested-With') === 'XMLHttpRequest';
    if (wantsJson) return res.status(401).json({ error: 'unauthenticated' });
    return res.redirect('/login');
  }
  req.user = payload;
  next();
}

function requireAdminJwt(req, res, next){
  const payload = verifyToken(req);
  if (!payload) {
    const wantsJson = (req.headers.accept && req.headers.accept.includes('application/json')) || req.get('X-Requested-With') === 'XMLHttpRequest';
    if (wantsJson) return res.status(401).json({ error: 'unauthenticated' });
    return res.redirect('/login');
  }
  const { isAdmin } = require('./adminAuth');
  if (!isAdmin(payload)) return res.status(403).json({ error: 'forbidden' });
  req.user = payload;
  next();
}

module.exports = { issueToken, requireJwt, requireAdminJwt }
