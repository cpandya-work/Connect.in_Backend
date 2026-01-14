const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
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
habitSchema.index({ name: 1 });

module.exports = mongoose.model('Habit', habitSchema);

