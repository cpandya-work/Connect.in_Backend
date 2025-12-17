const admin = require('../config/firebase');
const UserToken = require('../models/UserToken.model');
const Notification = require('../models/Notification.model');

const saveUserToken = async (userId, fcmToken, deviceType = 'android') => {
  await UserToken.findOneAndUpdate(
    { userId, fcmToken },
    { userId, fcmToken, deviceType, isActive: true },
    { upsert: true, new: true }
  );
};

const sendNotification = async (userId, title, body, data = {}, fromUserId = null) => {
  try {
    // Save notification to database
    await Notification.create({
      userId,
      title,
      body,
      type: data.type || 'general',
      data,
      fromUserId
    });

    const userTokens = await UserToken.find({ userId, isActive: true });
    
    if (userTokens.length === 0) {
      console.log('No active tokens found for user:', userId);
      return;
    }

    const tokens = userTokens.map(token => token.fcmToken);
    
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        userId: userId.toString(),
      },
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Handle failed tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      
      // Deactivate failed tokens
      await UserToken.updateMany(
        { fcmToken: { $in: failedTokens } },
        { isActive: false }
      );
    }

    return response;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

const sendLikeNotification = async (likedUserId, likerName, likerId, likerProfileImage) => {
  await sendNotification(
    likedUserId,
    'New Like! 💖',
    `${likerName} liked your profile`,
    { 
      type: 'like', 
      action: 'profile_liked',
      message: `${likerName} liked your profile`,
      senderId: likerId.toString(),
      senderName: likerName,
      senderProfileImage: likerProfileImage || ''
    },
    likerId
  );
};

const sendConnectionRequestNotification = async (receiverId, senderName, senderId, senderProfileImage) => {
  await sendNotification(
    receiverId,
    'Connection Request 🤝',
    `${senderName} sent you a connection request`,
    { 
      type: 'connection_request', 
      action: 'request_received',
      message: `${senderName} sent you a connection request`,
      senderId: senderId.toString(),
      senderName: senderName,
      senderProfileImage: senderProfileImage || ''
    },
    senderId
  );
};

const sendMessageNotification = async (receiverId, senderName, message, senderId, senderProfileImage) => {
  const shortMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
  await sendNotification(
    receiverId,
    `Message from ${senderName} 💬`,
    shortMessage,
    { 
      type: 'message', 
      action: 'new_message',
      message: message,
      senderId: senderId.toString(),
      senderName: senderName,
      senderProfileImage: senderProfileImage || ''
    },
    senderId
  );
};

const sendConnectionAcceptedNotification = async (senderId, accepterName, accepterId, accepterProfileImage) => {
  await sendNotification(
    senderId,
    'Connection Accepted! 🎉',
    `${accepterName} accepted your connection request`,
    { 
      type: 'connection_accepted', 
      action: 'request_accepted',
      message: `${accepterName} accepted your connection request`,
      senderId: accepterId.toString(),
      senderName: accepterName,
      senderProfileImage: accepterProfileImage || ''
    },
    accepterId
  );
};

const getNotifications = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  
  const notifications = await Notification.find({ userId })
    .populate('fromUserId', 'userDetailId')
    .populate({
      path: 'fromUserId',
      populate: {
        path: 'userDetailId',
        select: 'fullName profileImage'
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return notifications.map(notification => ({
    _id: notification._id,
    title: notification.title,
    body: notification.body,
    type: notification.type,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
    fromUser: notification.fromUserId ? {
      _id: notification.fromUserId._id,
      fullName: notification.fromUserId.userDetailId?.fullName,
      profileImage: notification.fromUserId.userDetailId?.profileImage
    } : null
  }));
};

const markAsRead = async (userId, notificationId) => {
  await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true }
  );
};

const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({ userId, isRead: false });
};

module.exports = {
  saveUserToken,
  sendNotification,
  sendLikeNotification,
  sendConnectionRequestNotification,
  sendMessageNotification,
  sendConnectionAcceptedNotification,
  getNotifications,
  markAsRead,
  getUnreadCount,
};