const mongoose = require('mongoose');

const industrySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  description: { 
    type: String, 
    trim: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
}, { timestamps: true });

// Index for faster searches
industrySchema.index({ name: 1 });

module.exports = mongoose.model('Industry', industrySchema);

