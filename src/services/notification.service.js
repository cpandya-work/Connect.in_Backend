const admin = require('../config/firebase');
const UserToken = require('../models/UserToken.model');

const saveUserToken = async (userId, fcmToken, deviceType = 'android') => {
  await UserToken.findOneAndUpdate(
    { userId, fcmToken },
    { userId, fcmToken, deviceType, isActive: true },
    { upsert: true, new: true }
  );
};

const sendNotification = async (userId, title, body, data = {}) => {
  try {
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

const sendLikeNotification = async (likedUserId, likerName) => {
  await sendNotification(
    likedUserId,
    'New Like! 💖',
    `${likerName} liked your profile`,
    { type: 'like', action: 'profile_liked' }
  );
};

const sendConnectionRequestNotification = async (receiverId, senderName) => {
  await sendNotification(
    receiverId,
    'Connection Request 🤝',
    `${senderName} sent you a connection request`,
    { type: 'connection_request', action: 'request_received' }
  );
};

const sendMessageNotification = async (receiverId, senderName, message) => {
  await sendNotification(
    receiverId,
    `Message from ${senderName} 💬`,
    message.length > 50 ? message.substring(0, 50) + '...' : message,
    { type: 'message', action: 'new_message' }
  );
};

const sendConnectionAcceptedNotification = async (senderId, accepterName) => {
  await sendNotification(
    senderId,
    'Connection Accepted! 🎉',
    `${accepterName} accepted your connection request`,
    { type: 'connection_accepted', action: 'request_accepted' }
  );
};

module.exports = {
  saveUserToken,
  sendNotification,
  sendLikeNotification,
  sendConnectionRequestNotification,
  sendMessageNotification,
  sendConnectionAcceptedNotification,
};