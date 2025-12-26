const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userDetailSchema = new mongoose.Schema({
  fullName: String,
  city: String,
  religion: String,
  status: { type: String, enum: ['Married', 'Unmarried', 'Divorced'] },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  dateOfBirth: Date,
  preferredLanguage: String,
  habits: [String],
  interests: [String],
  skills: [String],
  profileImage: String, // Cloudinary URL
});

// Hash password before saving
userDetailSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userDetailSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('UserDetail', userDetailSchema);