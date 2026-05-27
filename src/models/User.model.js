const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  userDetailId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetail', default: null },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  trafficSource: { type: String, default: 'direct' },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  lastLocationUpdate: { type: Date, default: Date.now },
}, { timestamps: true });

// Create geospatial index for location queries
userSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('User', userSchema);