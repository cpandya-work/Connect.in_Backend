const { verifyToken } = require('../config/jwt');
const User = require('../models/User.model');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Your account has been deleted. Please contact admin.' });
    }
    if (user.isActive === false) {
      return res.status(401).json({ success: false, message: 'Your account has been disabled. Please contact admin.' });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};


// Optional authentication - doesn't fail if no token, but sets user if valid token is provided
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) {
    return next(); // Continue without authentication
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (user && user.isActive !== false) {
      req.user = user;
    }
    next();
  } catch (err) {
    // If token is invalid, just continue without setting user
    next();
  }
};

module.exports = { protect, optionalAuth };