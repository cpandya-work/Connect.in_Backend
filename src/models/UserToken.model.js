const mongoose = require('mongoose');

const userTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fcmToken: { type: String, required: true },
  deviceType: { type: String, enum: ['android', 'ios', 'web'], default: 'android' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('UserToken', userTokenSchema);