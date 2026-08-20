const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: false,
  },
  sharedPostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null,
  },
  attachments: [{
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['image', 'doc', 'pdf', 'video'],
      required: true,
    },
    name: {
      type: String,
    }
  }],
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reaction: {
      type: String,
      enum: ['👍', '❤️', '😃', '🙏', '👏', '👌', '😮', '😢'],
      required: true,
    }
  }],
  linkPreview: {
    title: { type: String },
    description: { type: String },
    image: { type: String },
    url: { type: String }
  },
  targetSegments: {
    connections: { type: Boolean, default: true },
    city: { type: Boolean, default: false },
    industries: [{ type: String }],
    ageGroups: [{ type: String }]
  },
  authorCity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    default: null
  },
  connectionGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ConnectionGroup',
    default: null
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  reshareCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
