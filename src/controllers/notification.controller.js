const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { getNotifications, markAsRead, getUnreadCount } = require('../services/notification.service');

const getNotificationsCtrl = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const notifications = await getNotifications(req.user._id, parseInt(page), parseInt(limit));
  success(res, { notifications }, 'Notifications fetched successfully');
});

const markAsReadCtrl = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  await markAsRead(req.user._id, notificationId);
  success(res, null, 'Notification deleted');
});

const getUnreadCountCtrl = asyncHandler(async (req, res) => {
  const count = await getUnreadCount(req.user._id);
  success(res, { unreadCount: count }, 'Unread count fetched');
});

module.exports = {
  getNotificationsCtrl,
  markAsReadCtrl,
  getUnreadCountCtrl,
};