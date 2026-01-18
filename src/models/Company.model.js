const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
  },
  description: { 
    type: String, 
    trim: true 
  },
  industry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Industry',
    required: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
}, { timestamps: true });

// Index for faster searches
companySchema.index({ name: 1 });
companySchema.index({ industry: 1 });

module.exports = mongoose.model('Company', companySchema);

