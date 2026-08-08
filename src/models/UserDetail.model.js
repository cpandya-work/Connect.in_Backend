const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userDetailSchema = new mongoose.Schema({
  fullName: String,
  city: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
  pincode: String,
  religion: String,
  status: { type: String, enum: ['Single', 'Married', 'Divorced', 'Prefer not to say'] },
  email: { type: String, unique: true, sparse: true },
  password: { type: String },
  originalPassword: { type: String }, // Store original password for display
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  dateOfBirth: Date,
  preferredLanguage: [String],
  habits: [String],
  interests: [String],
  skills: [String],
  sports: [String],
  profileImage: String, // Cloudinary URL
  coverImage: String, // Cloudinary URL
  company: String,
  industry: String,
  position: { type: String, default: "" },
  lastCompletedStep: { 
    type: Number, 
    default: 0,  // 0 = not started, 1-9 = step number
    min: 0,
    max: 9
  },
  isProfileComplete: { 
    type: Boolean, 
    default: false 
  },
  fastConnect: {
    type: Boolean,
    default: false
  },
  lastOfferShownAt: {
    type: Date,
    default: null
  },
  shownOfferIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card'
  }],
  // Business Profile fields
  isBusinessProfile: {
    type: Boolean,
    default: false
  },
  businessName: String,
  businessLogo: String,
  businessCoverImage: String,
  businessTagline: {
    type: String,
    maxLength: 160
  },
  businessCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessCategory'
  },
  website: String,
  contactPerson: String,
  whatsappNumber: String,
  facebook: String,
  instagram: String,
  linkedIn: String,
  youtube: String,
  twitter: String,
  businessDescription: String
});

// Hash password before saving
userDetailSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Store original password before hashing
  if (this.password) {
    this.originalPassword = this.password;
    this.password = await bcrypt.hash(this.password, 12);
  }
  
  next();
});

// Compare password method
userDetailSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('UserDetail', userDetailSchema);