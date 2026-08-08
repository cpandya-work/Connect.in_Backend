const UserLikes = require('../models/UserLikes.model');
const UserRequests = require('../models/UserRequests.model');
const UserConnections = require('../models/UserConnections.model');
const UserSkips = require('../models/UserSkips.model');
const User = require('../models/User.model');
const UserDetail = require('../models/UserDetail.model');
const City = require('../models/City.model');
const { sendLikeNotification, sendConnectionRequestNotification, sendConnectionAcceptedNotification } = require('./notification.service');
const { sendConnectionRequestEmail, sendConnectionAcceptedEmail, sendIncomingLikeEmail } = require('./email.service');
const { sendConnectionRequestSms, sendConnectionAcceptedSms, sendProfileLikedSms } = require('./sms.service');

const likeUser = async (userId, likedUserId) => {
  const like = await UserLikes.create({ userId, likedUserId });

  // Send push notification + email (non-blocking)
  const [liker, likedUser] = await Promise.all([
    User.findById(userId).populate('userDetailId'),
    User.findById(likedUserId).populate('userDetailId'),
  ]);

  const likerName = liker?.userDetailId?.isBusinessProfile ? liker.userDetailId.businessName : liker?.userDetailId?.fullName;
  const likerImage = liker?.userDetailId?.isBusinessProfile ? liker.userDetailId.businessLogo : liker?.userDetailId?.profileImage;
  const likedName = likedUser?.userDetailId?.isBusinessProfile ? likedUser.userDetailId.businessName : likedUser?.userDetailId?.fullName;

  if (likerName) {
    sendLikeNotification(likedUserId, likerName, userId, likerImage)
      .catch(console.error);
  }

  if (likedUser?.userDetailId?.email && likedName && likerName) {
    sendIncomingLikeEmail(
      likedUser.userDetailId.email,
      likedName,
      likerName
    ).catch(console.error);
  }
  console.log("LikedUser",likedUser)
  console.log("Liker user",liker)
  if (likedUser?.phoneNumber && likedName && likerName) {
   console.log("Sms send")
    sendProfileLikedSms(
      likedUser.phoneNumber,
      likedName,
      likerName
    ).catch(console.error);
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

const getLikedUsers = async (userId, search = '', filter = '') => {
  const likes = await UserLikes.find({ userId })
    .populate({
      path: 'likedUserId',
      populate: { 
        path: 'userDetailId', 
        select: 'fullName city profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessCoverImage businessTagline businessCategory',
        populate: [
          { path: 'city', model: 'City', select: 'name' },
          { path: 'businessCategory', model: 'BusinessCategory', select: 'name' }
        ]
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

  let result = likes
    .filter(l => l.likedUserId && l.likedUserId.userDetailId)
    .map((l) => {
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

      const isBiz = l.likedUserId.userDetailId?.isBusinessProfile === true;
      const catName = isBiz ? (l.likedUserId.userDetailId?.businessCategory?.name || l.likedUserId.userDetailId?.businessCategory || null) : null;
      return {
        _id: l.likedUserId._id,
        fullName: isBiz ? l.likedUserId.userDetailId?.businessName : l.likedUserId.userDetailId?.fullName,
        city: cityName,
        profileImage: isBiz ? l.likedUserId.userDetailId?.businessLogo : l.likedUserId.userDetailId?.profileImage,
        gender: isBiz ? null : (l.likedUserId.userDetailId?.gender || null),
        dateOfBirth: isBiz ? null : (l.likedUserId.userDetailId?.dateOfBirth || null),
        isBusinessProfile: isBiz,
        businessTagline: l.likedUserId.userDetailId?.businessTagline || null,
        businessName: isBiz ? l.likedUserId.userDetailId?.businessName : null,
        businessLogo: isBiz ? l.likedUserId.userDetailId?.businessLogo : null,
        businessCategory: catName,
        businessCategoryName: catName,
      };
    });

  if (filter === 'business') {
    result = result.filter(user => user.isBusinessProfile === true);
  } else if (filter === 'personal' || filter === 'people') {
    result = result.filter(user => user.isBusinessProfile !== true);
  }

  if (search && search.trim()) {
    result = result.filter(user => 
      user.fullName?.toLowerCase().includes(search.trim().toLowerCase())
    );
  }

  return result;
};

const sendConnectionRequest = async (senderId, receiverId) => {
  const [sender, receiver] = await Promise.all([
    User.findById(senderId).populate('userDetailId'),
    User.findById(receiverId).populate('userDetailId'),
  ]);

  if (!receiver) {
    throw new Error('Receiver not found');
  }

  if (receiver.userDetailId?.fastConnect) {
    // Create the connection instantly
    const connection = await UserConnections.create({
      connection1Id: senderId,
      connection2Id: receiverId,
    });

    const senderName = sender?.userDetailId?.isBusinessProfile ? sender.userDetailId.businessName : sender?.userDetailId?.fullName;
    const receiverName = receiver?.userDetailId?.isBusinessProfile ? receiver.userDetailId.businessName : receiver?.userDetailId?.fullName;
    const receiverImage = receiver?.userDetailId?.isBusinessProfile ? receiver.userDetailId.businessLogo : receiver?.userDetailId?.profileImage;

    // Send push notification + email that connection is accepted (non-blocking) to the sender
    if (receiverName) {
      sendConnectionAcceptedNotification(senderId, receiverName, receiverId, receiverImage)
        .catch(console.error);
    }

    if (sender?.userDetailId?.email && senderName && receiverName) {
      sendConnectionAcceptedEmail(
        sender.userDetailId.email,
        senderName,
        receiverName
      ).catch(console.error);
    }

    if (sender?.phoneNumber && senderName && receiverName) {
      sendConnectionAcceptedSms(
        sender.phoneNumber,
        senderName,
        receiverName
      ).catch(console.error);
    }

    return { isConnected: true, connection };
  }

  const request = await UserRequests.create({ senderId, receiverId });

  const senderName = sender?.userDetailId?.isBusinessProfile ? sender.userDetailId.businessName : sender?.userDetailId?.fullName;
  const senderImage = sender?.userDetailId?.isBusinessProfile ? sender.userDetailId.businessLogo : sender?.userDetailId?.profileImage;
  const receiverName = receiver?.userDetailId?.isBusinessProfile ? receiver.userDetailId.businessName : receiver?.userDetailId?.fullName;

  if (senderName) {
    sendConnectionRequestNotification(receiverId, senderName, senderId, senderImage)
      .catch(console.error);
  }

  if (receiver?.userDetailId?.email && receiverName && senderName) {
    sendConnectionRequestEmail(
      receiver.userDetailId.email,
      receiverName,
      senderName
    ).catch(console.error);
  }

  if (receiver?.phoneNumber && receiverName && senderName) {
    sendConnectionRequestSms(
      receiver.phoneNumber,
      receiverName,
      senderName
    ).catch(console.error);
  }

  return request;
};

const getSentRequests = async (userId, search = '', filter = '') => {
  const requests = await UserRequests.find({ senderId: userId, status: 'pending' })
    .populate({
      path: 'receiverId',
      populate: { 
        path: 'userDetailId', 
        select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessCategory',
        populate: { path: 'businessCategory', model: 'BusinessCategory', select: 'name' }
      },
    })
    .select('receiverId')
    .lean();

  let result = requests.filter(r => r.receiverId && r.receiverId.userDetailId);

  if (filter === 'business') {
    result = result.filter(r => r.receiverId.userDetailId?.isBusinessProfile === true);
  } else if (filter === 'personal' || filter === 'people') {
    result = result.filter(r => r.receiverId.userDetailId?.isBusinessProfile !== true);
  }

  if (search && search.trim()) {
    result = result.filter(r => {
      const isBiz = r.receiverId.userDetailId?.isBusinessProfile === true;
      const name = isBiz ? r.receiverId.userDetailId?.businessName : r.receiverId.userDetailId?.fullName;
      return name?.toLowerCase().includes(search.trim().toLowerCase());
    });
  }

  return result;
};

const getReceivedRequests = async (userId, search = '', filter = '') => {
  const requests = await UserRequests.find({ receiverId: userId, status: 'pending' })
    .populate({
      path: 'senderId',
      populate: { 
        path: 'userDetailId', 
        select: 'fullName profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessCategory',
        populate: { path: 'businessCategory', model: 'BusinessCategory', select: 'name' }
      },
    })
    .select('senderId _id')
    .lean();

  let result = requests.filter(r => r.senderId && r.senderId.userDetailId);

  if (filter === 'business') {
    result = result.filter(r => r.senderId.userDetailId?.isBusinessProfile === true);
  } else if (filter === 'personal' || filter === 'people') {
    result = result.filter(r => r.senderId.userDetailId?.isBusinessProfile !== true);
  }

  if (search && search.trim()) {
    result = result.filter(r => {
      const isBiz = r.senderId.userDetailId?.isBusinessProfile === true;
      const name = isBiz ? r.senderId.userDetailId?.businessName : r.senderId.userDetailId?.fullName;
      return name?.toLowerCase().includes(search.trim().toLowerCase());
    });
  }

  return result;
};

const getActiveConnections = async (userId, search = '', filter = '') => {
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
      select: 'fullName city profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessCoverImage businessTagline businessCategory',
      populate: [
        { path: 'city', model: 'City', select: 'name' },
        { path: 'businessCategory', model: 'BusinessCategory', select: 'name' }
      ]
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
  let formattedResult = result
    .filter(user => user.userDetailId)
    .map((user) => {
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

      const isBiz = user.userDetailId.isBusinessProfile === true;
      return {
        _id: user._id,
        userDetailId: {
          ...user.userDetailId,
          fullName: isBiz ? user.userDetailId.businessName : user.userDetailId.fullName,
          profileImage: isBiz ? user.userDetailId.businessLogo : user.userDetailId.profileImage,
          gender: isBiz ? null : (user.userDetailId.gender || null),
          dateOfBirth: isBiz ? null : (user.userDetailId.dateOfBirth || null),
          city: cityName,
          isBusinessProfile: isBiz,
          businessTagline: user.userDetailId.businessTagline || null,
        }
      };
    });

  if (filter === 'business') {
    formattedResult = formattedResult.filter(user => user.userDetailId?.isBusinessProfile === true);
  } else if (filter === 'personal' || filter === 'people') {
    formattedResult = formattedResult.filter(user => user.userDetailId?.isBusinessProfile !== true);
  }

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

  // Send push notification + email (non-blocking)
  const [accepter, originalSender] = await Promise.all([
    User.findById(receiverId).populate('userDetailId'),
    User.findById(request.senderId).populate('userDetailId'),
  ]);

  const accepterName = accepter?.userDetailId?.isBusinessProfile ? accepter.userDetailId.businessName : accepter?.userDetailId?.fullName;
  const accepterImage = accepter?.userDetailId?.isBusinessProfile ? accepter.userDetailId.businessLogo : accepter?.userDetailId?.profileImage;
  const senderName = originalSender?.userDetailId?.isBusinessProfile ? originalSender.userDetailId.businessName : originalSender?.userDetailId?.fullName;

  if (accepterName) {
    sendConnectionAcceptedNotification(request.senderId, accepterName, receiverId, accepterImage)
      .catch(console.error);
  }

  if (originalSender?.userDetailId?.email && senderName && accepterName) {
    sendConnectionAcceptedEmail(
      originalSender.userDetailId.email,
      senderName,
      accepterName
    ).catch(console.error);
  }
  
  if (originalSender?.phoneNumber && senderName && accepterName) {
    sendConnectionAcceptedSms(
      originalSender.phoneNumber,
      senderName,
      accepterName
    ).catch(console.error);
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

const getUsersWhoLikedMe = async (userId, search = '', filter = '') => {
  const likes = await UserLikes.find({ likedUserId: userId })
    .populate({
      path: 'userId',
      populate: { 
        path: 'userDetailId', 
        select: 'fullName city profileImage gender dateOfBirth isBusinessProfile businessName businessLogo businessCoverImage businessTagline businessCategory',
        populate: [
          { path: 'city', model: 'City', select: 'name' },
          { path: 'businessCategory', model: 'BusinessCategory', select: 'name' }
        ]
      },
      select: 'userDetailId',
    })
    .lean();

  // Extract city IDs that need to be fetched (if not populated)
  const cityIds = [];
  likes.forEach((l) => {
    const city = l.userId?.userDetailId?.city;
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

  let result = likes
    .filter(l => l.userId && l.userId.userDetailId)
    .map(l => {
      let cityName = null;
      const city = l.userId?.userDetailId?.city;
      
      if (city) {
        if (typeof city === 'object' && city.name) {
          // City is populated
          cityName = city.name;
        } else {
          // City is an ObjectId, get from map
          cityName = cityMap.get(city.toString()) || null;
        }
      }

      const isBiz = l.userId.userDetailId?.isBusinessProfile === true;
      const catName = isBiz ? (l.userId.userDetailId?.businessCategory?.name || l.userId.userDetailId?.businessCategory || null) : null;
      return {
        _id: l.userId._id,
        fullName: isBiz ? l.userId.userDetailId?.businessName : l.userId.userDetailId?.fullName,
        city: cityName,
        profileImage: isBiz ? l.userId.userDetailId?.businessLogo : l.userId.userDetailId?.profileImage,
        gender: isBiz ? null : (l.userId.userDetailId?.gender || null),
        dateOfBirth: isBiz ? null : (l.userId.userDetailId?.dateOfBirth || null),
        isBusinessProfile: isBiz,
        businessTagline: l.userId.userDetailId?.businessTagline || null,
        businessName: isBiz ? l.userId.userDetailId?.businessName : null,
        businessLogo: isBiz ? l.userId.userDetailId?.businessLogo : null,
        businessCategory: catName,
        businessCategoryName: catName,
      };
    });

  if (filter === 'business') {
    result = result.filter(user => user.isBusinessProfile === true);
  } else if (filter === 'personal' || filter === 'people') {
    result = result.filter(user => user.isBusinessProfile !== true);
  }

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