const mongoose = require('mongoose');

const businessCategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
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
businessCategorySchema.index({ name: 1 });

module.exports = mongoose.model('BusinessCategory', businessCategorySchema);
