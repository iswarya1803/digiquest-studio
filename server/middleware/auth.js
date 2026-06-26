import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'digiquest_jwt_secret_key_2026';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function requireClient(req, res, next) {
  if (!req.user || req.user.role !== 'client') {
    return res.status(403).json({ error: 'Client access required' });
  }
  next();
}

export function requireClientOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(403).json({ error: 'Authentication required' });
  }
  if (req.user.role === 'admin') {
    return next();
  }
  if (req.user.role === 'client' && req.body.client_id && parseInt(req.body.client_id) === req.user.id) {
    return next();
  }
  return res.status(403).json({ error: 'Admin or owning client access required' });
}
