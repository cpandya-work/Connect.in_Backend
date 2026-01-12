const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
}, { timestamps: true });

// Index for faster searches
citySchema.index({ name: 1 });

module.exports = mongoose.model('City', citySchema);
