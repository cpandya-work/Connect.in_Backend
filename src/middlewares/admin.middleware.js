const { protect } = require('./auth.middleware');

// Admin middleware - checks if user is admin
// First applies authentication, then checks admin status
const isAdmin = (req, res, next) => {
  // First apply authentication middleware
  protect(req, res, () => {
    // After authentication, check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin only.' 
      });
    }

    next();
  });
};

module.exports = { isAdmin };
