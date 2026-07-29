const mongoose = require('mongoose');

const deletedUserSchema = new mongoose.Schema({
  originalUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
  phoneNumber: { type: String, required: true },
  fullName: String,
  city: String,
  religion: String,
  status: { type: String, enum: ['Single', 'Married', 'Unmarried', 'Divorced', 'Prefer not to say'] },
  email: { type: String },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  dateOfBirth: Date,
  preferredLanguage: [String],
  habits: [String],
  interests: [String],
  skills: [String],
  sports: [String],
  profileImage: String,
  coverImage: String,
  company: String,
  industry: String,
  position: { type: String, default: "" },
  deletedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('DeletedUser', deletedUserSchema);