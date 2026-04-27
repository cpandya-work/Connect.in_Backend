const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userDetailSchema = new mongoose.Schema({
  fullName: String,
  city: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
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
  profileImage: String, // Cloudinary URL
  company: String,
  industry: String,
  lastCompletedStep: { 
    type: Number, 
    default: 0,  // 0 = not started, 1-8 = step number
    min: 0,
    max: 8
  },
  isProfileComplete: { 
    type: Boolean, 
    default: false 
  },
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