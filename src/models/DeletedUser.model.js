const mongoose = require('mongoose');

const deletedUserSchema = new mongoose.Schema({
  originalUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
  phoneNumber: { type: String, required: true },
  fullName: String,
  city: String,
  religion: String,
  status: { type: String, enum: ['Married', 'Unmarried', 'Divorced'] },
  email: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  dateOfBirth: Date,
  preferredLanguage: String,
  habits: [String],
  interests: [String],
  skills: [String],
  profileImage: String,
  deletedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('DeletedUser', deletedUserSchema);