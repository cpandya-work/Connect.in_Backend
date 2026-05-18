const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  attachments: [{
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['image', 'doc', 'pdf'],
      required: true,
    },
    name: {
      type: String,
    }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
