const express = require('express');
const {
  getProfile,
  createProfile,
  getUserProfileById,
  getMemberDirectory,
  updateUserProfile,
  deleteUserAccount,
  saveProfileStep,
  getProfileProgress,
  skipToDashboard,
} = require('../controllers/user.controller');
const { protect, optionalAuth } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/businessProfileUpload.middleware');

const router = express.Router();

const PROFILE_UPLOAD_FIELDS = [
  { name: 'profileImage', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
  { name: 'businessDocument', maxCount: 1 },
];

// Specific protected profile routes must come before /profile/:id
router.get('/profile/progress', protect, getProfileProgress);
router.get('/profile', protect, getProfile);
router.post('/profile/step', protect, upload.fields(PROFILE_UPLOAD_FIELDS), saveProfileStep);
router.post('/profile/skip-to-dashboard', protect, express.json(), skipToDashboard);
router.put('/profile', protect, upload.fields(PROFILE_UPLOAD_FIELDS), updateUserProfile);
router.delete('/account', protect, deleteUserAccount);

// Public routes - accessible without authentication
router.post('/profile', upload.fields(PROFILE_UPLOAD_FIELDS), createProfile);
router.get('/directory', getMemberDirectory);
router.get('/profile/:id', optionalAuth, getUserProfileById);

module.exports = router;