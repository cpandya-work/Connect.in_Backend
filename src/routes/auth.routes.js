const express = require('express');
const {
  sendOtpCtrl,
  verifyOtpCtrl,
  loginWithEmailCtrl,
  googleLoginCtrl,
  verifyEmailCtrl,
  sendEmailOtpCtrl,
  verifyEmailOtpCtrl,
} = require('../controllers/auth.controller');
const { logout } = require('../controllers/user.controller');
const { protect, optionalAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/verify-email', verifyEmailCtrl);
router.post('/send-otp', sendOtpCtrl);
router.post('/verify-otp', verifyOtpCtrl);
router.post('/send-email-otp', optionalAuth, sendEmailOtpCtrl);
router.post('/verify-email-otp', optionalAuth, verifyEmailOtpCtrl);
router.post('/login-with-email', loginWithEmailCtrl);
router.post('/google-login', googleLoginCtrl);
router.post('/logout', protect, logout);


// Lightweight account-status check used by the frontend session poller.
// protect middleware already handles disabled/deleted accounts with a 401.
router.get('/status', protect, (req, res) => {
  res.json({ success: true, isActive: true });
});

module.exports = router;