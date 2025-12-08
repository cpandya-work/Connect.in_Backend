const mongoose = require('mongoose');
const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const { deleteFromCloudinary } = require('../utils/cloudinary');

const getPublicProfile = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  const user = await User.findById(userId).populate('userDetailId');
  if (!user) throw new Error('User not found');
  if (!user.userDetailId) throw new Error('Profile not completed');

  return {
    phoneNumber: user.phoneNumber,
    email: user.userDetailId.email,
    ...user.userDetailId.toObject(),
  };
};

const updateProfile = async (userId, updates, file) => {
  const user = await User.findById(userId).populate('userDetailId');
  if (!user || !user.userDetailId) throw new Error('Profile not found');

  const detail = user.userDetailId;

  if (file) {
    if (detail.profileImage) {
      await deleteFromCloudinary(detail.profileImage);
    }
    updates.profileImage = file.path;
  }

  if (updates.habits && typeof updates.habits === 'string') updates.habits = updates.habits.split(',').map(h => h.trim()).filter(Boolean);
  if (updates.interests && typeof updates.interests === 'string') updates.interests = updates.interests.split(',').map(i => i.trim()).filter(Boolean);
  if (updates.skills && typeof updates.skills === 'string') updates.skills = updates.skills.split(',').map(s => s.trim()).filter(Boolean);

  Object.assign(detail, updates);
  await detail.save();

  return {
    phoneNumber: user.phoneNumber,
    email: detail.email,
    ...detail.toObject(),
  };
};

module.exports = { getPublicProfile, updateProfile };