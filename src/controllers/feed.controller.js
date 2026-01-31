const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { getFeed, getFeedWeb } = require('../services/feed.service');
const User = require('../models/User.model');

const getFeedCtrl = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('userDetailId');
  if (!user.userDetailId) {
    return res.status(400).json({ success: false, message: 'Complete your profile first' });
  }

  const { cursor, ageMin, ageMax, gender, habits, interests, language, relationship, religion, search, latitude, longitude } = req.query;
  const limit = 20;

  // Update user location if provided
  if (latitude && longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      await User.findByIdAndUpdate(req.user._id, {
        currentLocation: {
          type: 'Point',
          coordinates: [lng, lat] // [longitude, latitude]
        },
        lastLocationUpdate: new Date()
      });
      user.currentLocation = { type: 'Point', coordinates: [lng, lat] };
    }
  }

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

  // Extract city ID - handle both populated and non-populated cases
  let userCityId = user.userDetailId.city;
  if (userCityId && typeof userCityId === 'object' && userCityId._id) {
    // If city is populated, extract the _id
    userCityId = userCityId._id;
  }

  // Only pass userLocation if latitude and longitude are provided
  const userLocation = (latitude && longitude) ? user.currentLocation : null;

  const { profiles, nextCursor } = await getFeed(
    req.user._id,
    user.userDetailId.gender,
    cursor,
    limit,
    filters,
    search,
    userLocation,
    userCityId
  );

  if (profiles.length === 0) {
    return res.status(200).json({
      success:true,
      data:{
        profiles: [],
        nextCursor: null,
      },
      message: 'No profiles found'
    }); // No content
  }

  success(res, { profiles, nextCursor }, 'Feed loaded');
});

const getFeedWebCtrl = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('userDetailId');
  if (!user.userDetailId) {
    return res.status(400).json({ success: false, message: 'Complete your profile first' });
  }

  const { page = 1, limit = 20, ageMin, ageMax, gender, habits, interests, language, relationship, religion, search, latitude, longitude } = req.query;
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  

  // Update user location if provided
  if (latitude && longitude) {
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      await User.findByIdAndUpdate(req.user._id, {
        currentLocation: {
          type: 'Point',
          coordinates: [lng, lat] // [longitude, latitude]
        },
        lastLocationUpdate: new Date()
      });
      user.currentLocation = { type: 'Point', coordinates: [lng, lat] };
    }
  }

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

  // Extract city ID - handle both populated and non-populated cases
  let userCityId = user.userDetailId.city;
  if (userCityId && typeof userCityId === 'object' && userCityId._id) {
    // If city is populated, extract the _id
    userCityId = userCityId._id;
  }

  // Only pass userLocation if latitude and longitude are provided
  const userLocation = (latitude && longitude) ? user.currentLocation : null;

  console.log(user.currentLocation,'user.currentLocation');
  
  const { profiles, pagination } = await getFeedWeb(
    req.user._id,
    user.userDetailId.gender,
    pageNum,
    limitNum,
    filters,
    search,
    userLocation,
    userCityId
  );

  if (profiles.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        profiles: [],
        pagination: {
          currentPage: pageNum,
          limit: limitNum,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      },
      message: 'No profiles found'
    });
  }

  success(res, { profiles, pagination }, 'Feed loaded');
});

module.exports = { getFeedCtrl, getFeedWebCtrl };