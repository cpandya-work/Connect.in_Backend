const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const UserLikes = require('../models/UserLikes.model');
const UserRequests = require('../models/UserRequests.model');
const UserConnections = require('../models/UserConnections.model');
const mongoose = require('mongoose');

const getFeed = async (userId, userGender, cursor = null, limit = 20, filters = {}, search = '') => {
  const cursorObj = cursor ? new mongoose.Types.ObjectId(cursor) : null;

  // Build excluded user IDs
  const [liked, sentReq, receivedReq, connections] = await Promise.all([
    UserLikes.find({ userId }).select('likedUserId'),
    UserRequests.find({ senderId: userId, status: 'pending' }).select('receiverId'),
    UserRequests.find({ receiverId: userId, status: 'pending' }).select('senderId'),
    UserConnections.find({
      $or: [{ connection1Id: userId }, { connection2Id: userId }],
    }),
  ]);

  const excludedIds = new Set();

  // Add liked
  liked.forEach(l => excludedIds.add(l.likedUserId.toString()));

  // Add sent requests
  sentReq.forEach(r => excludedIds.add(r.receiverId.toString()));

  // Add received requests
  receivedReq.forEach(r => excludedIds.add(r.senderId.toString()));

  // Add connections
  connections.forEach(c => {
    if (c.connection1Id.toString() !== userId.toString()) excludedIds.add(c.connection1Id.toString());
    if (c.connection2Id.toString() !== userId.toString()) excludedIds.add(c.connection2Id.toString());
  });

  // Add self
  excludedIds.add(userId.toString());

  // Build match stage with filters
  const matchStage = {
    _id: {
      $nin: Array.from(excludedIds).map(id => new mongoose.Types.ObjectId(id)),
    },
  };

  // Default: Show opposite gender only if no gender filter applied
  if (!filters.gender || filters.gender === 'any') {
    const oppositeGender = userGender === 'Male' ? 'Female' : userGender === 'Female' ? 'Male' : null;
    if (oppositeGender) {
      matchStage['details.gender'] = oppositeGender;
    }
  } else {
    matchStage['details.gender'] = filters.gender;
  }

  // Apply search filter
  if (search && search.trim()) {
    matchStage['details.fullName'] = { $regex: search.trim(), $options: 'i' };
  }

  // Apply filters if provided
  if (filters.habits && filters.habits.length > 0) {
    matchStage['details.habits'] = { $in: filters.habits };
  }

  if (filters.interests && filters.interests.length > 0) {
    matchStage['details.interests'] = { $in: filters.interests };
  }

  if (filters.language && filters.language.length > 0) {
    matchStage['details.preferredLanguage'] = { $in: filters.language };
  }

  if (filters.relationship && filters.relationship.length > 0) {
    matchStage['details.status'] = { $in: filters.relationship };
  }

  if (filters.religion && filters.religion.length > 0) {
    matchStage['details.religion'] = { $in: filters.religion };
  }

  if (cursorObj) {
    matchStage._id = { ...matchStage._id, $lt: cursorObj };
  }

  const pipeline = [
    {
      $lookup: {
        from: 'userdetails',
        localField: 'userDetailId',
        foreignField: '_id',
        as: 'details',
      },
    },
    { $unwind: '$details' },
    { $match: matchStage },
    { $sort: { _id: -1 } },
    {
      $project: {
        id: '$_id',
        fullName: '$details.fullName',
        profileImage: '$details.profileImage',
        dateOfBirth: '$details.dateOfBirth',
        city: '$details.city',
        gender: '$details.gender',
        religion: '$details.religion',
        status: '$details.status',
      },
    },
  ];

  let result = await User.aggregate(pipeline);

  // Calculate age and apply age filter
  result = result.map(p => ({
    ...p,
    age: p.dateOfBirth
      ? Math.floor((Date.now() - new Date(p.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
      : null,
  }));

  // Apply age filter if provided
  if (filters.ageMin || filters.ageMax) {
    result = result.filter(p => {
      if (!p.age) return false;
      if (filters.ageMin && p.age < filters.ageMin) return false;
      if (filters.ageMax && p.age > filters.ageMax) return false;
      return true;
    });
  }

  const hasMore = result.length > limit;
  const profiles = hasMore ? result.slice(0, limit) : result;
  const nextCursor = hasMore ? profiles[profiles.length - 1].id : null;

  return { profiles, nextCursor };
};

module.exports = { getFeed };