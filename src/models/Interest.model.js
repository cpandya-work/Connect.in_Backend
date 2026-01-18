const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
}, { timestamps: true });

// Index for faster searches
interestSchema.index({ name: 1 });

module.exports = mongoose.model('Interest', interestSchema);
