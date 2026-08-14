const mongoose = require('mongoose');

const offerCategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
}, { timestamps: true });

offerCategorySchema.index({ name: 1 });

module.exports = mongoose.model('OfferCategory', offerCategorySchema);
