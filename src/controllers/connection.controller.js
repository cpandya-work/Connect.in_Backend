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
  const { search } = req.query;
  const liked = await getLikedUsers(req.user._id, search);
  success(res, { liked });
});

const sendRequestCtrl = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(receiverId)) {
    return res.status(400).json({ success: false, message: 'Invalid receiver ID' });
  }

  await sendConnectionRequest(req.user._id, receiverId);
  success(res, null, 'Request sent');
});

const getSentRequestsCtrl = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const requests = await getSentRequests(req.user._id, search);
  const formatted = requests.map(r => ({
    _id: r.receiverId._id,
    fullName: r.receiverId.userDetailId?.fullName,
    profileImage: r.receiverId.userDetailId?.profileImage,
  }));
  success(res, { requests: formatted });
});

const getReceivedRequestsCtrl = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const requests = await getReceivedRequests(req.user._id, search);
  const formatted = requests.map(r => ({
    requestId: r._id,
    _id: r.senderId._id,
    fullName: r.senderId.userDetailId?.fullName,
    profileImage: r.senderId.userDetailId?.profileImage,
  }));
  success(res, { requests: formatted });
});

const getConnectionsCtrl = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const connections = await getActiveConnections(req.user._id, search);
  const formatted = connections.map(c => ({
    _id: c._id,
    fullName: c.userDetailId?.fullName,
    city: c.userDetailId?.city,
    profileImage: c.userDetailId?.profileImage,
  }));
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
  const { search } = req.query;
  const whoLikedMe = await getUsersWhoLikedMe(req.user._id, search);
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