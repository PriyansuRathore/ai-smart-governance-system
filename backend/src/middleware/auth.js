const User = require('../models/User');
const { verifyToken } = require('../utils/auth');

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Authentication token is required' });
    }

    const payload = verifyToken(token);
    const user = await User.findByPk(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found for token' });
    }

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department || null };
    next();
  } catch (err) {
    return res.status(401).json({ error: err.message || 'Invalid token' });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to access this resource' });
    }

    next();
  };
}

module.exports = { authenticateToken, authorizeRoles };
