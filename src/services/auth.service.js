const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const Otp = require('../models/Otp.model');
const generateOTP = require('../utils/generateOTP');
const { signToken } = require('../config/jwt');
const { saveUserToken } = require('./notification.service');
const axios = require('axios');

const sendOtp = async (phoneNumber) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes for client testing

  await Otp.findOneAndUpdate(
    { phoneNumber },
    { code: otp, expiresAt },
    { upsert: true, new: true }
  );
  await axios.get(`https://test1bulksms.mytoday.com/BulkSms/SingleMsgApi?feedid=393258&username=9884196886&password=SuX@2egALigzEKZ&To=${phoneNumber}&Text=Dear%20User%20Your%20OTP%20for%20completing%20the%20registration%20in%20Connect%20is%20${otp}.%20-%20Connect%20India%20Team&templateid=1207172657402140627&entityid=1201160765852941646&senderid=CONCTN`)

  console.log(`OTP for ${phoneNumber}: ${otp}`); // Replace with SMS
  return { success: true };
};

const verifyOtp = async (phoneNumber, otp, fcmToken = null, deviceType = 'android', trafficSource = null) => {
  const otpDoc = await Otp.findOne({ phoneNumber, code: otp });
  if (!otpDoc || otpDoc.expiresAt < new Date()) {
    throw new Error('The OTP you entered is invalid. Please try again.');
  }

  let user = await User.findOne({ phoneNumber });
  if (user && user.isActive === false) {
    throw new Error('Your account has been disabled. Please contact admin.');
  }
  const isNewUser = !user;

  if (!user) {
    user = await User.create({ phoneNumber, trafficSource: trafficSource || 'direct' });
  } else if (trafficSource && (!user.trafficSource || user.trafficSource === 'direct')) {
    user.trafficSource = trafficSource;
    await user.save();
  }

  // Save FCM token if provided
  if (fcmToken) {
    await saveUserToken(user._id, fcmToken, deviceType);
  }

  await Otp.deleteOne({ _id: otpDoc._id });

  const token = signToken({ id: user._id });

  // Check if profile is actually complete by checking UserDetail.isProfileComplete
  let isProfileComplete = false;
  if (user.userDetailId) {
    const userDetail = await UserDetail.findById(user.userDetailId);
    isProfileComplete = userDetail ? (userDetail.isProfileComplete === true) : false;
  }

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
  if (user.isActive === false) {
    throw new Error('Your account has been disabled. Please contact admin.');
  }

  // Save FCM token if provided
  if (fcmToken) {
    await saveUserToken(user._id, fcmToken, deviceType);
  }

  const token = signToken({ id: user._id });
  // Check if profile is actually complete by checking UserDetail.isProfileComplete
  const isProfileComplete = userDetail.isProfileComplete === true;

  return { token, isNewUser: false, isProfileComplete, user };
};

const loginWithGoogle = async (accessToken, fcmToken = null, deviceType = 'web') => {
  // Step 1: Fetch user information from Google using access token
  const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const { email } = userInfoResponse.data;

  if (!email) {
    throw new Error('Email not provided by Google');
  }

  // Step 2: Check if user exists by email
  const userDetail = await UserDetail.findOne({ email });
  if (!userDetail) {
    throw new Error('User not found. Please sign up first.');
  }

  // Step 3: Find the User document
  const user = await User.findOne({ userDetailId: userDetail._id });
  if (!user) {
    throw new Error('User account not found');
  }
  if (user.isActive === false) {
    throw new Error('Your account has been disabled. Please contact admin.');
  }

  // Save FCM token if provided
  if (fcmToken) {
    await saveUserToken(user._id, fcmToken, deviceType);
  }

  // Step 4: Generate JWT token
  const token = signToken({ id: user._id });
  // Check if profile is actually complete by checking UserDetail.isProfileComplete
  const isProfileComplete = userDetail.isProfileComplete === true;

  return { token, isNewUser: false, isProfileComplete, user };
};

module.exports = { sendOtp, verifyOtp, loginWithEmail, loginWithGoogle };