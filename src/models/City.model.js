const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  isMetro: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true
  },
}, { timestamps: true });

// Index for faster searches and metro-first sorting
citySchema.index({ name: 1 });
citySchema.index({ isMetro: -1, name: 1 });

module.exports = mongoose.model('City', citySchema);
