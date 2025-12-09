const mongoose = require('mongoose');

const userChatSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  seen: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('UserChat', userChatSchema);