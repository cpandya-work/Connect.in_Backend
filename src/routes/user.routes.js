const express = require('express');
const {
  getProfile,
  createProfile,
  getUserProfileById,
  updateUserProfile,
  deleteUserAccount,
  saveProfileStep,
  getProfileProgress,
} = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/businessProfileUpload.middleware');

const router = express.Router();

const PROFILE_UPLOAD_FIELDS = [
  { name: 'profileImage', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
  { name: 'businessDocument', maxCount: 1 },
];

// Public route - createProfile doesn't require authentication
router.post('/profile', upload.fields(PROFILE_UPLOAD_FIELDS), createProfile);

// Protected routes
router.use(protect);
router.get('/profile', getProfile);
router.get('/profile/progress', getProfileProgress);
router.post('/profile/step', upload.fields(PROFILE_UPLOAD_FIELDS), saveProfileStep);
router.put('/profile', upload.fields(PROFILE_UPLOAD_FIELDS), updateUserProfile);
router.delete('/account', deleteUserAccount);
router.get('/profile/:id', getUserProfileById);

module.exports = router;