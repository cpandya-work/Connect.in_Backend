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
const upload = require('../middlewares/upload.middleware');

const router = express.Router();

// Public route - createProfile doesn't require authentication
router.post('/profile', upload.single('profileImage'), createProfile);

// Protected routes
router.use(protect);
router.get('/profile', getProfile);
router.get('/profile/progress', getProfileProgress);
router.post('/profile/step', upload.single('profileImage'), saveProfileStep);
router.put('/profile', upload.single('profileImage'), updateUserProfile);
router.delete('/account', deleteUserAccount);
router.get('/profile/:id', getUserProfileById);

module.exports = router;