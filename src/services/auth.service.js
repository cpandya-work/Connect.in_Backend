const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const Otp = require('../models/Otp.model');
const generateOTP = require('../utils/generateOTP');
const { signToken } = require('../config/jwt');
const { saveUserToken } = require('./notification.service');

const sendOtp = async (phoneNumber) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes for client testing

  await Otp.findOneAndUpdate(
    { phoneNumber },
    { code: otp, expiresAt },
    { upsert: true, new: true }
  );

  console.log(`OTP for ${phoneNumber}: ${otp}`); // Replace with SMS
  return { success: true };
};

const verifyOtp = async (phoneNumber, otp, fcmToken = null, deviceType = 'android') => {
  const otpDoc = await Otp.findOne({ phoneNumber, code: otp });
  if (!otpDoc || otpDoc.expiresAt < new Date()) {
    throw new Error('Invalid or expired OTP');
  }

  let user = await User.findOne({ phoneNumber });
  const isNewUser = !user;

  if (!user) {
    user = await User.create({ phoneNumber });
  }

  // Save FCM token if provided
  if (fcmToken) {
    await saveUserToken(user._id, fcmToken, deviceType);
  }

  await Otp.deleteOne({ _id: otpDoc._id });

  const token = signToken({ id: user._id });
  const isProfileComplete = !!user.userDetailId;

  return { token, isNewUser, isProfileComplete, user };
};

const loginWithEmail = async (email, password, fcmToken = null, deviceType = 'web') => {
  const userDetail = await UserDetail.findOne({ email });
  if (!userDetail) {
    throw new Error('Invalid email');
  }

  const isPasswordValid = await userDetail.comparePassword(password);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  const user = await User.findOne({ userDetailId: userDetail._id });
  if (!user) {
    throw new Error('User account not found');
  }

  // Save FCM token if provided
  if (fcmToken) {
    await saveUserToken(user._id, fcmToken, deviceType);
  }

  const token = signToken({ id: user._id });
  const isProfileComplete = true; // Profile exists if we found userDetail

  return { token, isNewUser: false, isProfileComplete, user };
};

module.exports = { sendOtp, verifyOtp, loginWithEmail };