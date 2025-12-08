const mongoose = require('mongoose');

const userDetailSchema = new mongoose.Schema({
  fullName: String,
  city: String,
  religion: String,
  status: { type: String, enum: ['Married', 'Unmarried', 'Divorced'] },
  email: { type: String, required: true, unique: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  dateOfBirth: Date,
  preferredLanguage: String,
  habits: [String],
  interests: [String],
  skills: [String],
  profileImage: String, // Cloudinary URL
});

module.exports = mongoose.model('UserDetail', userDetailSchema);