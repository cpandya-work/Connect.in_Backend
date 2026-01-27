const mongoose = require('mongoose');
const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const DeletedUser = require('../models/DeletedUser.model');
const UserLikes = require('../models/UserLikes.model');
const UserConnections = require('../models/UserConnections.model');
const UserRequests = require('../models/UserRequests.model');
const { deleteFromCloudinary } = require('../utils/cloudinary');

const getPublicProfile = async (userId, loggedInUserId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  const user = await User.findById(userId).populate('userDetailId');
  if (!user) throw new Error('User not found');
  if (!user.userDetailId) throw new Error('Profile not completed');

  let isLiked = false;
  let isConnected = false;
  let hasSentRequest = false;
  let hasReceivedRequest = false;
  let likesMe = false;

  if (loggedInUserId) {
    const [iLikedThem, theyLikedMe, connection, sentRequest, receivedRequest] = await Promise.all([
      UserLikes.findOne({ userId: loggedInUserId, likedUserId: userId }),
      UserLikes.findOne({ userId: userId, likedUserId: loggedInUserId }),
      UserConnections.findOne({
        $or: [
          { connection1Id: loggedInUserId, connection2Id: userId },
          { connection1Id: userId, connection2Id: loggedInUserId }
        ]
      }),
      UserRequests.findOne({ senderId: loggedInUserId, receiverId: userId, status: 'pending' }),
      UserRequests.findOne({ senderId: userId, receiverId: loggedInUserId, status: 'pending' })
    ]);
    
    isLiked = !!iLikedThem;
    likesMe = !!theyLikedMe;
    isConnected = !!connection;
    hasSentRequest = !!sentRequest;
    hasReceivedRequest = !!receivedRequest;
  }

  // Get user detail as object, ensuring all fields are included (including undefined ones)
  const userDetailObj = user.userDetailId.toObject({ 
    virtuals: false,
    transform: (doc, ret) => {
      // Ensure all fields are included, even if undefined
      return ret;
    }
  });
  
  return {
    phoneNumber: user.phoneNumber,
    email: user.userDetailId.email,
    ...userDetailObj,
    // Explicitly ensure company and industry are included
    company: userDetailObj.company,
    industry: userDetailObj.industry,
    isLiked,
    isConnected,
    hasSentRequest,
    hasReceivedRequest,
    likesMe,
    // Keep backward compatibility
    likedByMe: isLiked,
    alreadyConnect: isConnected,
    sendRequest: hasSentRequest,
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
    password: detail.password, // Show encoded/hashed password
    ...detail.toObject(),
  };
};

const deleteAccount = async (userId) => {
  const user = await User.findById(userId).populate('userDetailId');
  if (!user) throw new Error('User not found');

  const deletedUserData = {
    originalUserId: user._id,
    phoneNumber: user.phoneNumber,
  };

  if (user.userDetailId) {
    const userDetail = user.userDetailId;
    Object.assign(deletedUserData, {
      fullName: userDetail.fullName,
      city: userDetail.city,
      religion: userDetail.religion,
      status: userDetail.status,
      email: userDetail.email,
      gender: userDetail.gender,
      dateOfBirth: userDetail.dateOfBirth,
      preferredLanguage: userDetail.preferredLanguage,
      habits: userDetail.habits,
      interests: userDetail.interests,
      skills: userDetail.skills,
      profileImage: userDetail.profileImage,
    });

    await UserDetail.findByIdAndDelete(userDetail._id);
  }

  await DeletedUser.create(deletedUserData);
  await User.findByIdAndDelete(userId);

  return true;
};

module.exports = { getPublicProfile, updateProfile, deleteAccount };