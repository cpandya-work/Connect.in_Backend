const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  type: { type: String, enum: ['like', 'connection_request', 'message', 'connection_accepted', 'broadcast', 'general'], required: true },
  data: { type: Object, default: {} },
  isRead: { type: Boolean, default: false },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);