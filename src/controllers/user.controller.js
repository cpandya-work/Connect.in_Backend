const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const City = require('../models/City.model');
const Company = require('../models/Company.model');
const Industry = require('../models/Industry.model');
const { profileSchema, updateProfileSchema } = require('../validators/user.validator');
const { success } = require('../utils/response');
const { getPublicProfile, updateProfile, deleteAccount } = require('../services/user.service');
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
  };
  
  success(res, { profile });
});

const createProfile = asyncHandler(async (req, res) => {
  const { error } = profileSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const profileImage = req.file?.path || null;
  
  // Get user - check token first, then userId/phoneNumber from body
  let user = null;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
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

  let detail;
  if (user.userDetailId) {
    // Update existing profile and mark as complete
    detail = await UserDetail.findByIdAndUpdate(
      user.userDetailId._id,
      {
        ...req.body,
        profileImage: profileImage || user.userDetailId.profileImage,
        habits: Array.isArray(req.body.habits) ? req.body.habits : (req.body.habits?.split(',').map(h => h.trim()).filter(Boolean) || []),
        interests: Array.isArray(req.body.interests) ? req.body.interests : (req.body.interests?.split(',').map(i => i.trim()).filter(Boolean) || []),
        skills: Array.isArray(req.body.skills) ? req.body.skills : (req.body.skills?.split(',').map(s => s.trim()).filter(Boolean) || []),
        lastCompletedStep: 8,
        isProfileComplete: true,
      },
      { new: true }
    );
  } else {
    // Create new profile
    detail = await UserDetail.create({
      ...req.body,
      profileImage,
      habits: Array.isArray(req.body.habits) ? req.body.habits : (req.body.habits?.split(',').map(h => h.trim()).filter(Boolean) || []),
      interests: Array.isArray(req.body.interests) ? req.body.interests : (req.body.interests?.split(',').map(i => i.trim()).filter(Boolean) || []),
      skills: Array.isArray(req.body.skills) ? req.body.skills : (req.body.skills?.split(',').map(s => s.trim()).filter(Boolean) || []),
      lastCompletedStep: 8,
      isProfileComplete: true,
    });
    await User.findByIdAndUpdate(user._id, { userDetailId: detail._id });
  }
  
  const updatedUser = await User.findById(user._id);
  const profile = {
    phoneNumber: updatedUser.phoneNumber,
    email: detail.email,
    ...detail.toObject(),
  };

  success(res, { profile }, 'Profile completed');
});

const getUserProfileById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profile = await getPublicProfile(id, req.user._id);
  success(res, { profile });
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const { error } = updateProfileSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  
  const updates = req.body;
  const file = req.file;

  const updatedProfile = await updateProfile(req.user._id, updates, file);
  
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
  
  // Replace IDs with names in the response
  const profileWithNames = {
    ...updatedProfile,
    city: cityName,
    company: companyName,
    industry: industryName,
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
  const profileImage = req.file?.path || null;
  
  if (!stepNumber || isNaN(stepNumber) || stepNumber < 1 || stepNumber > 8) {
    return res.status(400).json({ success: false, message: 'Invalid step number' });
  }

  const user = await User.findById(req.user._id).populate('userDetailId');
  
  // Prepare step data (only include fields for this step)
  const stepData = {};
  
  // Step 1: Basic info
  if (stepNumber === 1) {
    if (req.body.fullName) stepData.fullName = req.body.fullName;
    if (req.body.city) stepData.city = req.body.city;
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
    if (req.body.preferredLanguage) stepData.preferredLanguage = req.body.preferredLanguage;
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
  
  // Step 7: Industry and Company
  if (stepNumber === 7) {
    if (req.body.industry) stepData.industry = req.body.industry;
    if (req.body.company) stepData.company = req.body.company;
  }
  
  // Step 8: Profile Image
  if (stepNumber === 8 && profileImage) {
    stepData.profileImage = profileImage;
  }
  
  // Update lastCompletedStep
  stepData.lastCompletedStep = stepNumber;
  
  let userDetail;
  if (user.userDetailId) {
    // Update existing profile - use $set to update only provided fields, preserving existing ones
    const updateObj = {
      ...stepData,
      lastCompletedStep: stepNumber,
    };
    
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
    });
    await User.findByIdAndUpdate(req.user._id, { userDetailId: userDetail._id });
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