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
  targetAgeMin: {
    type: Number,
    default: null
  },
  targetAgeMax: {
    type: Number,
    default: null
  },
  targetCities: [{
    type: String,
    trim: true
  }],
  targetPositions: [{
    type: String,
    trim: true
  }],
  offer_image: {
    type: String,
    trim: true,
    default: null
  },
  clicks: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  showInPopup: {
    type: Boolean,
    default: true
  },
  showInMailer: {
    type: Boolean,
    default: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OfferCategory',
    default: null
  },
}, { timestamps: true });

// Index for faster searches
cardSchema.index({ name: 1 });

module.exports = mongoose.model('Card', cardSchema);

