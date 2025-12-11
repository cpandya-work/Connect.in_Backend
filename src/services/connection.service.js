const UserLikes = require('../models/UserLikes.model');
const UserRequests = require('../models/UserRequests.model');
const UserConnections = require('../models/UserConnections.model');
const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');

const likeUser = async (userId, likedUserId) => {
  const like = await UserLikes.create({ userId, likedUserId });
  return like;
};

const getLikedUsers = async (userId) => {
  const likes = await UserLikes.find({ userId })
    .populate({
      path: 'likedUserId',
      populate: { path: 'userDetailId', select: 'fullName city profileImage' },
      select: 'userDetailId',
    })
    .lean();

  return likes.map(l => ({
    _id: l.likedUserId._id,
    fullName: l.likedUserId.userDetailId?.fullName,
    city: l.likedUserId.userDetailId?.city,
    profileImage: l.likedUserId.userDetailId?.profileImage,
  }));
};

const sendConnectionRequest = async (senderId, receiverId) => {
  const request = await UserRequests.create({ senderId, receiverId });
  return request;
};

const getSentRequests = async (userId) => {
  return await UserRequests.find({ senderId: userId, status: 'pending' })
    .populate({
      path: 'receiverId',
      populate: { path: 'userDetailId', select: 'fullName profileImage' },
    })
    .select('receiverId')
    .lean();
};

const getReceivedRequests = async (userId) => {
  return await UserRequests.find({ receiverId: userId, status: 'pending' })
    .populate({
      path: 'senderId',
      populate: { path: 'userDetailId', select: 'fullName profileImage' },
    })
    .select('senderId _id')
    .lean();
};

const getActiveConnections = async (userId) => {
  const connections = await UserConnections.find({
    $or: [
      { connection1Id: userId },
      { connection2Id: userId },
    ],
  }).lean();

  const connectedUserIds = connections.map(c =>
    c.connection1Id.toString() === userId.toString() ? c.connection2Id : c.connection1Id
  );

  return await User.find({ _id: { $in: connectedUserIds } })
    .populate('userDetailId', 'fullName city profileImage')
    .select('userDetailId')
    .lean();
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

const getUsersWhoLikedMe = async (userId) => {
  const likes = await UserLikes.find({ likedUserId: userId })
    .populate({
      path: 'userId',
      populate: { path: 'userDetailId', select: 'fullName city profileImage' },
      select: 'userDetailId',
    })
    .lean();

  return likes.map(l => ({
    _id: l.userId._id,
    fullName: l.userId.userDetailId?.fullName,
    city: l.userId.userDetailId?.city,
    profileImage: l.userId.userDetailId?.profileImage,
  }));
};

module.exports = {
  likeUser,
  getLikedUsers,
  getUsersWhoLikedMe,
  sendConnectionRequest,
  getSentRequests,
  getReceivedRequests,
  getActiveConnections,
  acceptRequest,
  rejectRequest,
};