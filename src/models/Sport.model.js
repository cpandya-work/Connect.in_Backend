const mongoose = require('mongoose');

const sportSchema = new mongoose.Schema({
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
sportSchema.index({ name: 1 });

module.exports = mongoose.model('Sport', sportSchema);
