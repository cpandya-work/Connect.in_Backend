const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Allow empty string or null (optional field)
        if (!v || v === '') return true;
        // Must be exactly 10 digits
        return /^[0-9]{10}$/.test(v);
      },
      message: 'Phone number must be exactly 10 digits'
    }
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'closed'],
    default: 'pending',
  },
}, { timestamps: true });

module.exports = mongoose.model('Inquiry', inquirySchema);

