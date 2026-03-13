const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authorised — token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password +tokenVersion');
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    // Reject tokens from previous sessions (e.g. another device)
    const decodedVersion = decoded.tokenVersion ?? 0;
    const userVersion = user.tokenVersion ?? 0;
    if (decodedVersion !== userVersion) {
      return res.status(401).json({ error: 'Session expired — please log in again' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { protect, adminOnly };
