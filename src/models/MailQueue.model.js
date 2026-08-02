const mongoose = require('mongoose');

const mailQueueSchema = new mongoose.Schema({
  recipient: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  recipientName: {
    type: String,
    trim: true,
  },
  subject: {
    type: String,
    required: true,
  },
  html: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['INCOMPLETE_PROFILE', 'CITY_INDUSTRY_SNAPSHOT', 'OFFER_OF_THE_DAY'],
    required: true,
  },
  scheduledFor: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
  },
  attempts: {
    type: Number,
    default: 0,
  },
  errorMessage: {
    type: String,
    default: null,
  },
  sentAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// Create indexes for fast querying of scheduled sends
mailQueueSchema.index({ status: 1, scheduledFor: 1 });
mailQueueSchema.index({ type: 1 });

module.exports = mongoose.model('MailQueue', mailQueueSchema);
