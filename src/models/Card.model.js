const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true
  },
  description: { 
    type: String, 
    trim: true 
  },
  logo_image: {
    type: String,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  features: [{
    type: String,
    trim: true
  }],
  eligibles: [{
    type: String,
    trim: true
  }],
  isActive: { 
    type: Boolean, 
    default: true 
  },
}, { timestamps: true });

// Index for faster searches
cardSchema.index({ name: 1 });

module.exports = mongoose.model('Card', cardSchema);

