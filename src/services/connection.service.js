const UserLikes = require('../models/UserLikes.model');
const UserRequests = require('../models/UserRequests.model');
const UserConnections = require('../models/UserConnections.model');
const UserSkips = require('../models/UserSkips.model');
const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const City = require('../models/City.model');
const { sendLikeNotification, sendConnectionRequestNotification, sendConnectionAcceptedNotification } = require('./notification.service');

const likeUser = async (userId, likedUserId) => {
  const like = await UserLikes.create({ userId, likedUserId });
  
  // Send notification
  const liker = await User.findById(userId).populate('userDetailId');
  if (liker?.userDetailId?.fullName) {
    await sendLikeNotification(
      likedUserId, 
      liker.userDetailId.fullName, 
      userId,
      liker.userDetailId.profileImage
    );
  }
  
  return like;
};

const dislikeUser = async (userId, likedUserId) => {
  const result = await UserLikes.deleteOne({ userId, likedUserId });

  if (result.deletedCount === 0) {
    throw new Error('Like not found');
  }

  return { success: true };
};

const getLikedUsers = async (userId, search = '') => {
  const likes = await UserLikes.find({ userId })
    .populate({
      path: 'likedUserId',
      populate: { 
        path: 'userDetailId', 
        select: 'fullName city profileImage',
        populate: { path: 'city', model: 'City', select: 'name' }
      },
      select: 'userDetailId',
    })
    .lean();

  // Extract city IDs that need to be fetched (if not populated)
  const cityIds = [];
  likes.forEach((l) => {
    const city = l.likedUserId?.userDetailId?.city;
    if (city && typeof city !== 'object') {
      cityIds.push(city);
    }
  });

  // Fetch city names for unpopulated cities
  let cityMap = new Map();
  if (cityIds.length > 0) {
    const uniqueCityIds = [...new Set(cityIds)];
    const cities = await City.find({ _id: { $in: uniqueCityIds } }).select('name _id').lean();
    cityMap = new Map(cities.map(c => [c._id.toString(), c.name]));
  }

  let result = likes.map((l) => {
    let cityName = null;
    const city = l.likedUserId?.userDetailId?.city;
    
    if (city) {
      if (typeof city === 'object' && city.name) {
        // City is populated
        cityName = city.name;
      } else {
        // City is an ObjectId, get from map
        cityName = cityMap.get(city.toString()) || null;
      }
    }

    return {
      _id: l.likedUserId._id,
      fullName: l.likedUserId.userDetailId?.fullName,
      city: cityName,
      profileImage: l.likedUserId.userDetailId?.profileImage,
    };
  });

  if (search && search.trim()) {
    result = result.filter(user => 
      user.fullName?.toLowerCase().includes(search.trim().toLowerCase())
    );
  }

  return result;
};

const sendConnectionRequest = async (senderId, receiverId) => {
  const request = await UserRequests.create({ senderId, receiverId });
  
  // Send notification
  const sender = await User.findById(senderId).populate('userDetailId');
  if (sender?.userDetailId?.fullName) {
    await sendConnectionRequestNotification(
      receiverId, 
      sender.userDetailId.fullName, 
      senderId,
      sender.userDetailId.profileImage
    );
  }
  
  return request;
};

const getSentRequests = async (userId, search = '') => {
  const requests = await UserRequests.find({ senderId: userId, status: 'pending' })
    .populate({
      path: 'receiverId',
      populate: { path: 'userDetailId', select: 'fullName profileImage' },
    })
    .select('receiverId')
    .lean();

  if (search && search.trim()) {
    return requests.filter(r => 
      r.receiverId.userDetailId?.fullName?.toLowerCase().includes(search.trim().toLowerCase())
    );
  }

  return requests;
};

const getReceivedRequests = async (userId, search = '') => {
  const requests = await UserRequests.find({ receiverId: userId, status: 'pending' })
    .populate({
      path: 'senderId',
      populate: { path: 'userDetailId', select: 'fullName profileImage' },
    })
    .select('senderId _id')
    .lean();

  if (search && search.trim()) {
    return requests.filter(r => 
      r.senderId.userDetailId?.fullName?.toLowerCase().includes(search.trim().toLowerCase())
    );
  }

  return requests;
};

const getActiveConnections = async (userId, search = '') => {
  const connections = await UserConnections.find({
    $or: [
      { connection1Id: userId },
      { connection2Id: userId },
    ],
  }).lean();

  const connectedUserIds = connections.map(c =>
    c.connection1Id.toString() === userId.toString() ? c.connection2Id : c.connection1Id
  );

  let result = await User.find({ _id: { $in: connectedUserIds } })
    .populate({
      path: 'userDetailId',
      select: 'fullName city profileImage',
      populate: { path: 'city', model: 'City', select: 'name' }
    })
    .select('userDetailId')
    .lean();

  // Extract city IDs that need to be fetched (if not populated)
  const cityIds = [];
  result.forEach((user) => {
    const city = user.userDetailId?.city;
    if (city && typeof city !== 'object') {
      cityIds.push(city);
    }
  });

  // Fetch city names for unpopulated cities
  let cityMap = new Map();
  if (cityIds.length > 0) {
    const uniqueCityIds = [...new Set(cityIds)];
    const cities = await City.find({ _id: { $in: uniqueCityIds } }).select('name _id').lean();
    cityMap = new Map(cities.map(c => [c._id.toString(), c.name]));
  }

  // Map results to include city names
  let formattedResult = result.map((user) => {
    let cityName = null;
    const city = user.userDetailId?.city;
    
    if (city) {
      if (typeof city === 'object' && city.name) {
        // City is populated
        cityName = city.name;
      } else {
        // City is an ObjectId, get from map
        cityName = cityMap.get(city.toString()) || null;
      }
    }

    return {
      _id: user._id,
      userDetailId: {
        ...user.userDetailId,
        city: cityName,
      }
    };
  });

  if (search && search.trim()) {
    formattedResult = formattedResult.filter(user => 
      user.userDetailId?.fullName?.toLowerCase().includes(search.trim().toLowerCase())
    );
  }

  return formattedResult;
};

const acceptRequest = async (requestId, receiverId) => {
  const request = await UserRequests.findOne({
    _id: requestId,
    receiverId,
    status: 'pending',
  });

  if (!request) throw new Error('Request not found');

  await UserConnections.create({
    connection1Id: request.senderId,
    connection2Id: request.receiverId,
  });

  // Send notification
  const accepter = await User.findById(receiverId).populate('userDetailId');
  if (accepter?.userDetailId?.fullName) {
    await sendConnectionAcceptedNotification(
      request.senderId, 
      accepter.userDetailId.fullName, 
      receiverId,
      accepter.userDetailId.profileImage
    );
  }

  await UserRequests.deleteOne({ _id: requestId });

  return { success: true };
};

const rejectRequest = async (requestId, receiverId) => {
  const result = await UserRequests.deleteOne({
    _id: requestId,
    receiverId,
    status: 'pending',
  });

  if (result.deletedCount === 0) {
    throw new Error('Request not found');
  }

  return { success: true };
};

const getUsersWhoLikedMe = async (userId, search = '') => {
  const likes = await UserLikes.find({ likedUserId: userId })
    .populate({
      path: 'userId',
      populate: { path: 'userDetailId', select: 'fullName city profileImage' },
      select: 'userDetailId',
    })
    .lean();

  let result = likes.map(l => ({
    _id: l.userId._id,
    fullName: l.userId.userDetailId?.fullName,
    city: l.userId.userDetailId?.city,
    profileImage: l.userId.userDetailId?.profileImage,
  }));

  if (search && search.trim()) {
    result = result.filter(user => 
      user.fullName?.toLowerCase().includes(search.trim().toLowerCase())
    );
  }

  return result;
};

const removeConnection = async (userId, connectionUserId) => {
  // Delete the active connection from UserConnections (bidirectional check)
  await UserConnections.deleteOne({
    $or: [
      { connection1Id: userId, connection2Id: connectionUserId },
      { connection1Id: connectionUserId, connection2Id: userId }
    ]
  });

  // Delete ALL requests between these two users (both sent and received, any status)
  await UserRequests.deleteMany({
    $or: [
      // User sent request to connectionUserId
      { senderId: userId, receiverId: connectionUserId },
      // User received request from connectionUserId
      { senderId: connectionUserId, receiverId: userId },
    ],
  });

  return { success: true };
};

const skipUser = async (userId, skippedUserId) => {
  // Create bidirectional skip records so both users don't see each other
  // If A skips B, then:
  // - A should not see B (userId skips skippedUserId)
  // - B should not see A (skippedUserId skips userId)
  
  // Use upsert to avoid duplicates
  await Promise.all([
    UserSkips.findOneAndUpdate(
      { userId, skippedUserId },
      { userId, skippedUserId },
      { upsert: true, new: true }
    ),
    UserSkips.findOneAndUpdate(
      { userId: skippedUserId, skippedUserId: userId },
      { userId: skippedUserId, skippedUserId: userId },
      { upsert: true, new: true }
    ),
  ]);

  return { success: true };
};

module.exports = {
  likeUser,
  dislikeUser,
  getLikedUsers,
  getUsersWhoLikedMe,
  sendConnectionRequest,
  getSentRequests,
  getReceivedRequests,
  getActiveConnections,
  acceptRequest,
  rejectRequest,
  removeConnection,
  skipUser,
};