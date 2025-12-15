const UserChat = require('../models/UserChat.model');
const User = require('../models/User.model');
const { sendMessageNotification } = require('./notification.service');

const sendMessage = async (senderId, receiverId, message) => {
  const chat = await UserChat.create({
    senderId,
    receiverId,
    message,
  });

  // Send notification
  const sender = await User.findById(senderId).populate('userDetailId');
  if (sender?.userDetailId?.fullName) {
    await sendMessageNotification(receiverId, sender.userDetailId.fullName, message);
  }

  return chat;
};

const getChatHistory = async (loggedInUserId, otherUserId) => {
  await UserChat.updateMany(
    {
      senderId: otherUserId,
      receiverId: loggedInUserId,
      seen: false,
    },
    {
      $set: { seen: true },
    }
  );

  const messages = await UserChat.find({
    $or: [
      { senderId: loggedInUserId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: loggedInUserId },
    ],
  })
    .sort({ createdAt: 1 })
    .select('senderId receiverId message createdAt seen')
    .lean();

  return messages;
};

const getChatList = async (loggedInUserId, search = '') => {
  const pipeline = [
    {
      $match: {
        $or: [
          { senderId: loggedInUserId },
          { receiverId: loggedInUserId },
        ],
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$senderId', loggedInUserId] },
            '$receiverId',
            '$senderId',
          ],
        },
        lastMessage: { $first: '$message' },
        lastMessageTime: { $first: '$createdAt' },
        allMessages: { $push: '$$ROOT' },
      },
    },
    {
      $addFields: {
        unseenCount: {
          $size: {
            $filter: {
              input: '$allMessages',
              as: 'msg',
              cond: {
                $and: [
                  { $eq: ['$$msg.receiverId', loggedInUserId] },
                  { $eq: ['$$msg.seen', false] },
                ],
              },
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: '$user',
    },
    {
      $lookup: {
        from: 'userdetails',
        localField: 'user.userDetailId',
        foreignField: '_id',
        as: 'userDetail',
      },
    },
    {
      $unwind: { path: '$userDetail', preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        _id: 1,
        lastMessage: 1,
        lastMessageTime: 1,
        unseenCount: 1,
        fullName: '$userDetail.fullName',
        profileImage: '$userDetail.profileImage',
      },
    },
  ];

  let result = await UserChat.aggregate(pipeline).exec();

  if (search && search.trim()) {
    result = result.filter(item => 
      item.fullName?.toLowerCase().includes(search.trim().toLowerCase())
    );
  }

  result.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

  return result.map(item => ({
    ...item,
    lastMessageTime: formatSmartTime(item.lastMessageTime),
  }));
};

// Helper: Smart time formatting
const formatSmartTime = (date) => {
  const now = new Date();
  const msgDate = new Date(date);

  const isToday =
    now.getDate() === msgDate.getDate() &&
    now.getMonth() === msgDate.getMonth() &&
    now.getFullYear() === msgDate.getFullYear();

  const isYesterday =
    now.getDate() - 1 === msgDate.getDate() &&
    now.getMonth() === msgDate.getMonth() &&
    now.getFullYear() === msgDate.getFullYear();

  if (isToday) {
    return msgDate.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).replace(/AM|PM/, (match) => match); // e.g., 09:48 PM
  }

  if (isYesterday) {
    return 'Yesterday';
  }

  // Older than yesterday → dd/mm/yy
  return msgDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }); // e.g., 16/11/25
};

module.exports = { sendMessage, getChatHistory, getChatList, formatSmartTime, };