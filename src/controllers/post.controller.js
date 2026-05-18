const asyncHandler = require('../utils/asyncHandler');
const Post = require('../models/Post.model');
const UserConnections = require('../models/UserConnections.model');
const User = require('../models/User.model');
const { sendPostNotification } = require('../services/notification.service');
const { sendNewPostEmail } = require('../services/email.service');
const { success } = require('../utils/response');

const createPost = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const userId = req.user._id;

  if (!content) {
    return res.status(400).json({ success: false, message: 'Content is required' });
  }

  const attachments = [];
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      let type = 'image';
      if (file.mimetype.includes('pdf')) type = 'pdf';
      else if (file.mimetype.includes('doc') || file.mimetype.includes('msword') || file.mimetype.includes('officedocument')) type = 'doc';

      attachments.push({
        url: file.path,
        type: type,
        name: file.originalname
      });
    });
  }

  const post = await Post.create({
    userId,
    content,
    attachments
  });

  // Fetch poster details for notifications
  const poster = await User.findById(userId).populate('userDetailId');
  const posterName = poster?.userDetailId?.fullName || 'A user';
  const posterImage = poster?.userDetailId?.profileImage || '';

  // Find connections to notify
  const connections = await UserConnections.find({
    $or: [
      { connection1Id: userId },
      { connection2Id: userId },
    ],
  });

  const connectionIds = connections.map(c =>
    c.connection1Id.toString() === userId.toString() ? c.connection2Id : c.connection1Id
  );

  // Send notifications and emails (non-blocking)
  setImmediate(async () => {
    const connectedUsers = await User.find({ _id: { $in: connectionIds } }).populate('userDetailId');

    connectedUsers.forEach(user => {
      // Send push notification
      sendPostNotification(user._id, posterName, userId, posterImage).catch(console.error);

      // Send email if user has email
      if (user.userDetailId?.email) {
        sendNewPostEmail(user.userDetailId.email, user.userDetailId.fullName, posterName).catch(console.error);
      }
    });
  });

  success(res, post, 'Post created successfully');
});

const getPosts = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Find connections
  const connections = await UserConnections.find({
    $or: [
      { connection1Id: userId },
      { connection2Id: userId },
    ],
  });

  const connectionIds = connections.map(c =>
    c.connection1Id.toString() === userId.toString() ? c.connection2Id : c.connection1Id
  );

  // Include user's own ID in the list to see their own posts too
  const allRelevantUserIds = [...connectionIds, userId];

  const posts = await Post.find({ userId: { $in: allRelevantUserIds } })
    .populate({
      path: 'userId',
      populate: { path: 'userDetailId', select: 'fullName profileImage' },
      select: 'userDetailId'
    })
    .sort({ createdAt: -1 })
    .lean();

  success(res, posts);
});

module.exports = {
  createPost,
  getPosts
};
