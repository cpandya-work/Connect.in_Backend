const express = require('express');
const { sendOtpCtrl, verifyOtpCtrl, loginWithEmailCtrl, googleLoginCtrl } = require('../controllers/auth.controller');
const { logout } = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/send-otp', sendOtpCtrl);
router.post('/verify-otp', verifyOtpCtrl);
router.post('/login-with-email', loginWithEmailCtrl);
router.post('/google-login', googleLoginCtrl);
router.post('/logout', protect, logout);

module.exports = router;