const mongoose = require('mongoose');

const userSkipsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  skippedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

// Ensure unique skip relationship
userSkipsSchema.index({ userId: 1, skippedUserId: 1 }, { unique: true });

module.exports = mongoose.model('UserSkips', userSkipsSchema);

