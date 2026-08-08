const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const mongoose = require('mongoose');
const {
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
} = require('../services/connection.service');

const likeUserCtrl = asyncHandler(async (req, res) => {
  const { likedUserId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(likedUserId)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }

  await likeUser(req.user._id, likedUserId);
  success(res, null, 'You liked this profile.');
});

const dislikeUserCtrl = asyncHandler(async (req, res) => {
  const { likedUserId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(likedUserId)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }

  await dislikeUser(req.user._id, likedUserId);
  success(res, null, 'You disliked this profile.');
});

const getLikesCtrl = asyncHandler(async (req, res) => {
  const { search, filter } = req.query;
  const liked = await getLikedUsers(req.user._id, search, filter);
  success(res, { liked });
});

const sendRequestCtrl = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(receiverId)) {
    return res.status(400).json({ success: false, message: 'Invalid receiver ID' });
  }

  const result = await sendConnectionRequest(req.user._id, receiverId);
  if (result && result.isConnected) {
    return success(res, result, 'Connected instantly');
  }
  success(res, result, 'Request sent');
});

const getSentRequestsCtrl = asyncHandler(async (req, res) => {
  const { search, filter } = req.query;
  const requests = await getSentRequests(req.user._id, search, filter);
  const formatted = requests.map(r => {
    const isBiz = r.receiverId.userDetailId?.isBusinessProfile === true;
    const catName = isBiz ? (r.receiverId.userDetailId?.businessCategory?.name || r.receiverId.userDetailId?.businessCategory || null) : null;
    return {
      _id: r.receiverId._id,
      fullName: isBiz ? r.receiverId.userDetailId?.businessName : r.receiverId.userDetailId?.fullName,
      profileImage: isBiz ? r.receiverId.userDetailId?.businessLogo : r.receiverId.userDetailId?.profileImage,
      gender: isBiz ? null : (r.receiverId.userDetailId?.gender || null),
      dateOfBirth: isBiz ? null : (r.receiverId.userDetailId?.dateOfBirth || null),
      isBusinessProfile: isBiz,
      businessName: isBiz ? r.receiverId.userDetailId?.businessName : null,
      businessLogo: isBiz ? r.receiverId.userDetailId?.businessLogo : null,
      businessCategory: catName,
      businessCategoryName: catName,
    };
  });
  success(res, { requests: formatted });
});

const getReceivedRequestsCtrl = asyncHandler(async (req, res) => {
  const { search, filter } = req.query;
  const requests = await getReceivedRequests(req.user._id, search, filter);
  const formatted = requests.map(r => {
    const isBiz = r.senderId.userDetailId?.isBusinessProfile === true;
    const catName = isBiz ? (r.senderId.userDetailId?.businessCategory?.name || r.senderId.userDetailId?.businessCategory || null) : null;
    return {
      requestId: r._id,
      _id: r.senderId._id,
      fullName: isBiz ? r.senderId.userDetailId?.businessName : r.senderId.userDetailId?.fullName,
      profileImage: isBiz ? r.senderId.userDetailId?.businessLogo : r.senderId.userDetailId?.profileImage,
      gender: isBiz ? null : (r.senderId.userDetailId?.gender || null),
      dateOfBirth: isBiz ? null : (r.senderId.userDetailId?.dateOfBirth || null),
      isBusinessProfile: isBiz,
      businessName: isBiz ? r.senderId.userDetailId?.businessName : null,
      businessLogo: isBiz ? r.senderId.userDetailId?.businessLogo : null,
      businessCategory: catName,
      businessCategoryName: catName,
    };
  });
  success(res, { requests: formatted });
});

const getConnectionsCtrl = asyncHandler(async (req, res) => {
  const { search, filter } = req.query;
  const connections = await getActiveConnections(req.user._id, search, filter);
  const formatted = connections.map(c => {
    const isBiz = c.userDetailId?.isBusinessProfile === true;
    const catName = isBiz ? (c.userDetailId?.businessCategory?.name || c.userDetailId?.businessCategory || null) : null;
    return {
      _id: c._id,
      fullName: c.userDetailId?.fullName,
      city: c.userDetailId?.city || null, // This is now the city name, not ID
      profileImage: c.userDetailId?.profileImage,
      gender: c.userDetailId?.gender || null,
      dateOfBirth: c.userDetailId?.dateOfBirth || null,
      isBusinessProfile: isBiz,
      businessName: isBiz ? c.userDetailId?.businessName : null,
      businessLogo: isBiz ? c.userDetailId?.businessLogo : null,
      businessCategory: catName,
      businessCategoryName: catName,
    };
  });
  success(res, { connections: formatted });
});

const acceptRequestCtrl = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  await acceptRequest(requestId, req.user._id);
  success(res, null, 'Connection created');
});

const rejectRequestCtrl = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  await rejectRequest(requestId, req.user._id);
  success(res, null, 'Request rejected');
});

const getWhoLikedMeCtrl = asyncHandler(async (req, res) => {
  const { search, filter } = req.query;
  const whoLikedMe = await getUsersWhoLikedMe(req.user._id, search, filter);
  success(res, { whoLikedMe });
});

const removeConnectionCtrl = asyncHandler(async (req, res) => {
  const { connectionUserId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(connectionUserId)) {
    return res.status(400).json({ success: false, message: 'Invalid connection user ID' });
  }

  await removeConnection(req.user._id, connectionUserId);
  success(res, null, 'Connection removed');
});

const skipUserCtrl = asyncHandler(async (req, res) => {
  const { skippedUserId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(skippedUserId)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }

  if (req.user._id.toString() === skippedUserId) {
    return res.status(400).json({ success: false, message: 'Cannot skip your own profile' });
  }

  await skipUser(req.user._id, skippedUserId);
  success(res, null, 'Profile skipped');
});

module.exports = {
  likeUserCtrl,
  dislikeUserCtrl,
  getLikesCtrl,
  getWhoLikedMeCtrl,
  sendRequestCtrl,
  getSentRequestsCtrl,
  getReceivedRequestsCtrl,
  getConnectionsCtrl,
  acceptRequestCtrl,
  rejectRequestCtrl,
  removeConnectionCtrl,
  skipUserCtrl,
};