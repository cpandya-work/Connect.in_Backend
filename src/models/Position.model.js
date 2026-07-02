const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
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
positionSchema.index({ name: 1 });

module.exports = mongoose.model('Position', positionSchema);
