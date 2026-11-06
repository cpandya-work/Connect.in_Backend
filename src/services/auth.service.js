const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const Otp = require('../models/Otp.model');
const EmailOtp = require('../models/EmailOtp.model');
const generateOTP = require('../utils/generateOTP');
const { signToken } = require('../config/jwt');
const { saveUserToken } = require('./notification.service');
const { sendEmailOtpCode } = require('./email.service');
const axios = require('axios');


const sendOtp = async (phoneNumber) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes for client testing

  await Otp.findOneAndUpdate(
    { phoneNumber },
    { code: otp, expiresAt },
    { upsert: true, new: true }
  );
  
  await axios.get(`https://bulkpush.mytoday.com/BulkSms/SingleMsgApi?feedid=393258&username=9884196886&password=SuX@2egALigzEKZ&To=${phoneNumber}&Text=Dear%20User%20Your%20OTP%20for%20completing%20the%20registration%20in%20Connect%20is%20${otp}.%20-%20Connect%20India%20Team&templateid=1207172657402140627&entityid=1201160765852941646&senderid=CONCTN`)

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
  let isEmailVerified = false;
  let email = null;
  if (user.userDetailId) {
    const userDetail = await UserDetail.findById(user.userDetailId);
    isProfileComplete = userDetail ? (userDetail.isProfileComplete === true) : false;
    isEmailVerified = userDetail ? (userDetail.isEmailVerified === true) : false;
    email = userDetail ? userDetail.email : null;
  }

  return { token, isNewUser, isProfileComplete, isEmailVerified, email, user };
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

const sendEmailOtp = async (email, user = null) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if this email is already registered and in use by another user
  const existingUserDetail = await UserDetail.findOne({ email: normalizedEmail });
  if (existingUserDetail) {
    const isCurrentUser = user && user.userDetailId && user.userDetailId.toString() === existingUserDetail._id.toString();
    if (!isCurrentUser) {
      throw new Error('This email address is already in use by another account');
    }
  }

  // Generate 6-digit random numeric code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await EmailOtp.findOneAndUpdate(
    { email: normalizedEmail },
    { code: otp, expiresAt },
    { upsert: true, new: true }
  );

  await sendEmailOtpCode(normalizedEmail, otp);

  return { success: true, message: 'Verification code sent to your email' };
};

const verifyEmailOtp = async (email, otp, user = null, phoneNumber = null) => {
  const normalizedEmail = email.toLowerCase().trim();

  const otpDoc = await EmailOtp.findOne({ email: normalizedEmail, code: otp.trim() });
  if (!otpDoc || otpDoc.expiresAt < new Date()) {
    throw new Error('Invalid or expired verification code. Please try again.');
  }

  // Delete used OTP
  await EmailOtp.deleteOne({ _id: otpDoc._id });

  let targetUser = user;
  if (!targetUser && phoneNumber) {
    targetUser = await User.findOne({ phoneNumber });
  }

  // If user is resolved, update UserDetail
  if (targetUser) {
    if (targetUser.userDetailId) {
      await UserDetail.findByIdAndUpdate(targetUser.userDetailId, {
        isEmailVerified: true,
        email: normalizedEmail,
      });
    } else {
      const userDetail = await UserDetail.create({
        email: normalizedEmail,
        isEmailVerified: true,
      });
      await User.findByIdAndUpdate(targetUser._id, { userDetailId: userDetail._id });
    }
  }

  return { success: true, message: 'Email verified successfully', email: normalizedEmail };
};

const googleVerifyEmail = async (accessToken, user = null, phoneNumber = null) => {
  if (!accessToken) {
    throw new Error('Access token is required');
  }

  // Step 1: Fetch user info from Google using access token
  const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const { email, name } = userInfoResponse.data;

  if (!email) {
    throw new Error('Email not provided by Google');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Step 2: Check if this email is already registered and in use by another user
  const existingUserDetail = await UserDetail.findOne({ email: normalizedEmail });
  if (existingUserDetail) {
    let currentDetailId = null;
    if (user && user.userDetailId) {
      currentDetailId = user.userDetailId.toString();
    } else if (phoneNumber) {
      const userByPhone = await User.findOne({ phoneNumber });
      if (userByPhone && userByPhone.userDetailId) {
        currentDetailId = userByPhone.userDetailId.toString();
      }
    }

    if (!currentDetailId || currentDetailId !== existingUserDetail._id.toString()) {
      throw new Error('This email address is already in use by another account');
    }
  }

  // Step 3: Resolve target user
  let targetUser = user;
  if (!targetUser && phoneNumber) {
    targetUser = await User.findOne({ phoneNumber });
  }

  let fullNameToSet = name ? name.trim() : '';

  // Step 4: Update or create UserDetail with verified email and name
  if (targetUser) {
    if (targetUser.userDetailId) {
      const userDetail = await UserDetail.findById(targetUser.userDetailId);
      if (userDetail) {
        userDetail.email = normalizedEmail;
        userDetail.isEmailVerified = true;
        if (!userDetail.fullName && fullNameToSet) {
          userDetail.fullName = fullNameToSet;
        } else if (userDetail.fullName) {
          fullNameToSet = userDetail.fullName;
        }
        await userDetail.save();
      }
    } else {
      const userDetail = await UserDetail.create({
        email: normalizedEmail,
        isEmailVerified: true,
        fullName: fullNameToSet || undefined,
      });
      await User.findByIdAndUpdate(targetUser._id, { userDetailId: userDetail._id });
    }
  }

  return {
    success: true,
    email: normalizedEmail,
    name: fullNameToSet,
    isEmailVerified: true,
  };
};

module.exports = {
  sendOtp,
  verifyOtp,
  loginWithEmail,
  loginWithGoogle,
  sendEmailOtp,
  verifyEmailOtp,
  googleVerifyEmail,
};