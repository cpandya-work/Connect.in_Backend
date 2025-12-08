const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const { profileSchema, updateProfileSchema } = require('../validators/user.validator');
const { success } = require('../utils/response');
const { getPublicProfile, updateProfile } = require('../services/user.service');
const mongoose = require('mongoose');

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('userDetailId');
  
  if (!user.userDetailId) {
    return success(res, { profile: null });
  }
  
  const profile = {
    phoneNumber: user.phoneNumber,
    email: user.userDetailId.email,
    ...user.userDetailId.toObject(),
  };
  
  success(res, { profile });
});

const createProfile = asyncHandler(async (req, res) => {
  const { error } = profileSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const profileImage = req.file?.path || null;

  const detail = await UserDetail.create({
    ...req.body,
    profileImage,
    habits: Array.isArray(req.body.habits) ? req.body.habits : (req.body.habits?.split(',').map(h => h.trim()).filter(Boolean) || []),
    interests: Array.isArray(req.body.interests) ? req.body.interests : (req.body.interests?.split(',').map(i => i.trim()).filter(Boolean) || []),
    skills: Array.isArray(req.body.skills) ? req.body.skills : (req.body.skills?.split(',').map(s => s.trim()).filter(Boolean) || []),
  });

  await User.findByIdAndUpdate(req.user._id, { userDetailId: detail._id });
  
  const user = await User.findById(req.user._id);
  const profile = {
    phoneNumber: user.phoneNumber,
    email: detail.email,
    ...detail.toObject(),
  };

  success(res, { profile }, 'Profile completed');
});

const getUserProfileById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profile = await getPublicProfile(id);
  success(res, { profile });
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const { error } = updateProfileSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });
  
  const updates = req.body;
  const file = req.file;

  const updatedProfile = await updateProfile(req.user._id, updates, file);
  success(res, { profile: updatedProfile }, 'Profile updated');
});

const logout = asyncHandler(async (req, res) => {
  success(res, null, 'Logged out successfully');
});

module.exports = {
  getProfile,
  createProfile,
  getUserProfileById,
  updateUserProfile,
  logout,
};