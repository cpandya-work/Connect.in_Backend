const admin = require('../config/firebase');
const UserToken = require('../models/UserToken.model');
const Notification = require('../models/Notification.model');
const User = require('../models/User.model');

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

const sendPostNotification = async (receiverId, posterName, posterId, posterProfileImage) => {
  await sendNotification(
    receiverId,
    'New Post Shared! 📮',
    `${posterName} shared a new post`,
    {
      type: 'post',
      action: 'new_post',
      message: `${posterName} shared a new post`,
      senderId: posterId.toString(),
      senderName: posterName,
      senderProfileImage: posterProfileImage || ''
    },
    posterId
  );
};

const getNotifications = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  
  // First, fetch all notifications
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

  // Map notifications to return format
  const originalNotifications = notifications.map(notification => ({
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

  // Return notifications without marking them as read
  // Notifications will be deleted when clicked/viewed
  return originalNotifications;
};

const markAsRead = async (userId, notificationId) => {
  // Delete notification instead of marking as read
  await Notification.findOneAndDelete(
    { _id: notificationId, userId }
  );
};

const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({ userId, isRead: false });
};

/**
 * Clear all notifications for a user.
 * Current semantics delete notifications (consistent with markAsRead).
 */
const clearAllNotifications = async (userId) => {
  await Notification.deleteMany({ userId });
};

/**
 * Send push notification to all users (broadcast)
 * @param {string} title - Notification title
 * @param {string} description - Notification body/description
 * @returns {Promise<Object>} Result with success count and failure count
 */
const sendBroadcastNotification = async (title, description) => {
  try {
    // Get all users
    const users = await User.find().select('_id');
    const userIds = users.map(user => user._id);

    if (userIds.length === 0) {
      return {
        success: true,
        totalUsers: 0,
        notificationsSent: 0,
        message: 'No users found'
      };
    }

    // Save notification to database for all users
    const notifications = userIds.map(userId => ({
      userId,
      title,
      body: description,
      type: 'broadcast',
      data: {
        type: 'broadcast',
        action: 'admin_notification'
      },
      fromUserId: null
    }));

    await Notification.insertMany(notifications);

    // Get all active FCM tokens
    const allTokens = await UserToken.find({ isActive: true }).select('fcmToken');
    const tokens = allTokens.map(token => token.fcmToken);

    if (tokens.length === 0) {
      return {
        success: true,
        totalUsers: userIds.length,
        notificationsSaved: userIds.length,
        notificationsSent: 0,
        message: 'Notifications saved but no active FCM tokens found'
      };
    }

    // Send push notification to all tokens using multicast
    const message = {
      notification: {
        title,
        body: description,
      },
      data: {
        type: 'broadcast',
        action: 'admin_notification',
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

    return {
      success: true,
      totalUsers: userIds.length,
      notificationsSaved: userIds.length,
      notificationsSent: response.successCount,
      notificationsFailed: response.failureCount,
      message: `Notification sent to ${response.successCount} devices`
    };
  } catch (error) {
    console.error('Error sending broadcast notification:', error);
    throw error;
  }
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
  clearAllNotifications,
  sendBroadcastNotification,
  sendPostNotification,
};