const mongoose = require('mongoose');

const authBannerSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  cloudinaryPublicId: { type: String, required: true },
  type: { type: String, enum: ['desktop', 'mobile'], required: true },
  isActive: { type: Boolean, default: true },
  width: { type: Number },
  height: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('AuthBanner', authBannerSchema);
