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

  const { phoneNumber, otp, fcmToken, deviceType, trafficSource } = req.body;
  const { token, isNewUser, isProfileComplete } = await verifyOtp(phoneNumber, otp, fcmToken, deviceType, trafficSource);

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

const UserDetail = require('../models/UserDetail.model');

const verifyEmailCtrl = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invalid Token - Connect India</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fe; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); text-align: center; max-width: 440px; width: 90%; }
          .icon { width: 64px; height: 64px; background: #fef2f2; color: #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px; }
          h2 { color: #0f172a; margin: 0 0 10px; font-size: 22px; }
          p { color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
          .btn { background: #ec7523; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✕</div>
          <h2>Verification Link Invalid</h2>
          <p>No verification token was provided. Please check the link in your email.</p>
          <a href="https://connect.in" class="btn">Go to Connect India</a>
        </div>
      </body>
      </html>
    `);
  }

  const userDetail = await UserDetail.findOne({ emailVerificationToken: token });

  if (!userDetail) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invalid Token - Connect India</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fe; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); text-align: center; max-width: 440px; width: 90%; }
          .icon { width: 64px; height: 64px; background: #fef2f2; color: #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px; }
          h2 { color: #0f172a; margin: 0 0 10px; font-size: 22px; }
          p { color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
          .btn { background: #ec7523; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✕</div>
          <h2>Expired or Invalid Link</h2>
          <p>This verification link is either invalid or has already been used.</p>
          <a href="https://connect.in" class="btn">Go to Connect India</a>
        </div>
      </body>
      </html>
    `);
  }

  userDetail.isEmailVerified = true;
  userDetail.emailVerificationToken = null;
  userDetail.emailVerificationExpires = null;
  await userDetail.save();

  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verified - Connect India</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fe; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); text-align: center; max-width: 440px; width: 90%; }
        .icon { width: 64px; height: 64px; background: #f0fdf4; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px; }
        h2 { color: #0f172a; margin: 0 0 10px; font-size: 22px; }
        p { color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
        .btn { background: #ec7523; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">✓</div>
        <h2>Email Verified!</h2>
        <p>Your email address <strong>${userDetail.email}</strong> has been successfully verified. You will now receive mailers and updates on Connect India.</p>
        <a href="https://connect.in" class="btn">Go to Connect India</a>
      </div>
    </body>
    </html>
  `);
});

module.exports = { sendOtpCtrl, verifyOtpCtrl, loginWithEmailCtrl, googleLoginCtrl, verifyEmailCtrl };