const asyncHandler = require('../utils/asyncHandler');
const { sendOtp, verifyOtp, loginWithEmail, loginWithGoogle } = require('../services/auth.service');
const { sendOtpSchema, verifyOtpSchema, loginSchema } = require('../validators/auth.validator');
const { success } = require('../utils/response');

const sendOtpCtrl = asyncHandler(async (req, res) => {
  const { error } = sendOtpSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  await sendOtp(req.body.phoneNumber);
  success(res, null, 'OTP sent successfully');
});

const verifyOtpCtrl = asyncHandler(async (req, res) => {
  const { error } = verifyOtpSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const { phoneNumber, otp, fcmToken, deviceType } = req.body;
  const { token, isNewUser, isProfileComplete } = await verifyOtp(phoneNumber, otp, fcmToken, deviceType);

  success(res, { token, isNewUser, isProfileComplete }, 'Login successful');
});

const loginWithEmailCtrl = asyncHandler(async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const { email, password, fcmToken, deviceType } = req.body;
  const { token, isNewUser, isProfileComplete } = await loginWithEmail(email, password, fcmToken, deviceType);

  success(res, { token, isNewUser, isProfileComplete }, 'Login successful');
});

const googleLoginCtrl = asyncHandler(async (req, res) => {
  const { accessToken, fcmToken, deviceType } = req.body;

  if (!accessToken) {
    return res.status(400).json({ success: false, message: 'Access token is required' });
  }

  const { token, isNewUser, isProfileComplete } = await loginWithGoogle(accessToken, fcmToken, deviceType);

  success(res, { token, isNewUser, isProfileComplete }, 'Login successful');
});

module.exports = { sendOtpCtrl, verifyOtpCtrl, loginWithEmailCtrl, googleLoginCtrl };