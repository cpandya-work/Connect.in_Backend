const UserLikes = require('../models/UserLikes.model');
const UserRequests = require('../models/UserRequests.model');
const UserConnections = require('../models/UserConnections.model');
const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
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
      populate: { path: 'userDetailId', select: 'fullName city profileImage' },
      select: 'userDetailId',
    })
    .lean();

  let result = likes.map(l => ({
    _id: l.likedUserId._id,
    fullName: l.likedUserId.userDetailId?.fullName,
    city: l.likedUserId.userDetailId?.city,
    profileImage: l.likedUserId.userDetailId?.profileImage,
  }));

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
    .populate('userDetailId', 'fullName city profileImage')
    .select('userDetailId')
    .lean();

  if (search && search.trim()) {
    result = result.filter(user => 
      user.userDetailId?.fullName?.toLowerCase().includes(search.trim().toLowerCase())
    );
  }

  return result;
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
  const connection = await UserConnections.findOne({
    $or: [
      { connection1Id: userId, connection2Id: connectionUserId },
      { connection1Id: connectionUserId, connection2Id: userId },
    ],
  });

  if (!connection) {
    throw new Error('Connection not found');
  }

  await UserConnections.deleteOne({ _id: connection._id });

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
};