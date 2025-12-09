const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { getFeed } = require('../services/feed.service');
const User = require('../models/User.model');

const getFeedCtrl = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('userDetailId');
  if (!user.userDetailId) {
    return res.status(400).json({ success: false, message: 'Complete your profile first' });
  }

  const { cursor, ageMin, ageMax, gender, habits, interests, language, relationship, religion } = req.query;
  const limit = 20;

  const filters = {
    ageMin: ageMin ? parseInt(ageMin) : null,
    ageMax: ageMax ? parseInt(ageMax) : null,
    gender: gender || null,
    habits: habits ? (Array.isArray(habits) ? habits : habits.split(',').map(h => h.trim())) : null,
    interests: interests ? (Array.isArray(interests) ? interests : interests.split(',').map(i => i.trim())) : null,
    language: language ? (Array.isArray(language) ? language : language.split(',').map(l => l.trim())) : null,
    relationship: relationship ? (Array.isArray(relationship) ? relationship : relationship.split(',').map(r => r.trim())) : null,
    religion: religion ? (Array.isArray(religion) ? religion : religion.split(',').map(r => r.trim())) : null,
  };

  const { profiles, nextCursor } = await getFeed(
    req.user._id,
    user.userDetailId.gender,
    cursor,
    limit,
    filters
  );

  if (profiles.length === 0) {
    return res.status(204).json(); // No content
  }

  success(res, { profiles, nextCursor }, 'Feed loaded');
});

module.exports = { getFeedCtrl };