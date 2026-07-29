const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const City = require('../models/City.model');
const Company = require('../models/Company.model');
const Industry = require('../models/Industry.model');
const Position = require('../models/Position.model');
const { profileSchema, updateProfileSchema } = require('../validators/user.validator');
const { success } = require('../utils/response');
const { getPublicProfile, updateProfile, deleteAccount } = require('../services/user.service');
const { sendRegistrationEmail } = require('../services/email.service');
const { sendRegistrationSms } = require('../services/sms.service');
const { verifyToken } = require('../config/jwt');
const mongoose = require('mongoose');

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'userDetailId',
    populate: { path: 'city', model: 'City' }
  });
  
  if (!user.userDetailId) {
    return success(res, { profile: null });
  }
  
  // Get city name
  let cityName = null;
  if (user.userDetailId.city) {
    if (typeof user.userDetailId.city === 'object' && user.userDetailId.city.name) {
      // City is populated
      cityName = user.userDetailId.city.name;
    } else if (mongoose.Types.ObjectId.isValid(user.userDetailId.city)) {
      // City is stored as ObjectId, fetch it
      const city = await City.findById(user.userDetailId.city);
      if (city) {
        cityName = city.name;
      }
    }
  }
  
  // Get company name if company is a valid ObjectId
  let companyName = user.userDetailId.company;
  if (user.userDetailId.company && mongoose.Types.ObjectId.isValid(user.userDetailId.company)) {
    const company = await Company.findById(user.userDetailId.company);
    if (company) {
      companyName = company.name;
    }
  }
  
  // Get industry name if industry is a valid ObjectId
  let industryName = user.userDetailId.industry;
  if (user.userDetailId.industry && mongoose.Types.ObjectId.isValid(user.userDetailId.industry)) {
    const industry = await Industry.findById(user.userDetailId.industry);
    if (industry) {
      industryName = industry.name;
    }
  }

  // Get position name if position is a valid ObjectId
  let positionName = user.userDetailId.position;
  if (user.userDetailId.position && mongoose.Types.ObjectId.isValid(user.userDetailId.position)) {
    const positionObj = await Position.findById(user.userDetailId.position);
    if (positionObj) {
      positionName = positionObj.name;
    }
  }
  
  const userDetailObj = user.userDetailId.toObject();
  
  // Replace IDs with names
  const profile = {
    phoneNumber: user.phoneNumber,
    currentLocation: user.currentLocation,
    email: userDetailObj.email,
    password: userDetailObj.originalPassword || userDetailObj.password,
    originalid: user._id,
    role: user.role || 'user', // Include user role
    ...userDetailObj,
    city: cityName, // Replace city ID with city name
    company: companyName, // Replace company ID with company name
    industry: industryName, // Replace industry ID with industry name
    position: positionName, // Replace position ID with position name
  };
  
  success(res, { profile });
});

const createProfile = asyncHandler(async (req, res) => {
  const { error } = profileSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const profileImage = req.files?.profileImage?.[0]?.path || null;
  const coverImage = req.files?.coverImage?.[0]?.path || null;
  
  // Get user - check token first, then userId/phoneNumber from body
  let user = null;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  console.log("Token",token)
  if (token) {
    // If token is provided, verify it and get user
    try {
      const decoded = verifyToken(token);
      user = await User.findById(decoded.id).populate('userDetailId');
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  } else {
    // If no token, try to get user from request body
    const { userId, phoneNumber } = req.body;
    
    if (userId) {
      user = await User.findById(userId).populate('userDetailId');
    } else if (phoneNumber) {
      user = await User.findOne({ phoneNumber }).populate('userDetailId');
    }
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'User ID or phone number is required' });
    }
  }
  
  // Check if email already exists (excluding current user's email)
  if (user.userDetailId && user.userDetailId.email !== req.body.email) {
    const isUserExists = await UserDetail.findOne({ email: req.body.email });
    if (isUserExists) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
  } else if (!user.userDetailId) {
    const isUserExists = await UserDetail.findOne({ email: req.body.email });
    if (isUserExists) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
  }
  console.log("Profile create api")
  let detail;
  if (user.userDetailId) {
    // Update existing profile and mark as complete
    detail = await UserDetail.findByIdAndUpdate(
      user.userDetailId._id,
      {
        ...req.body,
        profileImage: profileImage || user.userDetailId.profileImage,
        coverImage: coverImage || user.userDetailId.coverImage,
        habits: Array.isArray(req.body.habits) ? req.body.habits : (req.body.habits?.split(',').map(h => h.trim()).filter(Boolean) || []),
        interests: Array.isArray(req.body.interests) ? req.body.interests : (req.body.interests?.split(',').map(i => i.trim()).filter(Boolean) || []),
        skills: Array.isArray(req.body.skills) ? req.body.skills : (req.body.skills?.split(',').map(s => s.trim()).filter(Boolean) || []),
        sports: Array.isArray(req.body.sports) ? req.body.sports : (req.body.sports?.split(',').map(s => s.trim()).filter(Boolean) || []),
        preferredLanguage: Array.isArray(req.body.preferredLanguage) ? req.body.preferredLanguage : (req.body.preferredLanguage?.split(',').map(l => l.trim()).filter(Boolean) || []),
        lastCompletedStep: 9,
        isProfileComplete: true,
      },
      { new: true }
    );
  } else {
    // Create new profile
    detail = await UserDetail.create({
      ...req.body,
      profileImage,
      coverImage,
      habits: Array.isArray(req.body.habits) ? req.body.habits : (req.body.habits?.split(',').map(h => h.trim()).filter(Boolean) || []),
      interests: Array.isArray(req.body.interests) ? req.body.interests : (req.body.interests?.split(',').map(i => i.trim()).filter(Boolean) || []),
      skills: Array.isArray(req.body.skills) ? req.body.skills : (req.body.skills?.split(',').map(s => s.trim()).filter(Boolean) || []),
      sports: Array.isArray(req.body.sports) ? req.body.sports : (req.body.sports?.split(',').map(s => s.trim()).filter(Boolean) || []),
      preferredLanguage: Array.isArray(req.body.preferredLanguage) ? req.body.preferredLanguage : (req.body.preferredLanguage?.split(',').map(l => l.trim()).filter(Boolean) || []),
      lastCompletedStep: 9,
      isProfileComplete: true,
    });
    await User.findByIdAndUpdate(user._id, { userDetailId: detail._id });
  }
  
  const updatedUser = await User.findById(user._id);
  console.log("UpdatedUser data",updatedUser)
  const profile = {
    phoneNumber: updatedUser.phoneNumber,
    email: detail.email,
    ...detail.toObject(),
  };
   console.log("Details email",detail)
  success(res, { profile }, 'Profile completed');

  // Fire welcome email + SMS outside the request lifecycle
  setImmediate(() => {
    if (detail.email && detail.fullName) {
      sendRegistrationEmail(detail.email, detail.fullName).catch(() => {});
    }
    if (updatedUser.phoneNumber && detail.fullName) {
      sendRegistrationSms(updatedUser.phoneNumber, detail.fullName);
    }
  });
});

const getUserProfileById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profile = await getPublicProfile(id, req.user._id);
  success(res, { profile });
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const hasFiles = req.files && (
    (req.files.profileImage && req.files.profileImage.length > 0) ||
    (req.files.coverImage && req.files.coverImage.length > 0)
  );

  if (Object.keys(req.body).length > 0 || !hasFiles) {
    const { error } = updateProfileSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  }
  
  const updates = req.body;
  const files = req.files;

  const updatedProfile = await updateProfile(req.user._id, updates, files);
  
  // Get city name
  let cityName = null;
  if (updatedProfile.city) {
    if (typeof updatedProfile.city === 'object' && updatedProfile.city.name) {
      // City is populated
      cityName = updatedProfile.city.name;
    } else if (mongoose.Types.ObjectId.isValid(updatedProfile.city)) {
      // City is stored as ObjectId, fetch it
      const city = await City.findById(updatedProfile.city);
      if (city) {
        cityName = city.name;
      }
    }
  }
  
  // Get company name if company is a valid ObjectId
  let companyName = updatedProfile.company;
  if (updatedProfile.company && mongoose.Types.ObjectId.isValid(updatedProfile.company)) {
    const company = await Company.findById(updatedProfile.company);
    if (company) {
      companyName = company.name;
    }
  }
  
  // Get industry name if industry is a valid ObjectId
  let industryName = updatedProfile.industry;
  if (updatedProfile.industry && mongoose.Types.ObjectId.isValid(updatedProfile.industry)) {
    const industry = await Industry.findById(updatedProfile.industry);
    if (industry) {
      industryName = industry.name;
    }
  }

  // Get position name if position is a valid ObjectId
  let positionName = updatedProfile.position;
  if (updatedProfile.position && mongoose.Types.ObjectId.isValid(updatedProfile.position)) {
    const positionObj = await Position.findById(updatedProfile.position);
    if (positionObj) {
      positionName = positionObj.name;
    }
  }
  
  // Replace IDs with names in the response
  const profileWithNames = {
    ...updatedProfile,
    city: cityName,
    company: companyName,
    industry: industryName,
    position: positionName,
  };
  
  success(res, { profile: profileWithNames }, 'Profile updated');
});

const logout = asyncHandler(async (req, res) => {
  success(res, null, 'Logged out successfully');
});

const deleteUserAccount = asyncHandler(async (req, res) => {
  await deleteAccount(req.user._id);
  success(res, null, 'Account deleted successfully');
});

// Save profile step data (progressive saving)
const saveProfileStep = asyncHandler(async (req, res) => {
  // stepNumber comes from FormData, so it might be a string
  const stepNumber = parseInt(req.body.stepNumber, 10);
  const profileImage = req.files?.profileImage?.[0]?.path || null;
  const coverImage = req.files?.coverImage?.[0]?.path || null;
  
  if (!stepNumber || isNaN(stepNumber) || stepNumber < 1 || stepNumber > 9) {
    return res.status(400).json({ success: false, message: 'Invalid step number' });
  }

  const user = await User.findById(req.user._id).populate('userDetailId');
  
  // Prepare step data (only include fields for this step)
  const stepData = {};
  
  // Step 1: Basic info
  if (stepNumber === 1) {
    if (req.body.fullName) stepData.fullName = req.body.fullName;
    if (req.body.city) stepData.city = req.body.city;
    if (req.body.pincode) stepData.pincode = req.body.pincode;
    if (req.body.religion) stepData.religion = req.body.religion;
    if (req.body.status) stepData.status = req.body.status;
  }
  
  // Step 2: Personal details
  if (stepNumber === 2) {
    if (req.body.email) stepData.email = req.body.email;
    if (req.body.gender) stepData.gender = req.body.gender;
    if (req.body.dateOfBirth) {
      // Convert dateOfBirth to Date object if it's a string
      stepData.dateOfBirth = req.body.dateOfBirth instanceof Date 
        ? req.body.dateOfBirth 
        : new Date(req.body.dateOfBirth);
    }
  }
  
  // Step 3: Language
  if (stepNumber === 3) {
    if (req.body.preferredLanguage) {
      stepData.preferredLanguage = Array.isArray(req.body.preferredLanguage)
        ? req.body.preferredLanguage
        : (req.body.preferredLanguage.split(',').map(l => l.trim()).filter(Boolean) || []);
    }
  }
  
  // Step 4: Habits
  if (stepNumber === 4) {
    if (req.body.habits) {
      stepData.habits = Array.isArray(req.body.habits) 
        ? req.body.habits 
        : (req.body.habits.split(',').map(h => h.trim()).filter(Boolean) || []);
    }
  }
  
  // Step 5: Interests
  if (stepNumber === 5) {
    if (req.body.interests) {
      stepData.interests = Array.isArray(req.body.interests) 
        ? req.body.interests 
        : (req.body.interests.split(',').map(i => i.trim()).filter(Boolean) || []);
    }
  }
  
  // Step 6: Skills
  if (stepNumber === 6) {
    if (req.body.skills) {
      stepData.skills = Array.isArray(req.body.skills) 
        ? req.body.skills 
        : (req.body.skills.split(',').map(s => s.trim()).filter(Boolean) || []);
    }
  }
  
  // Step 7: Sports
  if (stepNumber === 7) {
    if (req.body.sports) {
      stepData.sports = Array.isArray(req.body.sports) 
        ? req.body.sports 
        : (req.body.sports.split(',').map(s => s.trim()).filter(Boolean) || []);
    }
  }
  
  // Step 8: Industry and Company
  if (stepNumber === 8) {
    if (req.body.industry) stepData.industry = req.body.industry;
    if (req.body.company) stepData.company = req.body.company;
    if (req.body.position !== undefined) stepData.position = req.body.position;
  }
  
  // Step 9: Profile Image
  if (stepNumber === 9 && profileImage) {
    stepData.profileImage = profileImage;
  }
  
  // Update lastCompletedStep
  stepData.lastCompletedStep = stepNumber;
  
  // If step 9 is completed, mark profile as complete
  if (stepNumber === 9) {
    stepData.isProfileComplete = true;
  }
  
  let userDetail;
  if (user.userDetailId) {
    // Update existing profile - use $set to update only provided fields, preserving existing ones
    const updateObj = {
      ...stepData,
      lastCompletedStep: stepNumber,
    };
    
    // If step 9, also set isProfileComplete
    if (stepNumber === 9) {
      updateObj.isProfileComplete = true;
    }
    
    userDetail = await UserDetail.findByIdAndUpdate(
      user.userDetailId._id,
      { $set: updateObj },
      { new: true, runValidators: false } // Don't validate incomplete data
    );
  } else {
    // Create new profile
    userDetail = await UserDetail.create({
      ...stepData,
      lastCompletedStep: stepNumber,
      isProfileComplete: stepNumber === 9 ? true : false,
    });
    await User.findByIdAndUpdate(req.user._id, { userDetailId: userDetail._id });
  }
  
  // Fire welcome email + SMS outside the request lifecycle
  if (stepNumber === 9 && userDetail.fullName) {
    setImmediate(() => {
      if (userDetail.email) {
        sendRegistrationEmail(userDetail.email, userDetail.fullName).catch(() => {});
      }
      if (req.user.phoneNumber) {
        sendRegistrationSms(req.user.phoneNumber, userDetail.fullName);
      }
    });
  }

  success(res, {
    profile: userDetail,
    lastCompletedStep: stepNumber
  }, 'Step saved successfully');
});

// Get profile progress (last completed step)
const getProfileProgress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('userDetailId');
  
  if (!user.userDetailId) {
    return success(res, { 
      lastCompletedStep: 0, 
      profile: null,
      isProfileComplete: false 
    });
  }
  
  // Fetch fresh data from database to ensure all fields are included
  const userDetail = await UserDetail.findById(user.userDetailId._id).populate('city');
  
  if (!userDetail) {
    return success(res, { 
      lastCompletedStep: 0, 
      profile: null,
      isProfileComplete: false 
    });
  }
  
  // Get city name
  let cityName = null;
  if (userDetail.city) {
    if (typeof userDetail.city === 'object' && userDetail.city.name) {
      // City is populated
      cityName = userDetail.city.name;
    } else if (mongoose.Types.ObjectId.isValid(userDetail.city)) {
      // City is stored as ObjectId, fetch it
      const city = await City.findById(userDetail.city);
      if (city) {
        cityName = city.name;
      }
    }
  }
  
  // Get company name if company is a valid ObjectId
  let companyName = userDetail.company;
  if (userDetail.company && mongoose.Types.ObjectId.isValid(userDetail.company)) {
    const company = await Company.findById(userDetail.company);
    if (company) {
      companyName = company.name;
    }
  }
  
  // Get industry name if industry is a valid ObjectId
  let industryName = userDetail.industry;
  if (userDetail.industry && mongoose.Types.ObjectId.isValid(userDetail.industry)) {
    const industry = await Industry.findById(userDetail.industry);
    if (industry) {
      industryName = industry.name;
    }
  }

  // Get position name if position is a valid ObjectId
  let positionName = userDetail.position;
  if (userDetail.position && mongoose.Types.ObjectId.isValid(userDetail.position)) {
    const positionObj = await Position.findById(userDetail.position);
    if (positionObj) {
      positionName = positionObj.name;
    }
  }
  
  // Convert to plain object with all fields, including undefined ones
  const profileData = userDetail.toObject({ 
    virtuals: false,
    transform: (doc, ret) => {
      // Ensure all fields are included, even if undefined
      return ret;
    }
  });
  
  // Replace IDs with names
  profileData.city = cityName;
  profileData.company = companyName;
  profileData.industry = industryName;
  profileData.position = positionName;
  
  success(res, {
    lastCompletedStep: profileData.lastCompletedStep || 0,
    profile: profileData,
    isProfileComplete: profileData.isProfileComplete || false
  });
});

module.exports = {
  getProfile,
  createProfile,
  getUserProfileById,
  updateUserProfile,
  logout,
  deleteUserAccount,
  saveProfileStep,
  getProfileProgress,
};