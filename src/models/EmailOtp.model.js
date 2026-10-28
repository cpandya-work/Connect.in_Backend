const mongoose = require('mongoose');

const emailOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // Auto-delete expired OTP records
  },
}, { timestamps: true });

module.exports = mongoose.model('EmailOtp', emailOtpSchema);
